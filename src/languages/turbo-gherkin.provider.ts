interface IVanessaStep {
  ИмяШага: string;
  ОписаниеШага: string;
  ПолныйТипШага: string;
}

export class VanessaGherkinProvider {

  private isKeyword(w: string): boolean {
    let s = w.toLowerCase();
    return this.keywords.some(e => e == s);
  }

  private splitWords(line: string): Array<string> {
    let b = true, s = true;
    return (line.split('\n')[0].match(/(?:[^\s"']+|["][^"]*["]|['][^']*['])+/g) || [])
      .filter(w => (b && this.isKeyword(w)) ? false : (b = false, s && w[0] != '#' ? true : s = false));
  }

  private key(words: Array<string>): string {
    return words.filter(s => s && !['"', "'"].includes(s[0])).map((w: string) => w.toLowerCase()).join(' ');
  }

  private lineSyntaxError(line: string): boolean {
    if ([undefined, '#', '|'].includes(line.trimLeft()[0])) return false;
    return this.steps[this.key(this.splitWords(line))] == undefined;
  }

  public keywords: Array<string>;
  private steps: {};
  private variables: {};

  public setKeywords: Function;
  public setStepList: Function;
  public setVariables: Function;

  constructor() {
    this.steps = {};
    this.variables = {};
    this.keywords = ["feature", "scenario", "given", "when", "then", "and", "but", "if", "elseif", "else"];

    this.setKeywords = (list: string): void => {
      this.keywords = JSON.parse(list).map((w: string) => w.toLowerCase());
    }

    this.setVariables = (values: string, clear: boolean = false): void => {
      if (clear) this.variables = {};
      let obj = JSON.parse(values);
      for (let key in obj) {
        this.variables[key.toLowerCase()] = String(obj[key]);
      }
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

  public getSuggestions(line: string, range: any): any {
    let result = [];
    for (let key in this.steps) {
      var e = this.steps[key];
      result.push({
        label: e.label,
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: e.documentation,
        insertText: e.insertText + "\n",
        filterText: key,
        range: range
      });
    };
    return result;
  }

  public getHoverContents(line: string): any {
    let res = [];
    let words = this.splitWords(line);
    let step = this.steps[this.key(words)];
    if (step) {
      res.push({ value: "**" + step.type + "**" });
      res.push({ value: step.documentation });
    } else return [];
    let values = this.variables;
    let vars = line.match(/"\$[^"]+\$"|'\$[^']+\$'/g) || [];
    vars.forEach(function (part: string) {
      let name = part.substring(2, part.length - 2);
      let value = values[name.toLowerCase()];
      res.push({ value: "**" + name + "** = " + value });
    });
    return res;
  }

  public checkSyntax() {
    let problems = [];
    let ve = window["VanessaEditor"];
    let count = ve.editor.getModel().getLineCount();
    for (let i = 1; i < count; i++) {
      let error = this.lineSyntaxError(ve.getLineContent(i));
      if (error) problems.push({
        lineNumber: i,
        severity: 'Error',
        message: 'Syntax error',
      });
    }
    ve.problemManager.DecorateProblems(problems);
  }
}
