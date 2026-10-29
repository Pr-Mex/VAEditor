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
// Примечание: RegExp-флаг 'd' (hasIndices, Safari 15) из monaco
// (0.52.2: findSectionHeaders `new RegExp('\\bMARK:…','d')` — top-level) срезается
// точечно через replace-strings в webpack.config.js. Глобальную обёртку RegExp
// НЕ ставим: она реконструировала regex через .source, а конструктор старого
// WebKit 1С отвергает именованные группы (?<name>) (литерал-парсер — принимает).

if (typeof _self.WeakRef !== 'function') {
  _self.WeakRef = function (target: any) { this._t = target; };
  _self.WeakRef.prototype.deref = function () { return this._t; };
}
if (typeof _self.FinalizationRegistry !== 'function') {
  _self.FinalizationRegistry = function (_cb: any) {};
  _self.FinalizationRegistry.prototype.register = function () {};
  _self.FinalizationRegistry.prototype.unregister = function () { return false; };
}

// ParentNode.replaceChildren (Safari 14) — движок 1С его лишён. DiffEditorWidget
// (0.52.2) зовёт element.replaceChildren() в movedBlocksLinesFeature (derived-
// observable ПРИ СОЗДАНИИ diff-редактора) → TypeError рушит new VanessaDiffEditor:
// diff-вкладка не открывается (git-сравнение, «сравнение настроек», уроки).
// Также используется в hideUnchangedRegions/gutterFeature/hover.
(function () {
  function replaceChildren(this: any) {
    while (this.firstChild) this.removeChild(this.firstChild);
    for (var i = 0; i < arguments.length; i++) {
      var child = arguments[i];
      this.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
  }
  [
    typeof Element !== 'undefined' ? Element.prototype : null,
    typeof Document !== 'undefined' ? Document.prototype : null,
    typeof DocumentFragment !== 'undefined' ? DocumentFragment.prototype : null,
  ].forEach(function (proto: any) {
    if (proto && typeof proto.replaceChildren !== 'function') {
      Object.defineProperty(proto, 'replaceChildren',
        { value: replaceChildren, writable: true, configurable: true });
    }
  });
})();

// ClipboardItem (Safari 13.1) + async navigator.clipboard — движок 1С (WebKit
// ~Safari 11.x) их лишён. monaco на WebKit-пути (isSafari/isWebkitWebView) в
// BrowserClipboardService.installWebKitWriteTextWorkaround зовёт
// `navigator.clipboard.write([new ClipboardItem(...)])` СРАЗУ при создании
// сервиса (Event.runAndSubscribe) → ReferenceError убивает editor.create()
// (проявляется только в WebKit, в Chrome isSafari=false — путь не берётся).
// Раньше тут стояли no-op-стабы, но monaco на paste
// (editor.action.clipboardPasteAction → BrowserClipboardService.readText, ветка
// isWeb) читает именно navigator.clipboard.readText(), тогда как copy/cut пишут
// текст через DOM-событие execCommand. No-op readText() → '' → кнопка «Вставить»
// вставляла пусто. Держим собственный in-memory буфер и пишем в него из ВСЕХ путей
// monaco: writeText, write([ClipboardItem]) (WebKit-workaround отдаёт текст через
// promise внутри ClipboardItem) и перехват DOM copy/cut. readText отдаёт буфер —
// кнопки Вырезать/Копировать/Вставить снова работают (как на monaco 0.30).
var _clipboard = { text: '' };
function _grabClipboardItems(items: any) {
  for (var k in items) {
    var v = items[k];
    if (v && typeof v.then === 'function') {
      // monaco передаёт DeferredPromise.p; при отмене он реджектится Canceled —
      // гасим (иначе unhandledrejection каскадит в mocha), а текст забираем в буфер.
      v.then(function (val: any) {
        if (typeof val === 'string') _clipboard.text = val;
        else if (val && typeof val.text === 'function') { try { val.text().then(function (t: any) { _clipboard.text = String(t); }, function () {}); } catch (e) {} }
      }, function () {});
    } else if (typeof v === 'string') {
      _clipboard.text = v;
    }
  }
}
if (typeof _self.ClipboardItem !== 'function') {
  _self.ClipboardItem = function (items: any) { this.items = items; _grabClipboardItems(items); };
}
try {
  var _nav: any = _self.navigator;
  if (_nav) {
    if (!_nav.clipboard) {
      try { _nav.clipboard = {}; } catch (e) { Object.defineProperty(_nav, 'clipboard', { value: {}, configurable: true }); }
    }
    var _clip: any = _nav.clipboard;
    if (_clip) {
      if (typeof _clip.write !== 'function') _clip.write = function (data: any) {
        try { for (var i = 0; i < (data || []).length; i++) { var it = data[i]; if (it && it.items) _grabClipboardItems(it.items); } } catch (e) { /* ignore */ }
        return Promise.resolve();
      };
      if (typeof _clip.writeText !== 'function') _clip.writeText = function (t: any) { _clipboard.text = (t == null ? '' : String(t)); return Promise.resolve(); };
      if (typeof _clip.readText !== 'function') _clip.readText = function () { return Promise.resolve(_clipboard.text); };
    }
  }
} catch (e) { /* ignore */ }
// Мост DOM copy/cut → in-memory буфер. monaco кладёт скопированный текст в
// ClipboardEvent.clipboardData (ClipboardEventUtils.setTextData) в обработчике
// textarea; перехватываем на всплытии (document, bubble — после обработчика
// редактора) и дублируем в буфер, чтобы readText на paste его увидел.
if (typeof _self.addEventListener === 'function') {
  var _grabClipboardEvent = function (e: any) {
    try {
      var cd = e && e.clipboardData;
      var t = cd && typeof cd.getData === 'function' ? cd.getData('text/plain') : '';
      if (t) _clipboard.text = t;
    } catch (err) { /* ignore */ }
  };
  _self.addEventListener('copy', _grabClipboardEvent, false);
  _self.addEventListener('cut', _grabClipboardEvent, false);
}

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
  // String.prototype.replaceAll (ES2021, Safari 13.1) — движок 1С его лишён, а
  // monaco зовёт его на рантайм-путях (0.52.2: find-виджет/contextkey) → TypeError. Реализация
  // через глобальный regex из экранированного поиска (корректно для строкового
  // и функционального replace, и для RegExp-поиска).
  def(String.prototype, 'replaceAll', function (this: string, search: any, replace: any) {
    if (Object.prototype.toString.call(search) === '[object RegExp]') {
      return String.prototype.replace.call(this, search, replace);
    }
    var escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String.prototype.replace.call(this, new RegExp(escaped, 'g'), replace);
  });
  // Array/String.prototype.at (ES2022, Safari 15.4) — движок 1С их лишён,
  // monaco использует .at(...) на рантайм-путях.
  def(Array.prototype, 'at', function (this: any[], n: number) {
    n = Math.trunc(n) || 0; if (n < 0) n += this.length;
    return (n < 0 || n >= this.length) ? undefined : this[n];
  });
  def(String.prototype, 'at', function (this: string, n: number) {
    n = Math.trunc(n) || 0; if (n < 0) n += this.length;
    return (n < 0 || n >= this.length) ? undefined : this.charAt(n);
  });
  // String.prototype.matchAll (ES2020, Safari 13) — движок 1С лишён, monaco зовёт
  // matchAll (0.52.2: textModelSync — синк моделей с воркером). Возвращаем
  // итератор массива всех совпадений. ВАЖНО: глобальный RegExp НЕ пересоздаём
  // через конструктор — он в WebKit 1С отвергает named groups (?<name>), которые
  // литерал-парсер принимает; итерируем сам объект с восстановлением lastIndex.
  def(String.prototype, 'matchAll', function (this: string, re: any) {
    var rx: any, saved = 0, own = false;
    if (re instanceof RegExp && re.flags.indexOf('g') >= 0) {
      rx = re; own = true; saved = rx.lastIndex;
    } else {
      rx = (re instanceof RegExp) ? new RegExp(re.source, re.flags + 'g') : new RegExp(re, 'g');
    }
    var str = String(this), out: any[] = [], m: any;
    rx.lastIndex = 0;
    while ((m = rx.exec(str)) !== null) { out.push(m); if (m[0] === '') rx.lastIndex++; }
    if (own) rx.lastIndex = saved;
    return out[Symbol.iterator]();
  });
  // String.prototype.trimStart/trimEnd (ES2019, Safari 12) — движок 1С (~Safari 11)
  // их лишён. marked (markdown-рендер monaco) зовёт line.trimEnd() в list-
  // токенизаторе (Tokenizer.list, ×3) при разборе ЛЮБОГО списка → TypeError рушит
  // renderMarkdown СИНХРОННО в конструкторе VanessaViwer → markdown-вкладки (список
  // уроков, MD-файлы, интерактивная справка) не открываются (VanessaTabs.count()=0).
  // Код-редактор не затронут (markdown не рендерит). esbuild строковые методы не полифилит.
  def(String.prototype, 'trimStart', function (this: string) { return String(this).replace(/^\s+/, ''); });
  def(String.prototype, 'trimEnd', function (this: string) { return String(this).replace(/\s+$/, ''); });
  def(String.prototype, 'trimLeft', (String.prototype as any).trimStart);
  def(String.prototype, 'trimRight', (String.prototype as any).trimEnd);
  // Array.prototype.findLast / findLastIndex (ES2023, Safari 15.4) — движок 1С их
  // лишён; monaco зовёт getBracketPairsInRange().findLast() в bracket-pair
  // colorization (включена по умолчанию) → TypeError. Реализация — обратный обход.
  def(Array.prototype, 'findLast', function (this: any[], cb: any, thisArg?: any) {
    for (var i = this.length - 1; i >= 0; i--) { if (cb.call(thisArg, this[i], i, this)) return this[i]; }
    return undefined;
  });
  def(Array.prototype, 'findLastIndex', function (this: any[], cb: any, thisArg?: any) {
    for (var i = this.length - 1; i >= 0; i--) { if (cb.call(thisArg, this[i], i, this)) return i; }
    return -1;
  });
})();

// Object.fromEntries (ES2019, Safari 12.1) / Promise.allSettled (ES2020, Safari 13)
// — движок 1С их лишён; monaco может использовать. Проактивные полифилы.
if (typeof (Object as any).fromEntries !== 'function') {
  (Object as any).fromEntries = function (entries: any) {
    var o: any = {}; var arr = Array.from(entries as any) as any[];
    for (var i = 0; i < arr.length; i++) { o[arr[i][0]] = arr[i][1]; }
    return o;
  };
}
if (typeof (Promise as any).allSettled !== 'function') {
  (Promise as any).allSettled = function (ps: any) {
    return Promise.all(Array.from(ps as any).map(function (p: any) {
      return Promise.resolve(p).then(
        function (v: any) { return { status: 'fulfilled', value: v }; },
        function (r: any) { return { status: 'rejected', reason: r }; });
    }));
  };
}
// Object.hasOwn (ES2022, Safari 15.4) — движок 1С лишён; monaco зовёт его в
// AmbiguousCharacters._getData (unicode-подсветка: кириллица = ambiguous → путь
// активен на RU-фичах) → TypeError. Делегируем hasOwnProperty.
if (typeof (Object as any).hasOwn !== 'function') {
  (Object as any).hasOwn = function (o: any, k: any) { return Object.prototype.hasOwnProperty.call(o, k); };
}

// Symbol.asyncIterator (ES2018, Safari 12) — AsyncIterableObject (monaco,
// vs/base/common/async.js) объявляет метод по этому символу ПРИ ЗАГРУЗКЕ бандла;
// без символа ключ вырождается в строку "undefined", и for await (hover:
// HoverOperation) итератор не находит → TypeError на каждом наведении, monaco
// гасит его try/catch → hover МОЛЧА мёртв. Symbol.for — чтобы ключ класса и
// esbuild-хелпер __forAwait сошлись на одном символе.
if (!(Symbol as any).asyncIterator) {
  Object.defineProperty(Symbol, 'asyncIterator', {
    value: Symbol.for('Symbol.asyncIterator'), configurable: true
  });
}

// Promise.prototype.finally (ES2018, Safari 11.1) — monaco зовёт при резолве
// айтема саджеста (suggest.js) и в cancelable-промисах (async.js: codelens,
// формат, gotoSymbol) → на движке уровня 11.0 TypeError при первом открытии
// автодополнения. Наш код finally не использует, mocha путь UI-виджета не
// покрывает (completion-тесты зовут провайдер напрямую).
if (typeof (Promise.prototype as any).finally !== 'function') {
  (Promise.prototype as any).finally = function (cb: any) {
    return this.then(
      function (v: any) { return Promise.resolve(cb()).then(function () { return v; }); },
      function (e: any) { return Promise.resolve(cb()).then(function () { throw e; }); });
  };
}

// Element.prototype.toggleAttribute (Safari 12) — quick input (палитра команд F1,
// переход к строке Ctrl+G) зовёт toggleAttribute('readonly', …) при показе поля
// ввода (quickInputBox.js) → TypeError, палитра не открывается.
if (typeof Element !== 'undefined' && typeof (Element.prototype as any).toggleAttribute !== 'function') {
  (Element.prototype as any).toggleAttribute = function (name: string, force?: boolean) {
    if (this.hasAttribute(name)) {
      if (force) return true;
      this.removeAttribute(name);
      return false;
    }
    if (force === false) return false;
    this.setAttribute(name, '');
    return true;
  };
}

// AggregateError (ES2021, Safari 14) — monaco кидает его при ≥2 ошибках в dispose
// (lifecycle.js); без полифила ReferenceError МАСКИРУЕТ исходные ошибки при отладке.
if (typeof (_self as any).AggregateError !== 'function') {
  (_self as any).AggregateError = function AggregateError(errors: any, message?: string) {
    var e: any = new Error(message);
    e.name = 'AggregateError';
    e.errors = Array.prototype.slice.call(errors || []);
    return e;
  };
}

// User Timing (performance.mark/measure) — monaco замеряет inputLatency на КАЖДЫЙ
// кейстрок (textAreaInput). В Safari 11 API есть; стабы — страховка под другие
// версии WebKit 1С (8.3.14–8.3.2x). getEntriesByName обязан отдавать элемент с
// duration: monaco читает getEntriesByName(...)[0].duration без проверки.
(function () {
  var perf: any = _self.performance;
  if (!perf) { perf = _self.performance = {}; }
  if (typeof perf.now !== 'function') {
    var t0 = Date.now();
    perf.now = function () { return Date.now() - t0; };
  }
  ['mark', 'measure', 'clearMarks', 'clearMeasures'].forEach(function (m) {
    if (typeof perf[m] !== 'function') perf[m] = function () {};
  });
  if (typeof perf.getEntriesByName !== 'function') {
    perf.getEntriesByName = function () { return [{ duration: 0, startTime: 0 }]; };
  }
})();

// Blob.prototype.arrayBuffer (Safari 14) — monaco читает файл при drop в текст
// (dnd.js); dropIntoEditor у нас выключен — чистая страховка через FileReader.
if (typeof Blob !== 'undefined' && typeof (Blob.prototype as any).arrayBuffer !== 'function') {
  (Blob.prototype as any).arrayBuffer = function () {
    var blob = this;
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      r.readAsArrayBuffer(blob);
    });
  };
}

// Pointer Events (Safari 13) — движок 1С их лишён, а monaco 0.52.2 строит на них
// ВЕСЬ drag-интерактив: GlobalPointerMoveMonitor (выделение текста мышью, d&d
// текста — mouseHandler.js), скроллбары и стрелки (стартуют прямо с 'pointerdown'
// — abstractScrollbar.js/scrollbarArrow.js), минимап (minimap.js), overview ruler
// диффа. Симптом в 1С: клики работают (они mousedown-овые), но любой drag мёртв,
// а скроллбар/минимап мертвы целиком — их первичное событие не приходит вовсе.
// Транслируем mouse → pointer на стадии capture document (порядок как в живых
// браузерах: pointer* строго ПЕРЕД парным mouse*):
//   mousedown → pointerdown, mousemove → pointermove, mouseup → pointerup.
// Чего НЕ делаем намеренно:
//  - setPointerCapture не эмулируем: единственный вызов —
//    GlobalPointerMoveMonitor.startMonitoring — обёрнут в try/catch и при
//    исключении слушает window, куда синтетика всплывает сама;
//  - window.PointerEvent не определяем: BrowserFeatures.pointerEvents должен
//    остаться false (десктоп → MouseHandler), конструктор никто не зовёт;
//  - pointerleave/pointercancel не синтезируем: их потребитель
//    (EditorPointerEventFactory) живёт только в PointerEventHandler (iOS).
// По спеке preventDefault() на pointerdown подавляет compat-mousedown — зеркалим:
// минимап/слайдер зовут его безусловно и рассчитывают, что mousedown не придёт
// (иначе двойная обработка + увод фокуса из textarea редактора).
(function () {
  if (typeof _self.PointerEvent !== 'undefined') return; // современный движок — не вмешиваемся
  if (typeof document === 'undefined' || typeof MouseEvent === 'undefined') return;

  // MouseEvent.buttons (Safari 11.1) — GlobalPointerMoveMonitor сверяет e.buttons
  // каждого pointermove с initialButtons и при расхождении обрывает drag. Если
  // движок buttons не знает — ведём битовую маску сами через прототипный геттер:
  // и оригиналы, и синтетика читают ОДИН источник, расхождение исключено.
  var buttonsState = 0;
  var BUTTON_BIT: any = { 0: 1, 1: 4, 2: 2 }; // e.button → бит e.buttons
  if (!('buttons' in MouseEvent.prototype)) {
    try {
      Object.defineProperty(MouseEvent.prototype, 'buttons', {
        get: function () { return buttonsState; }, configurable: true
      });
    } catch (e) { /* ignore */ }
  }
  _self.addEventListener('blur', function () { buttonsState = 0; }, false);

  function synthPointer(type: string, src: any) {
    var ev: any;
    try {
      ev = new MouseEvent(type, {
        bubbles: true, cancelable: true, view: src.view || _self, detail: src.detail,
        screenX: src.screenX, screenY: src.screenY, clientX: src.clientX, clientY: src.clientY,
        ctrlKey: src.ctrlKey, altKey: src.altKey, shiftKey: src.shiftKey, metaKey: src.metaKey,
        button: src.button, buttons: src.buttons, relatedTarget: null
      } as any);
    } catch (err) { // на случай движка без конструктора MouseEvent
      ev = document.createEvent('MouseEvents');
      ev.initMouseEvent(type, true, true, src.view || _self, src.detail,
        src.screenX, src.screenY, src.clientX, src.clientY,
        src.ctrlKey, src.altKey, src.shiftKey, src.metaKey, src.button, null);
    }
    // minimap/scrollbarArrow получают СЫРОЕ событие (addStandardDisposableListener
    // не оборачивает pointerdown) и читают pointerId/buttons/offsetY/pageY —
    // копируем недостающее own-свойствами (offsetX синтетики движок не считает).
    function def(k: string, v: any) {
      try { Object.defineProperty(ev, k, { value: v, configurable: true }); } catch (e) { /* ignore */ }
    }
    def('pointerId', 1); def('pointerType', 'mouse'); def('isPrimary', true);
    def('offsetX', src.offsetX); def('offsetY', src.offsetY);
    def('pageX', src.pageX); def('pageY', src.pageY);
    return ev;
  }

  function translate(mouseType: string, pointerType: string, mirrorCancel: boolean) {
    document.addEventListener(mouseType, function (src: any) {
      if (mouseType === 'mousedown') buttonsState |= (BUTTON_BIT[src.button] || 0);
      else if (mouseType === 'mouseup') buttonsState &= ~(BUTTON_BIT[src.button] || 0);
      var target = src.target && src.target.dispatchEvent ? src.target : document;
      var ev = synthPointer(pointerType, src);
      target.dispatchEvent(ev);
      if (mirrorCancel && ev.defaultPrevented) {
        src.preventDefault();
        if (src.stopImmediatePropagation) src.stopImmediatePropagation();
        else src.stopPropagation();
      }
    }, true);
  }
  translate('mousedown', 'pointerdown', true);
  translate('mousemove', 'pointermove', false);
  translate('mouseup', 'pointerup', false);
})();
