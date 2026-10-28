// Оформление редактора повторяет интерфейс платформы.
//
// Как определяется:
// 1. Явные параметры URL: interface=taxi|85, theme=light|dark — для отладки в
//    браузере и для обработок, которые решают это сами.
// 2. Палитра платформы. В интерфейсе «Версия 8.5» 1С вставляет в страницу стиль
//    #PaletteColors: переменные --color* и классы themeLight/themeDark. По ним
//    видно и вариант интерфейса, и текущую тему.
// 3. Иначе — «Такси», светлая.
//
// Палитру 8.5 редактор не дублирует: css берёт значения прямо из переменных
// платформы (см. body[data-interface="85"] в media/tabs.css), поэтому светлая и
// тёмная темы переключаются без участия редактора.

import { StyleManager } from './style';

export type PlatformInterface = 'taxi' | '85';
export type PlatformTheme = 'vs' | 'vs-dark';

const DEFAULT_INTERFACE: PlatformInterface = 'taxi';
const DEFAULT_THEME: PlatformTheme = 'vs';

// Переменная палитры платформы: значение есть — страница в интерфейсе 8.5.
const PALETTE_PROBE = '--colorBack10';

function urlParam(name: string): string {
  // Регулярка вместо URLSearchParams: во встроенном WebKit 1С его может не быть.
  const match = new RegExp('[?&]' + name + '=([^&#]*)', 'i').exec(window.location.search);
  return match ? decodeURIComponent(match[1]).toLowerCase() : '';
}

function hasThemeClass(name: string): boolean {
  const root = document.documentElement;
  const body = document.body;
  return Boolean((root && root.classList.contains(name)) || (body && body.classList.contains(name)));
}

function platformPaletteValue(name: string): string {
  if (!window.getComputedStyle) return '';
  const elements = [document.documentElement, document.body];
  for (const element of elements) {
    if (!element) continue;
    const value = window.getComputedStyle(element).getPropertyValue(name);
    if (value && value.trim()) return value.trim();
  }
  return '';
}

export function detectPlatformInterface(): PlatformInterface {
  const param = urlParam('interface');
  if (param === '85' || param === '8.5' || param === 'version8_5') return '85';
  if (param === 'taxi') return 'taxi';
  return platformPaletteValue(PALETTE_PROBE) ? '85' : DEFAULT_INTERFACE;
}

export function detectPlatformTheme(): PlatformTheme {
  const param = urlParam('theme');
  if (param === 'dark') return 'vs-dark';
  if (param === 'light') return 'vs';
  if (hasThemeClass('themeDark')) return 'vs-dark';
  if (hasThemeClass('themeLight')) return 'vs';
  // Класс темы не нашли, но палитра есть — доверяем системной настройке:
  // в 8.5 значение «Авто» означает именно следование теме ОС.
  if (platformPaletteValue(PALETTE_PROBE) && window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'vs-dark';
  }
  return DEFAULT_THEME;
}

// Ставит на body атрибуты, по которым css выбирает оформление, и переключает
// тему Monaco. Вызывать после появления body, до создания редактора.
export function applyUiEnvironment(): void {
  document.body.setAttribute('data-interface', detectPlatformInterface());
  StyleManager.theme = detectPlatformTheme();
}
