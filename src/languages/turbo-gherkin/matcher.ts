class Section {
  feature: RegExp;
  variables: RegExp;
  background: RegExp;
  scenario: RegExp;
  scenarioOutline: RegExp;
  examples: RegExp;
};

export class KeywordMatcher {

  public stepkey: any = {};
  public section = new Section;
  public keypairs: RegExp[];
  public metatags: RegExp;
  public directives: RegExp;
  public primary: RegExp;
  public import: RegExp;
  public step: RegExp;

  public regex(list: Array<string>, postfix: string = "(\\s+|$)"): RegExp {
    return list.length === 0 ? /$.^/ : new RegExp("^\\s*(" + list
      .map(w => w.split(/\s+/)).sort((a, b) => b.length - a.length)
      .map(w => w.join("\\s+")).join("|") + ")" + postfix, "i");
  }

  public tokens = {
    word: /\p{L}[\p{L}\p{N}]*/,
    param: /"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|<[^>\\]*(?:\\.[^>\\]*)*>/,
    number: /-?(\d*\.)?\d+([eE][+-]?\d+)?[jJ]?[lL]?/,
  };

  public getSnippet(text: string): string {
    const source = [this.tokens.word, this.tokens.param].map((reg: RegExp) => "(" + reg.source + ")").join("|");
    const regexp = new RegExp(source, "gui");
    const result = [];
    let match = undefined;
    while ((match = regexp.exec(text)) != undefined) {
      if (match[1]) result.push(match[1].toLowerCase())
    }
    return result.join(" ");
  }

  constructor(text: string) {

    let keywords = {
      stepkey: {},
      section: {
        feature: [],
        variables: [],
        background: [],
        scenario: [],
        scenarioOutline: [],
        examples: [],
      },
      primary: [],
      import: [],
      step: [],
    }

    const src = JSON.parse(text);
    Object.keys(src).forEach(lang => {
      const data = src[lang];
      Object.keys(data).forEach(word => {
        const list = data[word];
        switch (word) {
          case "":
          case "name":
          case "native":
            break;
          case "import":
            list.forEach(w => { if (w) keywords.import.push(w) });
            break;
          default:
            if (keywords.section[word]) {
              list.forEach(w => { if (w) keywords.section[word].push(w) });
              list.forEach(w => { if (w) keywords.primary.push(w) });
            } else {
              const key = word.toLowerCase();
              list.forEach(w => { if (w) keywords.step.push(w) });
              if (!keywords.stepkey[key]) keywords.stepkey[key] = [];
              list.forEach(w => { if (w) keywords.stepkey[key].push(w) });
            }
        }
      })
    });
    Object.keys(keywords.section).forEach(key => {
      this.section[key] = this.regex(keywords.section[key], "\\s*:");
    });
    Object.keys(keywords.stepkey).forEach(key => {
      this.stepkey[key] = this.regex(keywords.stepkey[key]);
    });
    this.primary = this.regex(keywords.primary, "\\s*:");
    this.import = this.regex(keywords.import);
    this.step = this.regex(keywords.step);
  }

  public setMetatags(metatags: string[]) {
    this.metatags = this.regex(metatags);
  }

  public setDirectives(words: string[]) {
    this.directives = words.length === 0 ?
      null : this.regex(words);
  }

  public setKeypairs(keypairs: any) {
    this.keypairs = [];
    Object.keys(keypairs).forEach((key: string) => {
      this.keypairs.push(
        new RegExp("^(\\s*"
          + key.replace(/\s+/, "\\s+")
          + "\\s+(.*)\\s+)("
          + keypairs[key].map(w => w.replace(/\s+/, "\\s*")).join("|")
          + ")\\s*$", "ui"));
    });
  }

  public isSection(text: string) {
    const regexp = new RegExp(this.primary);
    return regexp.test(text);
  }

  public getSection(text: string) {
    const res = Object.keys(this.section).filter(key => key && this.section[key].test(text));
    return res && res[0];
  }

}