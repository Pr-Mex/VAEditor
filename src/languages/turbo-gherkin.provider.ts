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
    let s = true;
    let notComment = (w: string) => s && w[0] != '#' && w.substring(0, 2) != '//';
    let keyword = this.keywords.find(item => item.every((w: string, i: number) => line[i] && w == line[i].toLowerCase()));
    return line.filter((w, i) => (keyword && i <= keyword.length) ? false : (notComment(w) ? true : s = false));
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
    let words = this.splitWords(line);
    if (!this.isKeyword(words[0])) return false;
    words = this.filterWords(words);
    return this.steps[this.key(words)] == undefined;
  }

  public keywords: any;
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

    window["VanessaGherkinKeywords"] = ["feature", "scenario", "given", "when", "then", "and", "but", "if", "elseif", "else"];

    this.setKeywords = (arg: string): void => {
      this.keywords = [];
      let list = JSON.parse(arg).map((w: string) => w.toLowerCase());
      window["VanessaGherkinKeywords"] = list;
      list.forEach((w: string) => this.keywords.push(w.split(" ")));
      this.keywords = this.keywords.sort((a: any, b: any) => b.length - a.length);
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

    this.setStepList = (list: string, clear: boolean = false): void => {
      if (clear) this.steps = {};
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
      this.checkSyntax();
    }
    this.createTheme1C();
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
      let maxColumn = model.getLineMaxColumn(position.lineNumber);
      if (position.column != maxColumn) return undefined;
      let word = model.getWordUntilPosition(position);
      let prev = model.findNextMatch(/[^\s]/.source, { lineNumber: position.lineNumber, column: 0 }, true, false, null, false);
      let minColumn = prev ? Math.min(prev.range.startColumn, word.startColumn) : word.startColumn;
      let range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: minColumn,
        endColumn: maxColumn
      };
      for (let key in this.steps) {
        var e = this.steps[key];
        if (e.documentation) {
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
        }
      }
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

  private addQuickFix(model: monaco.editor.ITextModel, list: any, error: monaco.editor.IMarkerData) {
    let range = {
      startLineNumber: error.startLineNumber,
      endLineNumber: error.endLineNumber,
      startColumn: error.startColumn,
      endColumn: error.endColumn,
    };
    let value = model.getValueInRange(range);
    let words = this.key(this.filterWords(this.splitWords(value))).split(' ');
    for (let key in this.steps) {
      let sum = 0; let k = {};
      var step = key.split(' ');
      words.forEach((w: string) => k[w] ? k[w] += 1 : k[w] = 1);
      step.forEach((w: string) => k[w] ? k[w] -= 1 : k[w] = -1);
      for (let i in k) sum = sum + Math.abs(k[i]);
      if (sum < 3) list.push({ key: key, sum: sum, error: error });
    }
  }

  // FIX ERROR !!! https://github.com/microsoft/monaco-editor/issues/1548
  private getQuickFix(model: monaco.editor.ITextModel, markers: monaco.editor.IMarkerData[]) {
    let list = [];
    let actions = [];
    let editor: monaco.editor.IStandaloneCodeEditor = window["VanessaEditor"].editor;
    markers.forEach(e => this.addQuickFix(editor.getModel(), list, e));
    list.sort((a, b) => a.sum - b.sum);
    list.forEach((e, i) => {
      if (i > 6) return;
      let step = this.steps[e.key];
      actions.push({
        title: step.label,
        diagnostics: [e.error],
        kind: "quickfix",
        edit: {
          edits: [{
            resource: model.uri,
            edits: [{ range: e.error, text: step.insertText }]
          }]
        },
        isPreferred: true
      });
    });
    return actions;
  }

  public getCodeAction(model: monaco.editor.ITextModel
    , range: monaco.Range
    , context: monaco.languages.CodeActionContext
    , token: monaco.CancellationToken) {
    if (context.markers.length == 0) return [];
    if (context.only == "quickfix") return this.getQuickFix(model, context.markers);
    let actions = [];
    let ve = window["VanessaEditor"];
    if (ve) ve.codeActions.forEach((e: any) => {
      actions.push({ command: { id: e.id }, title: e.title });
    });
    return actions;
  }

  public checkSyntax() {
    let ve = window["VanessaEditor"];
    if (ve && ve.editor) {
      let problems = [];
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

  private createTheme1C() {
    monaco.editor.defineTheme('1c', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: '', foreground: '000000' },
        { token: 'invalid', foreground: 'ff3333' },
        { token: 'variable', foreground: '5c6773' },
        { token: 'constant', foreground: 'f08c36' },
        { token: 'comment', foreground: '007f00' },
        { token: 'number', foreground: '0000ff' },
        { token: 'tag', foreground: 'e7c547' },
        { token: 'string', foreground: '963200' },
        { token: 'keyword', foreground: 'ff0000' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#5c6773',
        'editorIndentGuide.background': '#ecebec',
        'editorIndentGuide.activeBackground': '#e0e0e0',
      },
    });
    monaco.editor.setTheme('1c');
  }
}
