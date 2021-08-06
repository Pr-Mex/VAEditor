export class KeywordMatcher {

  public reg: any;

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

    let regex = (list: Array<string>, postfix: string) => new RegExp("^\\s*(" + list
      .map(w => w.split(/\s+/)).sort((a, b) => b.length - a.length)
      .map(w => w.join("\\s+")).join("|") + ")" + postfix, "i");

    this.reg = {
      section: {},
      primary: regex(keywords.primary, "\\s*:"),
      import: regex(keywords.import, "(\\s+|$)"),
      step: regex(keywords.step, "(\\s+|$)"),
    }

    Object.keys(keywords.section).forEach(key => {
      this.reg.section[key] = regex(keywords.section[key], "\\s*:")
    });
  }
}