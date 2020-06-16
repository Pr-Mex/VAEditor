import IRichLanguageConfiguration = monaco.languages.LanguageConfiguration;
import ILanguage = monaco.languages.IMonarchLanguage;

export const conf: IRichLanguageConfiguration = {
  comments: {
    lineComment: "//"
  },
  autoClosingPairs: [
    { open: "\"", close: "\"", notIn: ["string"] },
    { open: "'", close: "'", notIn: ["string"] },
    { open: "$", close: "$" },
  ],
  surroundingPairs: [
    { open: "\"", close: "\"" },
    { open: "'", close: "'" }
  ]
};

export const language: ILanguage = <ILanguage>{
  ignoreCase: true,

  keywords: window["VanessaGherkinKeywords"],

  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  tokenizer: {
    root: [
      { include: "@section" },
      { include: "@common" },
      [/.*$/, "emphasis"],
    ],

    common: [
      [/@.*/, "annotation"],
      [/^\s*\*.*$/, "strong"],
      [/^\s*\|/, { token: "operator", next: "@params" }],
      { include: "@whitespace" },
      { include: "@numbers" },
      [/"([^"\\]|\\.)*$/, "string.invalid"], // non-teminated string
      [/'([^'\\]|\\.)*$/, "string.invalid"], // non-teminated string
      [/"/, "string", "@string_double"],
      [/'/, "string", "@string_single"],
    ],

    section: [
      [/^\s*([A-zА-я]+)(?:\s*\:)/, {
        cases: {
          "$1@keywords": { token: "metatag.php", next: "@metatag" },
          "@default": { token: "identifier", next: "@metatag" },
        },
      }],
    ],

    metatag: [
      { include: "@section" },
      [/^\s*([A-zА-я]+)/, {
        cases: {
          "$1@keywords": { token: "keyword", next: "@operator" },
          "@default": { token: "emphasis" },
        },
        log: "test $1"
      }],
      { include: "@common" },
      [/.*$/, "emphasis"],
    ],

    operator: [
      [/^/, { token: "white", next: "@pop" }],
      [/\s*([A-zА-я]+)/, "identifier"],
      { include: "@common" },
    ],

    params: [
      [/^/, { token: "white", next: "@pop" }],
      { include: "@common" },
    ],

    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/(^#.*$)/, "comment"],
      [/(^\/\/.*$)/, "comment"]
    ],

    numbers: [
      [/-?(\d*\.)?\d+([eE][+-]?\d+)?[jJ]?[lL]?/, "number"]
    ],

    string_double: [
      [/[^\\"]+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/"/, "string", "@pop"]
    ],

    string_single: [
      [/[^\\']+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/'/, "string", "@pop"]
    ]
  }
};
