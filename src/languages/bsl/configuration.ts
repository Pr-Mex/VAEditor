import LanguageConfiguration = monaco.languages.LanguageConfiguration;
import IMonarchLanguage = monaco.languages.IMonarchLanguage;

export const conf: LanguageConfiguration = {
  comments: {
    lineComment: "//"
  },
  autoClosingPairs: [
    { open: "\"", close: "\"", notIn: ["string"] },
    { open: "'", close: "'", notIn: ["string"] },
    { open: "<", close: ">", notIn: ["string"] },
    { open: "$", close: "$" },
  ],
  surroundingPairs: [
    { open: "\"", close: "\"" },
    { open: "'", close: "'" },
    { open: "<", close: ">" },
  ]
};

export const language: IMonarchLanguage = <IMonarchLanguage>{
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
    'Истина', 'Ложь', 'True', 'False', 'Undefined'
  ],

  brackets: [
    { open: '[', close: ']', token: 'delimiter.square' },
    { open: '(', close: ')', token: 'delimiter.parenthesis' },
  ],

  operators: ['=', '<=', '>=', '<>', '<', '>', '+', '-', '*', '/', '%'],
  symbols: /[=><!~?:&+\-*\/\^%]+/,

  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  tokenizer: {
    root: [
      [/[a-zA-Z\u0410-\u044F_][a-zA-Z\u0410-\u044F_0-9]*/, { cases: { '@keywords': 'metatag', '@default': 'identifier' } }],
      // whitespace
      { include: '@whitespace' },
      // delimiters and operators
      [/}/, {
        cases: {
          '$S2==interpolatedstring': { token: 'string.quote', next: '@pop' },
          '$S2==litinterpstring': { token: 'string.quote', next: '@pop' },
          '@default': '@brackets'
        }
      }],
      [/^\s*#.*$/, 'key'],
      [/^\s*&.*$/, 'key'],
      [/[()\[\]]/, '@brackets'],
      [/@symbols/, {
        cases: {
          '@operators': 'delimiter',
          '@default': ''
        }
      }],
      // numbers
      [/[0-9_]*\.[0-9_]+([eE][\-+]?\d+)?[fFdD]?/, 'number.float'],
      [/[0-9_]+/, 'number'],
      // delimiter: after number because of .\d floats
      [/[;,.]/, 'delimiter'],
      // strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/["|]/, { token: 'string.quote', next: '@string' }],
      [/\$\@"/, { token: 'string.quote', next: '@litinterpstring' }],
      [/\@"/, { token: 'string.quote', next: '@litstring' }],
      [/\$"/, { token: 'string.quote', next: '@interpolatedstring' }],
      // characters
      [/'[^\\']'/, 'string'],
      [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
      [/'/, 'string.invalid']
    ],
    comment: [
      [/\/\/.*$/, 'comment'],
    ],
    string: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, { token: 'string.quote', next: '@pop' }],
      [/\|.*"/, { token: 'string.quote', next: '@pop' }],
    ],
    litstring: [
      [/[^"]+/, 'string'],
      [/""/, 'string.escape'],
      [/"/, { token: 'string.quote', next: '@pop' }]
    ],
    litinterpstring: [
      [/[^"{]+/, 'string'],
      [/""/, 'string.escape'],
      [/{{/, 'string.escape'],
      [/}}/, 'string.escape'],
      [/{/, { token: 'string.quote', next: 'root.litinterpstring' }],
      [/"/, { token: 'string.quote', next: '@pop' }]
    ],
    interpolatedstring: [
      [/[^\\"{]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/{{/, 'string.escape'],
      [/}}/, 'string.escape'],
      [/{/, { token: 'string.quote', next: 'root.interpolatedstring' }],
      [/"/, { token: 'string.quote', next: '@pop' }]
    ],
    whitespace: [
      [/\/\/.*$/, 'comment'],
    ],
  },
};
