import LanguageConfiguration = monaco.languages.LanguageConfiguration;
import IMonarchLanguage = monaco.languages.IMonarchLanguage;

// Идентификатор языка вынесен отдельно: по нему регистрируется язык, включается
// подсветка и им же пользуется всё, что рисует BSL-текст. Раньше строка "bsl"
// была продублирована в двух файлах.
export const BSL_LANGUAGE_ID = "bsl";

export const conf: LanguageConfiguration = {
  comments: {
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  autoClosingPairs: [
    { open: "\"", close: "\"", notIn: ["string"] },
    { open: "(", close: ")" },
    { open: "[", close: "]" },
  ],
  surroundingPairs: [
    { open: "\"", close: "\"" },
    { open: "(", close: ")" },
    { open: "[", close: "]" },
  ]
};

// Грамматика встроенного языка 1С. Три вещи, которые легко сломать:
//
// 1. Строка в BSL может занимать несколько строк (текст запроса пишут как
//    "ВЫБРАТЬ ... |ИЗ ..."), поэтому состояние @string живёт до закрывающей
//    кавычки, а не до конца строки.
// 2. `|` — не кавычка. Это разделитель строк текста запроса ВНУТРИ строки.
//    Раньше он открывал строковое состояние, и всё после него красилось как
//    строка.
// 3. Литерал даты пишется в одинарных кавычках ('20240101') и не является
//    строкой.
//
// Ключевые слова отдаются как keyword (раньше — metatag), чтобы цвет брался из
// того же правила темы, что и в остальных языках.
export const language: IMonarchLanguage = <IMonarchLanguage>{
  defaultToken: '',
  ignoreCase: true,

  keywords: [
    'КонецПроцедуры', 'EndProcedure', 'КонецФункции', 'EndFunction',
    'Прервать', 'Break', 'Продолжить', 'Continue', 'Возврат', 'Return',
    'Если', 'If', 'Иначе', 'Else', 'ИначеЕсли', 'ElsIf', 'Тогда', 'Then',
    'КонецЕсли', 'EndIf', 'Попытка', 'Try', 'Исключение', 'Except',
    'КонецПопытки', 'EndTry', 'Raise', 'ВызватьИсключение', 'Пока',
    'While', 'Для', 'For', 'Каждого', 'Each', 'Из', 'In', 'По', 'To', 'Цикл',
    'Do', 'КонецЦикла', 'EndDo', 'НЕ', 'NOT', 'И', 'AND', 'ИЛИ', 'OR', 'Новый',
    'New', 'Процедура', 'Procedure', 'Функция', 'Function', 'Перем', 'Var',
    'Экспорт', 'Export', 'Знач', 'Val', 'Неопределено', 'Выполнить',
    'Истина', 'Ложь', 'True', 'False', 'Undefined',
    // Асинхронность и метки (платформа 8.3.20+).
    'Асинх', 'Async', 'Ждать', 'Await', 'Перейти', 'Goto',
  ],

  brackets: [
    { open: '[', close: ']', token: 'delimiter.square' },
    { open: '(', close: ')', token: 'delimiter.parenthesis' },
  ],

  operators: ['=', '<=', '>=', '<>', '<', '>', '+', '-', '*', '/', '%'],
  symbols: /[=><!~?:&+\-*\/\^%]+/,

  tokenizer: {
    root: [
      // Директивы препроцессора и области: #Если, #КонецЕсли, #Область.
      [/^\s*#[А-Яа-яЁёA-Za-z_]+/, 'annotation'],
      // Директивы компиляции: &НаСервере, &НаКлиенте.
      [/&[А-Яа-яЁёA-Za-z_]+/, 'annotation'],
      [/[А-Яа-яЁёA-Za-z_][А-Яа-яЁёA-Za-z_0-9]*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier',
        }
      }],
      { include: '@whitespace' },
      // Литерал даты: '20240101' или '20240101120000'.
      [/'[0-9]{8}([0-9]{6})?'/, 'number'],
      // Строка: закрывающая кавычка может быть и на следующих строках.
      [/"/, { token: 'string', next: '@string' }],
      // Числа.
      [/[0-9]+\.[0-9]+([eE][\-+]?\d+)?/, 'number.float'],
      [/[0-9]+/, 'number'],
      [/[;,.]/, 'delimiter'],
      [/[()\[\]]/, '@brackets'],
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': 'delimiter',
        }
      }],
    ],

    whitespace: [
      [/[ \t\r\n]+/, ''],
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@blockComment'],
    ],

    blockComment: [
      [/[^*\/]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[*\/]/, 'comment'],
    ],

    string: [
      [/""/, 'string.escape'],
      [/[^"]+/, 'string'],
      [/"/, 'string', '@pop'],
    ],
  },
};

