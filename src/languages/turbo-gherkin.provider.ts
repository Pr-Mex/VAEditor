interface IVanessaStep {
  ИмяШага: string;
  ОписаниеШага: string;
}

export class VanessaGherkinProvider {

  public keywords: Array<string> = ["feature", "scenario", "given", "when", "then", "and", "but", "if", "elseif", "else"];

  private isKeyword(w: string): boolean {
    let s = w.toLowerCase();
    return this.keywords.some(e => e == s);
  }

  private steps: {};

  public setKeywords: Function;
  public setStepList: Function;

  constructor() {
    this.setKeywords = (list: string): void => {
      this.keywords = JSON.parse(list).map((w: string) => w.toLowerCase());
    }
    this.setStepList = (list: string): void => {
      this.steps = {};
      JSON.parse(list).forEach((e: IVanessaStep) => {
        let words = e.ИмяШага.split('\n')[0].replace(/'/g, '"').match(/(?:[^\s"]+|"[^"]*")+/g).filter(word => word && !this.isKeyword(word));
        let key = words.filter(s => s && s[0] != '"').map((w: string) => w.toLowerCase()).join(' ');
        this.steps[key] = {
          label: words.join(' '),
          documentation: e.ОписаниеШага,
          insertText: e.ИмяШага,
        };
      })
    }
  }

  public getSuggestions(line: any, range: any): any {
    let result = [];
    Object.keys(this.steps).map(key => {
      var e = this.steps[key];
      result.push({
        label: e.label,
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: e.documentation,
        insertText: e.insertText,
        filterText: key,
        range: range
      });
    });
    return result;
  }
}
