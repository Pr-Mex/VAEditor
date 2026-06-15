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
