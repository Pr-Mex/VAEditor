interface IVanessaStep {
  filterText: string;
  insertText: string;
  sortText: string;
  documentation: string;
  kind: number;
  section: string;
}

export class VanessaGherkinProvider {

  private isKeyword(w: string): boolean {
    let s = w.toLowerCase();
    return this.keywords.some(e => e == s);
  }

  private splitWords(line: string): Array<string> {
    let regexp = /(?:[^\s"']+|["][^"]*["]|['][^']*['])+/g;
    return line.match(regexp) || [];
  }

  private filterWords(line: Array<string>): Array<string> {
    let b = true, s = true;
    let notComment = (w: string) => s && w[0] != '#' && w.substring(0, 2) != '//';
    return line.filter(w => (b && this.isKeyword(w)) ? b = false : (b = false, notComment(w) ? true : s = false));
  }

  private key(words: Array<string>): string {
    return words.map((w: string) => {
      let regexp = /(?:^\d*(?:\.\d+)?$|^["][^"]*["]$|^['][^']*[']$)/g;
      return regexp.test(w) ? "^" : w.toLowerCase();
    }).join(' ');
  }

  private lineSyntaxError(line: string): boolean {
    let res = line.match(/[^\s"']+\:/s); // Top-level keywords
    if (res && this.isKeyword(res[0].substring(0, res[0].length - 1))) return false;
    if ([undefined, '#', '|', '@'].includes(line.trimLeft()[0])) return false;
    return this.steps[this.key(this.filterWords(this.splitWords(line)))] == undefined;
  }

  public keywords: Array<string>;
  private steps: {};
  private elements: {};
  private variables: {};

  public setElements: Function;
  public setKeywords: Function;
  public setStepList: Function;
  public setVariables: Function;

  constructor() {
    this.steps = {};
    this.elements = {};
    this.variables = {};
    this.keywords = ["feature", "scenario", "given", "when", "then", "and", "but", "if", "elseif", "else"];

    this.setKeywords = (list: string): void => {
      this.keywords = JSON.parse(list).map((w: string) => w.toLowerCase());
    }

    this.setElements = (values: string, clear: boolean = false): void => {
      if (clear) this.elements = {};
      let obj = JSON.parse(values);
      for (let key in obj) {
        this.elements[key.toLowerCase()] = obj[key];
      }
    }

    this.setVariables = (values: string, clear: boolean = false): void => {
      if (clear) this.variables = {};
      let obj = JSON.parse(values);
      for (let key in obj) {
        this.variables[key.toLowerCase()] = { name: key, value: String(obj[key]) };
      }
      this.updateStepLabels();
    }

    this.setStepList = (list: string): void => {
      this.steps = {};
      JSON.parse(list).forEach((e: IVanessaStep) => {
        let body = e.insertText.split('\n');
        let line = body.shift();
        let words = this.splitWords(line);
        let key = this.key(this.filterWords(words));
        this.steps[key] = {
          head: words,
          body: body,
          documentation: e.documentation,
          insertText: e.insertText,
          sortText: e.sortText,
          section: e.section,
          kind: e.kind,
        };
      });
      this.updateStepLabels();
    }
  }

  private updateStepLabels() {
    for (let key in this.steps) {
      let e = this.steps[key];
      let words = e.head.map((word: string) => {
        let regexp = /^"[^"]*"$|^'[^']*'$/g;
        if (!regexp.test(word)) return word;
        let name = word.substring(1, word.length - 1).toLowerCase();
        let elem = this.elements[name];
        return elem ? '"' + elem + '"' : word;
      });
      e.label = this.filterWords(words).join(' ');
      e.insertText = words.join(' ');
      if (e.body.length) e.insertText += '\n' + e.body.join('\n');
    }
  }

  public getSuggestions(model: monaco.editor.ITextModel, position: monaco.Position): any {
    let line = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: model.getLineMinColumn(position.lineNumber),
      endColumn: model.getLineMaxColumn(position.lineNumber),
    };
    let wordRange = undefined;
    let regexp = /"\$[^"]*"|'\$[^']*'/g;
    let words = model.findMatches(regexp.source, line, true, false, null, false) || [];
    words.forEach(e => {
      if (e.range.startColumn <= position.column && position.column <= e.range.endColumn) {
        wordRange = e.range;
      }
    });
    let result = [];
    if (wordRange) {
      let variable = model.getValueInRange(wordRange);
      for (let name in this.variables) {
        let item = this.variables[name];
        result.push({
          label: '"$' + item.name + '$" = ' + item.value,
          filterText: variable + '"$' + item.name + '$"',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: '"$' + item.name + '$"',
          range: wordRange
        });
      }
    }
    else {
      let word = model.getWordUntilPosition(position);
      let range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };
      for (let key in this.steps) {
        var e = this.steps[key];
        result.push({
          label: e.label,
          kind: e.kind ? e.kind : monaco.languages.CompletionItemKind.Function,
          detail: e.section,
          documentation: e.documentation,
          insertText: e.insertText + "\n",
          sortText: e.sortText,
          filterText: key,
          range: range
        });
      };
    }
    return { suggestions: result };
  }

  public getHoverContents(model: monaco.editor.ITextModel, position: monaco.Position): any {
    let contents = [];
    let line = model.getLineContent(position.lineNumber)
    let words = this.splitWords(line);
    let key = this.key(this.filterWords(words));
    let step = this.steps[key];
    if (step) {
      contents.push({ value: "**" + step.section + "**" });
      contents.push({ value: step.documentation });
      let values = this.variables;
      let vars = line.match(/"\$[^"]+\$"|'\$[^']+\$'/g) || [];
      vars.forEach(function (part: string) {
        let name = part.substring(2, part.length - 2);
        let value = values[name.toLowerCase()].value;
        contents.push({ value: "**" + name + "** = " + value });
      });
    }
    let range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: model.getLineMinColumn(position.lineNumber),
      endColumn: model.getLineMaxColumn(position.lineNumber),
    };
    return { range: range, contents: contents }
  }

  public getCodeAction(model: monaco.editor.ITextModel
    , range: monaco.Range
    , context: monaco.languages.CodeActionContext
    , token: monaco.CancellationToken) {

    if (context.markers.length == 0) return [];
    if (context.only == "quickfix") {
      const actions = context.markers.map(error => {
        return {
          title: `Example quick fix`,
          diagnostics: [error],
          kind: "quickfix",
          edit: {
            edits: [
              {
                resource: model.uri,
                edits: [
                  {
                    range: error,
                    text: "This text replaces the text with the error"
                  }
                ]
              }
            ]
          },
          isPreferred: true
        };
      });
      return actions;
    }
    let command = {
      id: window["commandIdQuickFix"],
      title: "Some command!",
      isPreferred: true,
      kind: "quickfix",
    };
    console.log(command);
    return [{
      command: command,
      title: "Create new step!"
    },
    {
      command: command,
      title: "Some new command!"
    }, ];
  }

  public checkSyntax() {
    let problems = [];
    let ve = window["VanessaEditor"];
    let count = ve.editor.getModel().getLineCount();
    for (let i = 1; i < count; i++) {
      let error = this.lineSyntaxError(ve.getLineContent(i));
      if (error) problems.push({
        lineNumber: i,
        code: "0x01",
        severity: 'Error',
        message: 'Syntax error: step not found',
      });
    }
    ve.problemManager.DecorateProblems(problems);
  }
}
