import { createTokenizationSupport } from 'monaco-editor/esm/vs/editor/standalone/common/monarch/monarchLexer';
import { StaticServices } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices';
import { compile } from 'monaco-editor/esm/vs/editor/standalone/common/monarch/monarchCompile';
import { VanessaEditor } from "../../vanessa-editor";
import { IVanessaAction } from "../../common";

interface IVanessaStep {
  filterText: string;
  insertText: string;
  sortText: string;
  documentation: string;
  kind: number;
  section: string;
}

enum VAToken {
  Empty = 0,
  Section,
  Operator,
  Comment,
  Instruction,
  Parameter,
}

interface VAIndent {
  token: VAToken;
  indent: number;
}

export class VanessaGherkinProvider {

  public static get instance(): VanessaGherkinProvider { return window["VanessaGherkinProvider"]; }
  public get errorLinks(): any { return this._errorLinks; }
  public get elements(): any { return this._elements; }
  public get keywords(): any { return this._keywords; }
  public get syntaxMsg(): any { return this._syntaxMsg; }
  public get variables(): any { return this._variables; }
  public get steps(): any { return this._steps; }

  protected _syntaxMsg = "Syntax error";
  protected _keywords: string[][] = [];
  protected _metatags: string[] = ["try", "except", "endtry"];
  protected _steps = {};
  protected _elements = {};
  protected _variables = {};
  protected _errorLinks = [];

  public get singleWords(): string[] {
    return this.keywords.filter(w => w.length == 1).map(w => w[0]);
  }

  public get metatags(): string[] {
    return this._metatags;
  }

  protected isSection(text: string) {
    let regexp = /^[^:]+/;
    let line = text.match(regexp);
    if (line == null) return false;
    let words = line[0].trim().split(/\s+/);
    if (words == undefined) return false;
    return this.keywords.some((item: string[]) =>
      item.length == words.length && item.every(
        (w, i) => words[i] && w == words[i].toLowerCase()
      )
    );
  };

  protected splitWords(line: string): Array<string> {
    let regexp = /([^\s"'\.:;,?!-]+|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/g;
    return line.match(regexp) || [];
  }

  protected findKeyword(words: Array<string>): Array<string> {
    if (words.length == 0) return undefined;
    let result = undefined;
    this.keywords.forEach((item: string[]) => {
      if (item.every((w: string, i: number) => words[i] && w == words[i].toLowerCase())) result = item;
    });
    return result;
  }

  protected filterWords(words: Array<string>): Array<string> {
    let s = true;
    let keyword = this.findKeyword(words);
    let notComment = (w: string) => s && !(/^[\s]*[#|//]/.test(w));
    return words.filter((w, i) => (keyword && i < keyword.length) ? false : (notComment(w) ? true : s = false));
  }

  protected key(words: Array<string>): string {
    let result = [];
    words.forEach((w: string) => {
      if (/^[A-zА-яЁё]+$/.test(w)) result.push(w.toLowerCase());
    });
    return result.join(" ");
  }

  public setErrorLinks = (arg: string): void => {
    const commands = JSON.parse(arg)
    this.clearArray(this.errorLinks);
    commands.forEach((e: IVanessaAction) => {
      this.errorLinks.push(e);
    });
  }

  public setKeywords = (arg: string): void => {
    this.clearArray(this.keywords);
    let list = JSON.parse(arg).map((w: string) => w.toLowerCase());
    list.forEach((w: string) => this.keywords.push(w.split(" ")));
    this._keywords = this.keywords.sort((a: any, b: any) => b.length - a.length);
  }

  public setMetatags = (arg: string): void => {
    let list = JSON.parse(arg);
    this.clearArray(this._metatags);
    list.forEach((w: string) => this._metatags.push(w));
  }

  public setElements = (values: string, clear: boolean = false): void => {
    if (clear) this.clearObject(this.elements);
    let obj = JSON.parse(values);
    for (let key in obj) {
      this.elements[key.toLowerCase()] = obj[key];
    }
    this.updateStepLabels();
  }

  public setVariables = (values: string, clear: boolean = false): void => {
    if (clear) this.clearObject(this.variables);
    let obj = JSON.parse(values);
    for (let key in obj) {
      this.variables[key.toLowerCase()] = { name: key, value: String(obj[key]) };
    }
    this.updateStepLabels();
  }

  public setStepList = (list: string, clear: boolean = false): void => {
    if (clear) this.clearObject(this.steps);
    JSON.parse(list).forEach((e: IVanessaStep) => {
      let body = e.insertText.split('\n');
      let text = body.shift();
      let head = this.splitWords(text);
      let words = this.filterWords(head);
      let key = this.key(words);
      this.steps[key] = {
        head: head,
        body: body,
        documentation: e.documentation,
        insertText: e.insertText,
        sortText: e.sortText,
        section: e.section,
        kind: e.kind,
      };
    });
    this.updateStepLabels();
    VanessaEditor.checkAllSyntax();
  }

  public setSyntaxMsg = (message: string): void => {
    this._syntaxMsg = message;
  }

  public getSyntaxMsg = (): string => {
    return this._syntaxMsg;
  }

  private updateStepLabels() {
    for (let key in this.steps) {
      let e = this.steps[key];
      let words = e.head.map((word: string) => {
        let regexp = /^"[^"]*"$|^'[^']*'$|^<[^<]*>$/g;
        if (!regexp.test(word)) return word;
        let name = word.substring(1, word.length - 1).toLowerCase();
        let elem = this.elements[name];
        if (!elem) return word;
        let Q1 = word.charAt(0);
        let Q2 = word.charAt(word.length - 1);
        return `${Q1}${elem}${Q2}`;
      });
      let keyword = this.findKeyword(words);
      e.label = words.filter((w, i) => !(keyword && i < keyword.length)).join(' ');
      e.keyword = words.filter((w, i) => (keyword && i < keyword.length)).join(' ');
      e.insertText = e.label + (e.body.length ? '\n' + e.body.join('\n') : '');
    }
  }

  public constructor() {
    this.createTheme1C();
  }

  private clearObject(target: Object) {
    Object.keys(target).forEach(key => delete target[key]);
  }

  private clearArray(target: Array<any>) {
    target.splice(0, target.length);
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

  private addQuickFix(model: monaco.editor.ITextModel, list: any, error: monaco.editor.IMarkerData) {
    let range = {
      startLineNumber: error.startLineNumber,
      endLineNumber: error.endLineNumber,
      startColumn: 1,
      endColumn: error.endColumn,
    };
    let value = model.getValueInRange(range);
    let words = this.splitWords(value);
    let keyword = this.findKeyword(words);
    if (keyword == undefined) return;
    let regexp = "^[\\s]*";
    keyword.forEach(w => regexp += w + "[\\s]+");
    let match = value.toLowerCase().match(new RegExp(regexp));
    if (match) range.startColumn = match[0].length + 1;
    let line = this.key(this.filterWords(words)).split(" ");
    for (let key in this.steps) {
      let sum = 0; let k = {};
      var step = key.split(" ");
      line.forEach((w: string) => k[w] ? k[w] += 1 : k[w] = 1);
      step.forEach((w: string) => k[w] ? k[w] -= 1 : k[w] = -1);
      for (let i in k) sum = sum + Math.abs(k[i]);
      if (sum < 4) list.push({ key: key, sum: sum, error: error, range: range, words: words });
    }
  }

  private replaceParams(step: string[], line: string[]): string {
    let index = 0;
    step = this.filterWords(step);
    let regexp = /^"[^"]*"$|^'[^']*'$|^<[^<]*>$/g;
    let test = (w: string) => (new RegExp(regexp.source)).test(w);
    let params = line.filter(w => test(w));
    return step.map(w => (test(w) && index < params.length) ? params[index++] : w).join(' ');
  }

  private getQuickFix(
    model: monaco.editor.ITextModel,
    markers: monaco.editor.IMarkerData[]
  ): monaco.languages.CodeActionList {
    let list = [];
    let actions: Array<monaco.languages.CodeAction> = [];
    markers.forEach(e => this.addQuickFix(model, list, e));
    list.sort((a, b) => a.sum - b.sum);
    list.forEach((e, i) => {
      if (i > 6) return;
      let step = this.steps[e.key];
      let text = this.replaceParams(step.head, e.words);
      actions.push({
        title: text,
        diagnostics: [e.error],
        kind: "quickfix",
        edit: {
          edits: [{
            resource: model.uri,
            edit: { range: e.range, text: text }
          }]
        },
        isPreferred: true
      });
    });
    return { actions: actions, dispose: () => { } };
  }

  public provideCodeActions(model: monaco.editor.ITextModel
    , range: monaco.Range
    , context: monaco.languages.CodeActionContext
    , token: monaco.CancellationToken
  ): monaco.languages.CodeActionList {
    if (context.markers.length == 0) return undefined;
    if (context.markers.every(e => e.severity != monaco.MarkerSeverity.Error)) return undefined;
    if (context.only == "quickfix") return this.getQuickFix(model, context.markers);
    let actions = [];
    /*
        VanessaEditor.get().actionManager.codeActions.forEach((e: any) => {
          actions.push({ command: { id: e.id }, title: e.title });
        });
    */
    return { actions: actions, dispose: () => { } };
  }

  private getIndent(text: string, tabSize: number) {
    let indent = 0;
    let length = text.search(/[^\s]/)
    for (let i = 0; i < length; i++) {
      if (text.charAt(i) == "\t") {
        indent = indent + tabSize - (indent % tabSize);
      } else indent++;
    }
    return indent + 1;
  }

  public provideFoldingRanges(
    model: monaco.editor.ITextModel,
    context: monaco.languages.FoldingContext,
    token: monaco.CancellationToken,
  ): Array<monaco.languages.FoldingRange> {
    return this.getCodeFolding(
      model.getOptions().tabSize,
      model.getLineCount(),
      lineNumber => model.getLineContent(lineNumber)
    );
  }

  private getTocken(text: string) {
    if (/^\s*$/.test(text)) return VAToken.Empty;
    if (/^[\s]*@/.test(text)) return VAToken.Instruction;
    if (/^[\s]*\|/.test(text)) return VAToken.Parameter;
    if (/^[\s]*[#|//]/.test(text)) return VAToken.Comment;
    return VAToken.Operator;
  }

  public getCodeFolding(
    tabSize: number,
    lineCount: number,
    getLineContent: (lineNumber: number) => string
  ): Array<monaco.languages.FoldingRange> {
    let lines: Array<VAIndent> = [{ token: VAToken.Empty, indent: 0 }];
    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
      let text = getLineContent(lineNumber);
      let token = this.getTocken(text);
      if (token != VAToken.Operator) {
        lines.push({ token: token, indent: 0 });
      } else {
        let ident = 0;
        if (this.isSection(text)) token = VAToken.Section;
        else ident = this.getIndent(text, tabSize);
        lines.push({ token: token, indent: ident });
      }
    }
    let result = [];
    for (let i = 1; i <= lineCount; i++) {
      let k = i;
      let line = lines[i];
      let kind = undefined;
      switch (line.token) {
        case VAToken.Instruction:
          for (let j = i + 1; j <= lineCount; j++) {
            if (lines[j].token == VAToken.Instruction) k = j; else break;
          }
          break;
        case VAToken.Comment:
          kind = monaco.languages.FoldingRangeKind.Comment;
          for (let j = i + 1; j <= lineCount; j++) {
            if (lines[j].token == VAToken.Comment) k = j; else break;
          }
          break;
        case VAToken.Section:
          kind = monaco.languages.FoldingRangeKind.Region;
          for (let j = i + 1; j <= lineCount; j++) {
            if (lines[j].token == VAToken.Section) break; else k = j;
          }
          break;
        case VAToken.Operator:
          for (let j = i + 1; j <= lineCount; j++) {
            let next = lines[j];
            if (next.token == VAToken.Section) break;
            if (next.token == VAToken.Empty) continue;
            if (next.token == VAToken.Comment) { k = j; continue; }
            if (next.token == VAToken.Parameter) { k = j; continue; }
            if (next.indent <= line.indent) break; else k = j;
          } break;
      }
      if (k > i) result.push({ kind: kind, start: i, end: k });
      if (line.token == VAToken.Instruction || line.token == VAToken.Comment) i = k;
    }
    return result;
  }

  public provideHover(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ): monaco.languages.Hover {
    let contents = [];
    let line = model.getLineContent(position.lineNumber)
    let words = this.splitWords(line);
    let key = this.key(this.filterWords(words));
    let char = String.fromCharCode(60020);
    let step = this.steps[key];
    if (step) {
      let href = "#info:" + key.replace(/ /g, "-");
      contents.push({ value: `**${step.section}** [${char}](${href})` });
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

  private empty(position: monaco.Position
  ): monaco.languages.CompletionList {
    return {
      suggestions: [{
        label: '',
        insertText: '',
        kind: monaco.languages.CompletionItemKind.Function,
        range: {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: position.column - 1,
          endColumn: position.column,
        },
      }]
    };
  }

  public provideCompletionItems(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ): monaco.languages.CompletionList {
    let line = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: model.getLineMinColumn(position.lineNumber),
      endColumn: model.getLineMaxColumn(position.lineNumber),
    };
    let wordRange = undefined;
    let regexp = /"[^"]*"|'[^']*'|<[^\s"']*>/g;
    let words = model.findMatches(regexp.source, line, true, false, null, false) || [];
    words.forEach(e => {
      if (e.range.startColumn <= position.column && position.column <= e.range.endColumn) {
        wordRange = e.range;
      }
    });
    let result = [];
    if (wordRange) {
      let variable = model.getValueInRange(wordRange);
      let Q1 = variable.charAt(0);
      let Q2 = variable.charAt(variable.length - 1);
      let S = /^.\$.+\$.$/.test(variable) ? "$" : "";
      for (let name in this.variables) {
        let item = this.variables[name];
        result.push({
          label: `"${S}${item.name}${S}" = ${item.value}`,
          filterText: variable + `${S}${item.name}${S}`,
          insertText: `${Q1}${S}${item.name}${S}${Q2}`,
          kind: monaco.languages.CompletionItemKind.Variable,
          range: wordRange
        })
      }
    } else {
      let maxColumn = model.getLineLastNonWhitespaceColumn(position.lineNumber);
      if (maxColumn && position.column < maxColumn) return this.empty(position);
      let minColumn = model.getLineFirstNonWhitespaceColumn(position.lineNumber);
      let line = model.getLineContent(position.lineNumber);
      let words = line.match(/[^\s]+/g) || [];
      let keyword = this.findKeyword(words);
      let range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: minColumn ? minColumn : position.column,
        endColumn: maxColumn ? maxColumn : position.column,
      };
      if (keyword) {
        let keytext = keyword.join(' ');
        keytext = keytext.charAt(0).toUpperCase() + keytext.slice(1);
        for (let key in this.steps) {
          let e = this.steps[key];
          if (e.documentation) {
            result.push({
              label: e.label,
              kind: e.kind ? e.kind : monaco.languages.CompletionItemKind.Function,
              detail: e.section,
              documentation: e.documentation,
              sortText: e.sortText,
              insertText: keytext + ' ' + e.insertText + '\n',
              filterText: keytext + ' ' + key,
              range: range
            });
          }
        }
      } else {
        for (let key in this.steps) {
          let e = this.steps[key];
          if (e.documentation) {
            result.push({
              label: e.label,
              kind: e.kind ? e.kind : monaco.languages.CompletionItemKind.Function,
              detail: e.section,
              documentation: e.documentation,
              sortText: e.sortText,
              insertText: e.keyword + ' ' + e.insertText + '\n',
              filterText: key,
              range: range
            });
          }
        }
      }
    }
    return { suggestions: result };
  }

  private lineSyntaxError(line: string): boolean {
    if (/^[\s]*[#|@|//]/.test(line)) return false;
    if (this.isSection(line)) return false;
    let words = this.splitWords(line);
    let keyword = this.findKeyword(words);
    if (keyword == undefined) return false;
    let s = true;
    let notComment = (w: string) => s && !(/^[\s]*[#|//]/.test(w));
    words = words.filter((w, i) => (i < keyword.length) ? false : (notComment(w) ? true : s = false));
    if (words.length == 0) return false;
    return this.steps[this.key(words)] == undefined;
  }

  public checkSyntax(model: monaco.editor.ITextModel) {
    if (model.getModeId() != "turbo-gherkin") return;
    let problems: monaco.editor.IMarkerData[] = [];
    let lineCount = model.getLineCount();
    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
      let error = this.lineSyntaxError(model.getLineContent(lineNumber));
      if (error) problems.push({
        severity: monaco.MarkerSeverity.Error,
        message: this.syntaxMsg,
        startLineNumber: lineNumber,
        startColumn: model.getLineFirstNonWhitespaceColumn(lineNumber),
        endLineNumber: lineNumber,
        endColumn: model.getLineLastNonWhitespaceColumn(lineNumber),
      });
    }
    monaco.editor.setModelMarkers(model, "syntax", problems);
  }

  private tokenizer: any;

  public init(languageId: string, languageDef: monaco.languages.IMonarchLanguage) {
    this.tokenizer = createTokenizationSupport(
      StaticServices.modeService.get(),
      StaticServices.standaloneThemeService.get(),
      languageId,
      compile(languageId, languageDef),
    );
  }

  public getInitialState(): monaco.languages.IState {
    return this.tokenizer.getInitialState();
  }

  public tokenize(line: string, state: monaco.languages.IState): monaco.languages.ILineTokens {
    let words = this.splitWords(line);
    let keyword = this.findKeyword(words);
    if (keyword && keyword.length > 1) {
      let regexp = "^[\\s]*";
      keyword.forEach(w => regexp += w + "[\\s]*");
      let match = line.toLowerCase().match(new RegExp(regexp));
      if (match) {
        line = "if";
        let length = match[0].length;
        for (let i = 2; i < length; i++) line += " ";
        line += line.substring(length);
      }
    }
    let tokens = [];
    let result = this.tokenizer.tokenize(line, state, 0);
    result.tokens.forEach((t: monaco.Token) => tokens.push({ startIndex: t.offset, scopes: t.type }));
    return { tokens: tokens, endState: result.endState };
  }
}
