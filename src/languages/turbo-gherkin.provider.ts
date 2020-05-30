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
        (b && this.isKeyword(w)) ? false : (b = false, true)
      );
  }

  private key(words: Array<string>): string {
    return words.filter(s => s && s[0] != '"').map((w: string) => w.toLowerCase()).join(' ');
  }

  private steps: {};
  private variables: {};

  public setKeywords: Function;
  public setStepList: Function;
  public setVariables: Function;

  constructor() {
    this.setKeywords = (list: string): void => {
      this.keywords = JSON.parse(list).map((w: string) => w.toLowerCase());
    }
    this.setVariables = (str: string): void => {
      this.variables = {};
      let obj = JSON.parse(str);
      Object.keys(obj).map(key => this.variables[key] = String(obj[key]));
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
    let res = [];
    let words = this.splitWords(line);
    let step = this.steps[this.key(words)];
    if (step) {
      res.push({ value: "**" + step.type + "**" });
      res.push({ value: step.documentation });
    } else return [];
    let values = this.variables;
    let vars = words.filter(w => w.search(/^"\$.+\$"$/) == 0);
    vars.forEach(function (part, index, vars) {
      let name = part.substring(2, part.length - 2);
      res.push({ value: "**" + name + "** = " +  values[name]});
    });
    return res;
  }
}
