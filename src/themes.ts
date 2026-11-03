// Каноническая палитра встроенного языка 1С — та, что видна в Конфигураторе и
// EDT: ключевые слова красные, числа синие, строки тёмно-коричневые,
// комментарии зелёные, имена — серо-синие. Тема наследует 'vs', поэтому всё,
// для чего правила нет (скобки, операторы, идентификаторы), остаётся как во
// встроенной теме и не приходится дублировать.
//
// Имена токенов — те же, что отдают грамматики Gherkin, BSL и xBSL
// (`keyword`, `number`, `string`, `comment`), поэтому палитра применяется ко
// всем трём языкам сразу: отдельных правил «на язык» не нужно.
//
// Значения — исторические цвета подсветки 1С. В ИТС палитра не опубликована
// («Цветовое оформление встроенного языка» лишь отсылает к
// Параметры > Подсветка синтаксиса), поэтому здесь зафиксировано то, что
// совпадает с поведением Конфигуратора, а не подобрано на глаз.
export const CANONICAL_1C_THEME_ID = '1c';

export const CANONICAL_1C_THEME: monaco.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: '', foreground: '000000' },
    { token: 'invalid', foreground: 'ff3333' },
    { token: 'variable', foreground: '5c6773' },
    { token: 'constant', foreground: 'f08c36' },
    { token: 'comment', foreground: '007f00' },
    { token: 'number', foreground: '0000ff' },
    { token: 'tag', foreground: 'e7c547' },
    { token: 'string', foreground: '963200' },
    { token: 'keyword', foreground: 'ff0000' },
  ],
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#5c6773',
    'editorIndentGuide.background': '#ecebec',
    'editorIndentGuide.activeBackground': '#e0e0e0',
  },
};
