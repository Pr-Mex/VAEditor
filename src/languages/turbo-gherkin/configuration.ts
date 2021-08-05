import { VanessaGherkinProvider } from "./provider";

export const language: monaco.languages.ILanguageExtensionPoint = {
  id: "turbo-gherkin",
  extensions: [".feature"],
};

export const conf: monaco.languages.LanguageConfiguration = {
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

export class GherkinLanguage {

  ignoreCase = true;

  escapes = /\\(?:[abfnrtv\\"'{}\[\]\$]|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/;

  word = /[A-zА-яЁё][0-9A-zА-яЁё]*/;

  constructor(provider: VanessaGherkinProvider) {
    const metatags = provider.metatags.join('|');
    const hyperlnk = provider.hyperlinks.join('|');
    const keywords = provider.keywords.map(list => list.join("\\s+")).join('|');
    this.tokenizer.section.push([new RegExp("^\\s*(" + hyperlnk + ")\\s*:"), { token: "metatag.php", next: "@operator" }])
    this.tokenizer.section.push([new RegExp("^\\s*(" + keywords + ")\\s*:"), { token: "metatag.php", next: "@operator" }]);
    this.tokenizer.section.push([new RegExp("^\\s*(" + metatags + ")(\\s+|$)"), { token: "metatag.php", next: "@operator" }])
    this.tokenizer.keyword.push([new RegExp("^\\s*(" + keywords + ")(\\s+|$)"), { token: "keyword", next: "@operator" }]);
  }

  tokenizer = {
    root: [
      { include: "@hyperlink" },
      { include: "@section" },
      { include: "@keyword" },
      { include: "@common" },
      [/.*$/, "emphasis"],
    ],

    hyperlink: [
      [/^\s*(@word)\s*=/, { token: "operator", next: "@operator" }],
    ],

    common: [
      [/@.*/, "annotation"],
      [/^\s*\*.*$/, "strong"],
      [/^\s*(@word)/, "emphasis"],
      [/^\s*\|/, { token: "operator", next: "@params" }],
      [/^\s*"""(@word).*$/, { token: "string", next: "@embeded", nextEmbedded: "$1" }],
      [/^\s*""".*$/, { token: "string", next: "@multyline" }],
      { include: "@whitespace" },
      { include: "@numbers" },
      [/"([^"\\]|\\.)*$/, "string.invalid"], // non-teminated string
      [/'([^'\\]|\\.)*$/, "string.invalid"], // non-teminated string
      [/"/, "string", "@string_double"],
      [/'/, "string", "@string_single"],
      [/</, "string", "@string_angle"],
      [/҂+$/, { token: "keyword" }]
    ],

    section: [],

    keyword: [],

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

    embeded: [
      [/^\s*""".*$/, { token: "string", next: "@pop", nextEmbedded: "@pop" }],
      [/^.*$/, "string"],
    ],

    escapes: [
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
    ],

    string: [
      [/\$\$/, { bracket: "@open", token: "variable.predefined", next: "predefined" }],
      [/\$/, { bracket: "@open", token: "variable", next: "variable" }],
      [/\[/, { bracket: "@open", token: "constant", next: "index" }],
      [/{!/, { bracket: "@open", token: "keyword.flow", next: "server" }],
      [/{/, { bracket: "@open", token: "predefined.sql", next: "client" }],
      { include: "@escapes" },
    ],

    string_double: [
      [/[^"\\\{\[\$]+/, "string"],
      { include: "@string" },
      [/"/, "string", "@pop"],
    ],

    string_single: [
      [/[^'\\\{\[\$]+/, "string"],
      { include: "@string" },
      [/'/, "string", "@pop"]
    ],

    string_angle: [
      [/[^>\\\{\[\$]+/, "string"],
      { include: "@string" },
      [/>/, "string", "@pop"]
    ],

    index: [
      [/[^\\\]]+/, "constant"],
      { include: "@escapes" },
      [/\]/, { bracket: "@close", next: "@pop", token: "constant" }],
    ],

    predefined: [
      [/[^\\\$]+/, "variable.predefined"],
      { include: "@escapes" },
      [/\$\$/, { bracket: "@close", next: "@pop", token: "variable.predefined" }],
    ],

    variable: [
      [/[^\\\$]+/, "variable"],
      { include: "@escapes" },
      [/\$/, { bracket: "@close", next: "@pop", token: "variable" }],
    ],

    server: [
      [/[^\\}]+/, "keyword.flow"],
      { include: "@escapes" },
      [/}/, { bracket: "@close", next: "@pop", token: "keyword.flow" }],
    ],

    client: [
      [/[^\\}]+/, "predefined.sql"],
      { include: "@escapes" },
      [/}/, { bracket: "@close", next: "@pop", token: "predefined.sql" }],
    ],
  }
};
