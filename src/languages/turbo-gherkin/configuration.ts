import { VanessaGherkinProvider } from "./provider";

export const language: monaco.languages.ILanguageExtensionPoint = {
  id: "turbo-gherkin",
  aliases: ["gherkin", "turbo-gherkin"],
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

  unicode = true;

  ignoreCase = true;

  escapes = /\\(?:[abfnrtv\\"'{}\[\]\$]|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/;

  word = /\p{L}[\p{L}\p{N}]*/;

  constructor(provider: VanessaGherkinProvider) {
    const metatags = provider.matcher.regex(provider.metatags);
    this.tokenizer.section.push([new RegExp(metatags), { token: "metatag.php", next: "@operator" }])
    this.tokenizer.section.push([provider.matcher.section.feature, { token: "metatag.php", next: "@heading" }])
    this.tokenizer.section.push([provider.matcher.primary, { token: "metatag.php", next: "@operator" }])
    this.tokenizer.keyword.push([provider.matcher.import, { token: "keyword", next: "@operator" }]);
    this.tokenizer.keyword.push([provider.matcher.step, { token: "keyword", next: "@operator" }]);
    this.tokenizer.feature[0] = [provider.matcher.primary, { token: "metatag.php", next: "@root" }];
    if (provider.matcher.directives && provider.matcher.directives.all)
      this.tokenizer.section.push([provider.matcher.directives.all, { token: "metatag", next: "@operator" }])
    if (provider.matcher.sppr) {
      this.tokenizer.common.push([/\[/, "comment", "@string_bracket"]);
      this.tokenizer.common.push({include: "@multiline_comment"});
      this.tokenizer.string.forEach(item => {
        if (item[1] && item[1].token === "constant") {
          item[1].token = 'comment';
        }
      });
      this.tokenizer.index.forEach(item => {
        if (item[1] && item[1].token === "constant") {
          item[1].token = 'comment';
        }
      });
    }
  }

  tokenizer = {
    root: [
      { include: "@hyperlink" },
      { include: "@section" },
      { include: "@keyword" },
      { include: "@common" },
      [/.*$/, "emphasis"],
    ],

    heading: [
      [/^/, { token: "white", next: "@feature" }],
      [/\s*(@word)/, "identifier"],
      { include: "@common" },
    ],

    feature: [
      { include: "@section" },
      [/^\s*(@word)/, "emphasis"],
      [/\s*(@word)/, "emphasis"],
      { include: "@common" },
    ] as Array<any>,

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
      [/҂+$/, { token: "keyword" }],
    ],

    eol: [
      [/^/, { token: "white", next: "@pop" }],
    ],

    section: [],

    keyword: [],

    operator: [
      { include: "@eol" },
      [/\s*(@word)/, "identifier"],
      { include: "@common" },
    ],

    params: [
      { include: "@eol" },
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

    multiline_comment: [
      [/\s*\/\*.*$/, { token: "comment", next: "@multiline_comment_end" }]
    ],

    multiline_comment_end: [
      [/^.*\*\/\s*$/, { token: "comment", next: "@pop" }],
      [/^.*$/, "comment"],
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
      [/\{!/, { bracket: "@open", token: "keyword.flow", next: "server" }],
      [/\{/, { bracket: "@open", token: "predefined.sql", next: "client" }],
      { include: "@escapes" },
    ],

    string_double: [
      { include: "@eol" },
      [/[^"\\\{\[\$]+/, "string"],
      { include: "@string" },
      [/"/, "string", "@pop"],
    ],

    string_single: [
      { include: "@eol" },
      [/[^'\\\{\[\$]+/, "string"],
      { include: "@string" },
      [/'/, "string", "@pop"]
    ],

    string_angle: [
      { include: "@eol" },
      [/[^>\\\{\[\$]+/, "string"],
      { include: "@string" },
      [/>/, "string", "@pop"]
    ],

    string_bracket: [
      { include: "@eol" },
      [/[^\]\\\{\[\$]+/, "comment"],
      { include: "@string" },
      [/\]/, "comment", "@pop"]
    ],

    index: [
      { include: "@eol" },
      [/[^\\\]]+/, {token: "constant"}],
      { include: "@escapes" },
      [/\]/, { bracket: "@close", next: "@pop", token: "constant" }],
    ],

    predefined: [
      { include: "@eol" },
      [/[^\\\$]+/, "variable.predefined"],
      { include: "@escapes" },
      [/\$\$/, { bracket: "@close", next: "@pop", token: "variable.predefined" }],
    ],

    variable: [
      { include: "@eol" },
      [/[^\\\$]+/, "variable"],
      { include: "@escapes" },
      [/\$/, { bracket: "@close", next: "@pop", token: "variable" }],
    ],

    server: [
      { include: "@eol" },
      [/[^\\\}]+/, "keyword.flow"],
      { include: "@escapes" },
      [/\}/, { bracket: "@close", next: "@pop", token: "keyword.flow" }],
    ],

    client: [
      { include: "@eol" },
      [/[^\\\}]+/, "predefined.sql"],
      { include: "@escapes" },
      [/\}/, { bracket: "@close", next: "@pop", token: "predefined.sql" }],
    ],
  }
};
