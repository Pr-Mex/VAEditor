// Версия сборки: подставляется DefinePlugin на этапе сборки (см. webpack.config.js).
// Объявление локальное для модуля, чтобы не зависеть от того, попал ли
// src/types/public-api.d.ts в программу компиляции конкретного tsconfig.

declare const __VA_EDITOR_VERSION__: string;

declare global {
  interface Window {
    /** Версия сборки редактора, например "1.4.0.123". */
    VAEditorVersion: string;
  }
}

export const editorVersion: string =
  typeof __VA_EDITOR_VERSION__ === 'undefined' ? '' : __VA_EDITOR_VERSION__;

// Обработка читает версию из страницы, чтобы сверить её с версией шаблона,
// из которого распакованы файлы.
export function applyEditorVersion(): void {
  window.VAEditorVersion = editorVersion;
}
