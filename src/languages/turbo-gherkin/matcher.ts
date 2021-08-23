class Section {
  feature: RegExp;
  variables: RegExp;
  background: RegExp;
  scenario: RegExp;
  scenarioOutline: RegExp;
  examples: RegExp;
};

export class KeywordMatcher {

  public words: string[][] = [];
  public section = new Section;
  public primary: RegExp;
  public import: RegExp;
  public step: RegExp;

  public regex(list: Array<string>, postfix: string = "(\\s+|$)"): RegExp {
    return list.length === 0 ? /$.^/ : new RegExp("^\\s*(" + list
      .map(w => w.split(/\s+/)).sort((a, b) => b.length - a.length)
      .map(w => w.join("\\s+")).join("|") + ")" + postfix, "i");
  }

  constructor(text: string) {

    const src = JSON.parse(text);

    let keywords = {
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
            list.forEach(w => keywords.import.push(w))
            break;
          default:
            if (keywords.section[word]) {
              list.forEach(w => keywords.section[word].push(w))
              list.forEach(w => keywords.primary.push(w))
            } else {
              list.forEach(w => keywords.step.push(w))
              list.forEach(w => this.words.push(w.toLowerCase().split(/\s+/)))
            }
        }
      })
    });

    this.words.sort((a, b) => b.length - a.length);

    Object.keys(keywords.section).forEach(key => {
      this.section[key] = this.regex(keywords.section[key], "\\s*:")
    });
    this.primary = this.regex(keywords.primary, "\\s*:");
    this.import = this.regex(keywords.import);
    this.step = this.regex(keywords.step);
  }

  public isSection(text: string) {
    const regexp = new RegExp(this.primary);
    return regexp.test(text);
  }
}