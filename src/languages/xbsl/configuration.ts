import LanguageConfiguration = monaco.languages.LanguageConfiguration;
import IMonarchLanguage = monaco.languages.IMonarchLanguage;

// Язык «1С:Элемент» (в инструментах известен как xBSL, файлы .xbsl).
// Среда выполнения — «Элемент Скрипт», статическая типизация, ключевые слова
// пишутся строчными буквами, стандартная библиотека — в пространствах имён
// вида Стд::Строка.
//
// Грамматика намеренно лёгкая: подсветка и конфигурация языка, без диагностики
// и автодополнения — они подключаются отдельно, если понадобятся.
export const XBSL_LANGUAGE_ID = "xbsl";

export const conf: LanguageConfiguration = {
  comments: {
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  brackets: [
    { open: "{", close: "}", token: "delimiter.curly" },
    { open: "[", close: "]", token: "delimiter.square" },
    { open: "(", close: ")", token: "delimiter.parenthesis" },
  ],
  autoClosingPairs: [
    { open: "\"", close: "\"", notIn: ["string"] },
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
  ],
  surroundingPairs: [
    { open: "\"", close: "\"" },
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
  ]
};

// Список ключевых слов — по документу ИТС «1С:Предприятие.Элемент.
// Возможности встроенного языка» и справочнику «Список инструкций, операций и
// символов» (its-pubelementlang, its-pub1celementarno-307).
//
// ignoreCase выключен осознанно: в языке ключевые слова только строчные, и
// «Если» — это не ключевое слово, а неизвестная переменная. Подсветка должна
// показывать это так же, как компилятор.
export const language: IMonarchLanguage = <IMonarchLanguage>{
  defaultToken: '',
  ignoreCase: false,

  keywords: [
    // Блоки кода.
    'метод', 'область',
    // Инструкции.
    'выбор', 'выбросить', 'для', 'из', 'по', 'если', 'иначе', 'когда',
    'знч', 'исп', 'конст', 'пер', 'перечисление', 'пока', 'попытка',
    'структура', 'возврат', 'прервать', 'продолжить', 'вниз',
    // Операции и прочие ключевые слова.
    'и', 'или', 'не', 'новый', 'как', 'это', 'конструктор', 'обз',
    'статический', 'неизвестно', 'ничто', 'умолчание', 'этот',
    // Литерал типа «Неопределено» пишется с прописной буквы.
    'Неопределено',
  ],

  brackets: [
    { open: '{', close: '}', token: 'delimiter.curly' },
    { open: '[', close: ']', token: 'delimiter.square' },
    { open: '(', close: ')', token: 'delimiter.parenthesis' },
  ],

  operators: [
    '=', '==', '!=', '<', '<=', '>', '>=', '+', '-', '*', '/', '%',
    '**', '+=', '-=', '*=', '/=', '->', '??', '|',
  ],
  symbols: /[=!<>+\-*\/%?|]+/,

  tokenizer: {
    root: [
      // Директива импорта: #Использовать (знак номера — начало директивы).
      [/#[А-Яа-яЁёA-Za-z_]+/, 'keyword'],
      // Аннотация: @Наименование.
      [/@[А-Яа-яЁёA-Za-z_]+/, 'annotation'],
      // Ссылка на метод: &ИмяМетода.
      [/&[А-Яа-яЁёA-Za-z_]+/, 'identifier'],
      // Пространство имён стандартной библиотеки: Стд::Строка.
      [/[А-Яа-яЁёA-Za-z_][А-Яа-яЁёA-Za-z_0-9]*::/, 'type'],
      [/[А-Яа-яЁёA-Za-z_][А-Яа-яЁёA-Za-z_0-9]*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier',
        }
      }],
      { include: '@whitespace' },
      // Строковый литерал. В языке строки однострочные, поэтому состояние не
      // нужно: незакрытая кавычка не «съедает» остаток файла.
      [/"(?:[^"\\]|\\.)*"/, 'string'],
      [/"/, 'string.invalid'],
      // Регулярное выражение в апострофах.
      [/'(?:[^'\\]|\\.)*'/, 'regexp'],
      [/'/, 'delimiter'],
      // Числа.
      [/[0-9]+\.[0-9]+([eE][\-+]?\d+)?/, 'number.float'],
      [/[0-9]+/, 'number'],
      [/[;:,.]/, 'delimiter'],
      [/[{}()\[\]]/, '@brackets'],
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
  },
};
