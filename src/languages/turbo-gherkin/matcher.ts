class Section {
  feature: RegExp;
  variables: RegExp;
  background: RegExp;
  scenario: RegExp;
  scenarioOutline: RegExp;
  examples: RegExp;
};

export class KeywordMatcher {

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
        switch (word) {
          case "":
          case "name":
          case "native":
            break;
          case "import":
            data[word].forEach(w => keywords.import.push(w))
            break;
          default:
            if (keywords.section[word]) {
              data[word].forEach(w => keywords.section[word].push(w))
              data[word].forEach(w => keywords.primary.push(w))
            } else
              data[word].forEach(w => keywords.step.push(w))
        }
      })
    });

    Object.keys(keywords.section).forEach(key => {
      this.section[key] = this.regex(keywords.section[key], "\\s*:")
    });
    this.primary = this.regex(keywords.primary, "\\s*:");
    this.import = this.regex(keywords.import);
    this.step = this.regex(keywords.step);
  }
}