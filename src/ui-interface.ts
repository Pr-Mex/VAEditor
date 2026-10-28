// Интерфейс платформы влияет на оформление: «Такси» и «Версия 8.5» различаются
// палитрой и геометрией (ИТС, «Новый интерфейс 1С:Предприятия 8.5»).
//
// Вариант приходит из 1С параметром interface — его добавляет обработка, которая
// знает ответ КлиентскоеПриложение.ТекущийВариантИнтерфейса(). Старые сборки
// параметр не передают: тогда остаётся историческое оформление «Такси», поэтому
// обновление редактора не меняет вид у тех, кто ещё на 8.3.
//
// Значение живёт в data-interface на body — рядом с data-theme, который ставит
// StyleManager (см. style.ts).

export type PlatformInterface = 'taxi' | '85';

const DEFAULT_INTERFACE: PlatformInterface = 'taxi';

function readInterfaceParam(): string {
  // Регулярка вместо URLSearchParams: во встроенном WebKit 1С его может не быть.
  const match = /[?&]interface=([^&#]*)/i.exec(window.location.search);
  return match ? decodeURIComponent(match[1]).toLowerCase() : undefined;
}

export function detectPlatformInterface(): PlatformInterface {
  const value = readInterfaceParam();
  if (!value) return DEFAULT_INTERFACE;
  // Из 1С приходит короткий код "85"; остальные написания — для ручной отладки
  // и ссылок в документации.
  if (value === '85' || value === '8.5' || value === 'version8_5') return '85';
  return DEFAULT_INTERFACE;
}

export function applyPlatformInterface(
  value: PlatformInterface = detectPlatformInterface()
): PlatformInterface {
  document.body.setAttribute('data-interface', value);
  return value;
}
