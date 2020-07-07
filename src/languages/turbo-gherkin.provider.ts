import { VanessaEditor } from "../vanessa-editor";

interface IVanessaStep {
  filterText: string;
  insertText: string;
  sortText: string;
  documentation: string;
  kind: number;
  section: string;
}

export class VanessaGherkinProvider {

  private isSection(text: string) {
    let regexp = /[^:\s]+(?=.*:)/g;
    let words = text.match(regexp);
    if (words == null) return false;
    return this.keywords.some((item: string[]) =>
      item.length == words.length && item.every((w: string, i: number) => words[i] && w == words[i].toLowerCase())
    );
  };

  private splitWords(line: string): Array<string> {
    let regexp = /([^\s"']+|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/g;
    return line.match(regexp) || [];
  }

  private filterWords(words: Array<string>): Array<string> {
    let s = true;
    let notComment = (w: string) => s && !(/^[\s]*[#|//]/.test(w));
    let keyword = this.keywords.find((item: string[]) => item.every((w: string, i: number) => words[i] && w == words[i].toLowerCase()));
    return words.filter((w, i) => (keyword && i < keyword.length) ? false : (notComment(w) ? true : s = false));
  }

  private key(words: Array<string>): string {
    let result = [];
    words.forEach((w: string) => {
      if (/^[A-zА-я]+$/.test(w)) result.push(w.toLowerCase());
    });
    return result.join(' ');
  }

  private lineSyntaxError(line: string): boolean {
    if (/^[\s]*[#|@|//]/.test(line)) return false;
    if (this.isSection(line)) return false;
    let words = this.splitWords(line);
    let keyword = this.keywords.find(item => item.every((w: string, i: number) => words[i] && w == words[i].toLowerCase()));
    if (keyword == undefined) return false;
    let s = true;
    let notComment = (w: string) => s && !(/^[\s]*[#|//]/.test(w));
    words = words.filter((w, i) => (i < keyword.length) ? false : (notComment(w) ? true : s = false));
    if (words.length == 0) return false;
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
    this.createTheme1C();
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
      this.updateStepLabels();
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
    let regexp = /"[^"]*"|'[^']*'/g;
    let words = model.findMatches(regexp.source, line, true, false, null, false) || [];
    words.forEach(e => {
      if (e.range.startColumn <= position.column && position.column <= e.range.endColumn) {
        wordRange = e.range;
      }
    });
    let result = [];
    if (wordRange) {
      let variable = model.getValueInRange(wordRange);
      let S = /^.\$.+\$.$/.test(variable) ? "$" : "";
      for (let name in this.variables) {
        let item = this.variables[name];
        result.push({
          label: `"${S}${item.name}${S}" = ${item.value}`,
          filterText: variable + `${S}${item.name}${S}`,
          insertText: `"${S}${item.name}${S}"`,
          kind: monaco.languages.CompletionItemKind.Variable,
          range: wordRange
        })
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
      let vars = line.match(/"[^"]+"|'[^']+'/g) || [];
      vars.forEach(function (part: string) {
        let d = /^.\$.+\$.$/.test(part) ? 2 : 1;
        let v = values[part.substring(d, part.length - d).toLowerCase()];
        if (v) contents.push({ value: "**" + v.name + "** = " + v.value });
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
    if (context.markers.every(e => e.severity != monaco.MarkerSeverity.Error)) return [];
    if (context.only == "quickfix") return this.getQuickFix(model, context.markers);
    let actions = [];
    let ve = window["VanessaEditor"] as VanessaEditor;
    if (ve) ve.actionManager.codeActions.forEach((e: any) => {
      actions.push({ command: { id: e.id }, title: e.title });
    });
    return actions;
  }

  public checkSyntax(model: monaco.editor.ITextModel = undefined) {
    if (model == undefined) {
      let editor = window["VanessaEditor"].editor;
      if (editor == undefined) return;
      model = editor.getModel();
    };
    let problems: monaco.editor.IMarkerData[] = [];
    let lineCount = model.getLineCount();
    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
      let error = this.lineSyntaxError(model.getLineContent(lineNumber));
      if (error) problems.push({
        severity: monaco.MarkerSeverity.Error,
        message: "Syntax error: step not found",
        startLineNumber: lineNumber,
        startColumn: model.getLineFirstNonWhitespaceColumn(lineNumber),
        endLineNumber: lineNumber,
        endColumn: model.getLineLastNonWhitespaceColumn(lineNumber),
      });
    }
    monaco.editor.setModelMarkers(model, "syntax", problems);
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
  }
}
