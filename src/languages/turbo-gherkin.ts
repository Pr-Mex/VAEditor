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

  keywords: window["VanessaGherkinProvider"].keywords,

  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  tokenizer: {
    root: [
      [/[A-zА-я]+/, {
        cases: {
          "@keywords": "keyword",
          "@default": "identifier"
        },
        log: "test $1"
      }],
      { include: "@whitespace" },
      { include: "@numbers" },
      [/@.*/, "annotation"],
      [/"([^"\\]|\\.)*$/, "string.invalid"], // non-teminated string
      [/'([^'\\]|\\.)*$/, "string.invalid"], // non-teminated string
      [/"/, "string", "@string_double"],
      [/'/, "string", "@string_single"]
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
