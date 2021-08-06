export class KeywordMatcher {

  public reg: any;

  constructor(text: string, languages = ["ru", "en"]) {

    const src = JSON.parse(text);

    let keywords = {
      section: {
        "": [],
        feature: [],
        variables: [],
        background: [],
        scenario: [],
        scenarioOutline: [],
        examples: [],
      },
      import: [],
      step: [],
    }

    languages.forEach(lang => {
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
              data[word].forEach(w => keywords.section[""].push(w))
            } else
              data[word].forEach(w => keywords.step.push(w))
        }
      })
    });

    let ex = (list: Array<string>) => "(" + list
      .map(w => w.split(/\s+/)).sort((a, b) => b.length - a.length)
      .map(w => w.join("\\s+")).join("|") + ")";

    this.reg = {
      section: {},
      import: new RegExp("^\\s*" + ex(keywords.import) + "(\\s+|$)", "i"),
      step: new RegExp("^\\s*" + ex(keywords.step) + "(\\s+|$)", "i"),
    }

    Object.keys(keywords.section).forEach(key => {
      this.reg.section[key] = new RegExp("^\\s*" + ex(keywords.section[key]) + "\\s*:")
    });
  }
}