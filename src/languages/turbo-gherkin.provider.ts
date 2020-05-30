interface IVanessaStep {
  ИмяШага: string;
  ОписаниеШага: string;
  ПолныйТипШага: string;
}

export class VanessaGherkinProvider {

  public keywords: Array<string> = ["feature", "scenario", "given", "when", "then", "and", "but", "if", "elseif", "else"];

  private isKeyword(w: string): boolean {
    let s = w.toLowerCase();
    return this.keywords.some(e => e == s);
  }

  private splitWords(line: string): Array<string> {
    let b = true;
    return line.split('\n')[0].replace(/'/g, '"')
      .match(/(?:[^\s"]+|"[^"]*")+/g).filter(w =>
        (b && this.isKeyword(w)) ? false : (b= false, true)
      );
  }

  private key(words: Array<string>): string {
    return words.filter(s => s && s[0] != '"').map((w: string) => w.toLowerCase()).join(' ');
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
        let words = this.splitWords(e.ИмяШага);
        this.steps[this.key(words)] = {
          label: words.join(' '),
          documentation: e.ОписаниеШага,
          insertText: e.ИмяШага,
          type: e.ПолныйТипШага,
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

  public getHoverContents(line: any): any {
    let step = this.steps[this.key(this.splitWords(line))];
    if (step) return [
      { value: "**" + step.type + "**" },
      { value: step.documentation },
    ];
    return [];
  }
}
