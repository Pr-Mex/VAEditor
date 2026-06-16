// Полифилы рантайма для встроенного WebKit 1С:Предприятие (старее Safari 13.1).
//
// ОБЯЗАТЕЛЬНО импортировать ПЕРВЫМ — до любого кода monaco, потому что оба
// API нужны уже на стадии загрузки/инициализации редактора:
//
//  - queueMicrotask (Safari 12.1): зовётся безусловно при загрузке бандла
//    (AsyncIterableObject.EMPTY, vs/base/common/async.js) начиная с monaco ≥0.32.
//    Без него — Runtime-ошибка ещё до создания VanessaGherkinProvider.
//
//  - ResizeObserver (Safari 13.1): monaco ≥0.32 удалил guard+fallback из
//    ElementSizeObserver, а у нас editor.create() с automaticLayout:true
//    (см. vanessa-editor.ts / vanessa-diff-editor.ts) → падение при создании.
//
// globalThis НЕ используем намеренно — он сам ES2020 (Safari 12.1) и в этом
// движке отсутствует ровно там же, где queueMicrotask. Точка опоры — self
// (совпадает с output.globalObject:'self' в webpack.config.js).
import { ResizeObserver as ResizeObserverPolyfill } from '@juggle/resize-observer';

const _self: any = self;

// globalThis (ES2020, Safari 12.1) — движок 1С его лишён, а monaco >=0.45
// ссылается на ГОЛЫЙ globalThis при загрузке модулей → ReferenceError убивает
// бандл. Определяем как свойство глобального объекта (self == output.globalObject),
// тогда голая ссылка globalThis резолвится. typeof на undeclared безопасен.
if (typeof _self.globalThis === 'undefined') {
  _self.globalThis = _self;
}

// monaco при dispose/отмене реджектит pending-промисы CancellationError'ом
// (name==='Canceled') — это штатное управление потоком, monaco сам его игнорит
// (onUnexpectedError). Но необработанный reject доходит до window и в 1С
// каскадит в mocha/ошибку формы. Гасим именно Canceled (capture+первый листенер
// → раньше mocha). Регистрируем до загрузки monaco.
if (typeof _self.addEventListener === 'function') {
  _self.addEventListener('unhandledrejection', function (e: any) {
    var r = e && e.reason;
    if (r && (r.name === 'Canceled' || r.message === 'Canceled')) {
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      if (e.preventDefault) e.preventDefault();
    }
  }, true);
}

// WeakRef / FinalizationRegistry (ES2021, Safari 14.1) — движок 1С их лишён, а
// monaco >=0.45 использует WeakRef при создании модели/редактора (_attachModel)
// без guard'а → ReferenceError убивает editor.create(). Семантически (GC) не
// полифилятся; ставим функциональные стабы: WeakRef держит СИЛЬНУЮ ссылку
// (deref всегда возвращает значение — теряется только GC-оптимизация),
// FinalizationRegistry — no-op (колбэк очистки просто не вызывается). Для
// кэшей monaco это безопасно. Голые WeakRef/FinalizationRegistry резолвятся
// через self (как globalThis).
if (typeof _self.WeakRef !== 'function') {
  _self.WeakRef = function (target: any) { this._t = target; };
  _self.WeakRef.prototype.deref = function () { return this._t; };
}
if (typeof _self.FinalizationRegistry !== 'function') {
  _self.FinalizationRegistry = function (_cb: any) {};
  _self.FinalizationRegistry.prototype.register = function () {};
  _self.FinalizationRegistry.prototype.unregister = function () { return false; };
}

// ClipboardItem (Safari 13.1) + async navigator.clipboard — движок 1С (WebKit
// ~Safari 11.x) их лишён. monaco на WebKit-пути (isSafari/isWebkitWebView) в
// BrowserClipboardService.installWebKitWriteTextWorkaround зовёт
// `navigator.clipboard.write([new ClipboardItem(...)])` СРАЗУ при создании
// сервиса (Event.runAndSubscribe) → ReferenceError убивает editor.create()
// (проявляется только в WebKit, в Chrome isSafari=false — путь не берётся).
// Стабы: ClipboardItem-обёртка + no-op async-clipboard (копирование этим путём
// не работает, но редактор создаётся; автотест буфер обмена не проверяет).
if (typeof _self.ClipboardItem !== 'function') {
  _self.ClipboardItem = function (items: any) {
    this.items = items;
    // monaco передаёт сюда DeferredPromise.p; при отмене (новый клик/закрытие
    // вкладки) он реджектится Canceled. Настоящий ClipboardItem его потребляет,
    // наш стаб — нет, поэтому гасим, иначе unhandledrejection каскадит в mocha.
    for (var k in items) {
      if (items[k] && typeof items[k].then === 'function') {
        items[k].then(function () {}, function () {});
      }
    }
  };
}
try {
  var _nav: any = _self.navigator;
  if (_nav) {
    if (!_nav.clipboard) {
      try { _nav.clipboard = {}; } catch (e) { Object.defineProperty(_nav, 'clipboard', { value: {}, configurable: true }); }
    }
    var _clip: any = _nav.clipboard;
    if (_clip) {
      if (typeof _clip.write !== 'function') _clip.write = function () { return Promise.resolve(); };
      if (typeof _clip.writeText !== 'function') _clip.writeText = function () { return Promise.resolve(); };
      if (typeof _clip.readText !== 'function') _clip.readText = function () { return Promise.resolve(''); };
    }
  }
} catch (e) { /* ignore */ }

if (typeof _self.queueMicrotask !== 'function') {
  const resolved = Promise.resolve();
  _self.queueMicrotask = function (callback: () => void): void {
    resolved.then(callback).catch(function (e: any) {
      setTimeout(function () { throw e; }, 0);
    });
  };
}

if (typeof _self.ResizeObserver !== 'function') {
  _self.ResizeObserver = ResizeObserverPolyfill;
}

// MediaQueryList.addEventListener('change', …) появился только в Safari 14.
// monaco ≥0.32 зовёт matchMedia(q).addEventListener("change", …) при создании
// сервисов (тема/доступность) ещё на StandaloneServices.get() — это убивает
// app.js до VanessaGherkinProvider (зависание автотеста в 1С, подтверждено
// beacon'ом). В движке 1С есть только legacy addListener/removeListener, причём
// глобальный конструктор MediaQueryList НЕ выставлен — поэтому патчим прототип
// через инстанс matchMedia(), а не _self.MediaQueryList, и дублируем обёрткой.
(function () {
  var mm = _self.matchMedia;
  if (typeof mm !== 'function') return;
  var delegateAdd = function (this: any, type: string, listener: any) { if (type === 'change') this.addListener(listener); };
  var delegateRemove = function (this: any, type: string, listener: any) { if (type === 'change') this.removeListener(listener); };
  // (1) патч прототипа через инстанс — одним махом покрывает все инстансы.
  try {
    var probe: any = mm.call(_self, '(min-width: 0px)');
    var proto: any = probe && Object.getPrototypeOf(probe);
    if (proto && typeof proto.addEventListener !== 'function' && typeof proto.addListener === 'function') {
      proto.addEventListener = delegateAdd;
      proto.removeEventListener = delegateRemove;
    }
  } catch (e) { /* ignore */ }
  // (2) обёртка matchMedia — на случай, если прототип не патчится.
  _self.matchMedia = function (q: any) {
    var mql: any = mm.call(_self, q);
    if (mql && typeof mql.addEventListener !== 'function' && typeof mql.addListener === 'function') {
      mql.addEventListener = delegateAdd;
      mql.removeEventListener = delegateRemove;
    }
    return mql;
  };
})();

// Array.prototype.flat / flatMap (ES2019, Safari 12.0). Движок 1С — ~Safari 11.x
// (проба capabilities из 1С: flat/flatMap = undefined). monaco >=0.34 зовёт
// `xs.map(...).flat()` при создании редактора → TypeError. esbuild рантайм-методы
// не полифилит. defineProperty(enumerable:false) — чтобы не светить в for..in.
(function () {
  function def(proto: any, name: string, fn: any) {
    if (typeof proto[name] !== 'function') {
      Object.defineProperty(proto, name, { value: fn, writable: true, configurable: true, enumerable: false });
    }
  }
  def(Array.prototype, 'flat', function (this: any[], depth?: number) {
    var d = depth === undefined ? 1 : Number(depth);
    return d < 1
      ? Array.prototype.slice.call(this)
      : Array.prototype.reduce.call(this, function (acc: any[], val: any) {
          return acc.concat(Array.isArray(val) && d > 1 ? (val as any).flat(d - 1) : val);
        }, [] as any[]);
  });
  def(Array.prototype, 'flatMap', function (this: any[], cb: any, thisArg?: any) {
    return (Array.prototype.map.call(this, cb, thisArg) as any).flat();
  });
})();
