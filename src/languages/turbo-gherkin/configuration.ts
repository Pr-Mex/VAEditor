import { VanessaGherkinProvider } from "./provider";
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
  ],
  surroundingPairs: [
    { open: "\"", close: "\"" },
    { open: "'", close: "'" },
    { open: "<", close: ">" },
  ]
};

export const language: IMonarchLanguage = <IMonarchLanguage>{
  ignoreCase: true,

  metatags: VanessaGherkinProvider.instance.metatags,

  hyperlinks: VanessaGherkinProvider.instance.hyperlinks,

  keywords: VanessaGherkinProvider.instance.singleWords.concat(["if"]),

  escapes: /\\(?:[abfnrtv\\"'{}]|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  word: /[A-zА-яЁё][0-9A-zА-яЁё]*/,

  tokenizer: {
    root: [
      { include: "@section" },
      { include: "@keyword" },
      { include: "@common" },
      [/.*$/, "emphasis"],
    ],

    common: [
      [/@.*/, "annotation"],
      [/^\s*\*.*$/, "strong"],
      [/^\s*\|/, { token: "operator", next: "@params" }],
      [/^\s*""".*$/, { token: "string", next: "@multyline" }],
      { include: "@whitespace" },
      { include: "@numbers" },
      [/"([^"\\]|\\.)*$/, "string.invalid"], // non-teminated string
      [/'([^'\\]|\\.)*$/, "string.invalid"], // non-teminated string
      [/"{!/, "keyword.flow", "server_double" ],
      [/'{!/, "keyword.flow", "server_single" ],
      [/"{/, "predefined.sql", "client_double" ],
      [/'{/, "predefined.sql", "client_single" ],
      [/"/, "string", "@string_double"],
      [/'/, "string", "@string_single"],
      [/</, "string", "@string_angle"],
      [/҂+$/, { token: "keyword" }]
    ],

    section: [
      [/^\s*(@word)(?:\s*\:)/, {
        cases: {
          "$1@keywords": { token: "metatag.php", switchTo: "@root" },
          "$1@hyperlinks": { token: "metatag.php", switchTo: "@root" },
          "@default": { token: "identifier", switchTo: "@root" },
        },
      }],
    ],

    keyword: [
      [/^\s*(@word)\s*=/, { token: "operator", next: "@operator" }],
      [/^\s*(@word)/, {
        cases: {
          "$1@metatags": { token: "metatag", next: "@operator" },
          "$1@keywords": { token: "keyword", next: "@operator" },
          "@default": { token: "emphasis" },
        },
        log: "test $1"
      }],
    ],

    operator: [
      [/^/, { token: "white", next: "@pop" }],
      [/\s*(@word)/, "identifier"],
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

    multyline: [
      [/^\s*""".*$/, { token: "string", next: "@pop" }],
      [/^.*$/, "string"],
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
    ],

    string_angle: [
      [/[^\\>]+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/>/, "string", "@pop"]
    ],

    client_double: [
      [/[^\\}]+/, "predefined.sql"],
      [/@escapes/, "predefined.sql"],
      [/\\./, "string.escape.invalid"],
      [/}"/, "predefined.sql", "@pop"],
    ],

    client_single: [
      [/[^\\}]+/, "predefined.sql"],
      [/@escapes/, "predefined.sql"],
      [/\\./, "string.escape.invalid"],
      [/}'/, "predefined.sql", "@pop"],
    ],

    server_double: [
      [/[^\\}]+/, "keyword.flow"],
      [/@escapes/, "keyword.flow"],
      [/\\./, "string.escape.invalid"],
      [/}"/, "keyword.flow", "@pop"],
    ],

    server_single: [
      [/[^\\}]+/, "keyword.flow"],
      [/@escapes/, "keyword.flow"],
      [/\\./, "string.escape.invalid"],
      [/}'/, "keyword.flow", "@pop"],
    ],
  }
};
