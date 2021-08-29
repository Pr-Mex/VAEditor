import { createTokenizationSupport } from 'monaco-editor/esm/vs/editor/standalone/common/monarch/monarchLexer';
import { StaticServices } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices';
import { TokenizationRegistry, ITokenizationSupport } from 'monaco-editor/esm/vs/editor/common/modes';
import { compile } from 'monaco-editor/esm/vs/editor/standalone/common/monarch/monarchCompile';
import { language, GherkinLanguage } from './configuration';
import { VanessaEditor } from "../../vanessa-editor";
import { IVanessaAction } from "../../common";
import { KeywordMatcher } from './matcher';
import { VanessaStep, MessageType, VanessaModel } from './common';

const blob = require("blob-url-loader?type=application/javascript!compile-loader?target=worker&emit=false!/src/languages/turbo-gherkin/worker.js");
const worker = new Worker(blob);
let workerMessageId = 0;
const messageMap = new Map<number, any>();

worker.onmessage = function (e) {
  const msg = e.data;
  const promise = msg.id && messageMap.get(msg.id);
  if (promise) {
    messageMap.delete(msg.id);
    if (msg.success)
      promise.resolve(msg.data);
    else
      promise.reject(msg.data);
  }
}

function postMessage<T>(model: VanessaModel, message: any)
  : Promise<T> {
  const versionId = model.getVersionId();
  if (model.workerVersionId !== versionId) {
    model.workerVersionId = versionId;
    worker.postMessage({
      type: MessageType.UpdateModelCache,
      content: model.getLinesContent(),
      uri: model.uri.toString(),
      versionId: versionId,
    });
  }
  const id = message.id = ++workerMessageId;
  function init(resolve, reject) {
    messageMap.set(id, { resolve, reject });
  }
  const promise = new Promise<T>(init);
  worker.postMessage(message);
  return promise;
}

export function clearWorkerCache(uri: monaco.Uri) {
  worker.postMessage({ type: MessageType.DeleteModelCache, uri: uri.toString() });
}

export class VanessaGherkinProvider {

  public static get instance(): VanessaGherkinProvider { return window["VanessaGherkinProvider"]; }
  public get errorLinks(): any { return this._errorLinks; }
  public get elements(): any { return this._elements; }
  public get keywords(): any { return this._matcher._keywords; }
  public get keypairs(): any { return this._keypairs; }
  public get syntaxMsg(): any { return this._syntaxMsg; }
  public get variables(): any { return this._variables; }
  public get steps(): any { return this._steps; }

  protected _soundHint = "Sound";
  protected _syntaxMsg = "Syntax error";
  protected _metatags: string[] = ["try", "except", "попытка", "исключение"];
  protected _keypairs: any = { };
  protected _steps = { };
  protected _elements = { };
  protected _variables = { };
  protected _errorLinks = [];
  protected _matcher: KeywordMatcher;
  protected _locale: string;

  public get metatags(): string[] {
    return this._metatags;
  }

  public get locale(): string {
    return this._locale;
  }

  protected isSection(text: string) {
    const regexp = new RegExp(this.matcher.primary);
    return regexp.test(text);
  }

  protected getSection(text: string) {
    const res = Object.keys(this.matcher.section).filter(key => key && this.matcher.section[key].test(text));
    return res && res[0];
  }

  protected splitWords(line: string): Array<string> {
    let regexp = /"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|<[^>]*>|[A-zА-яЁё]+|[^A-zА-яЁё\s]+/g;
    return line.match(regexp) || [];
  }

  protected findKeyword(words: Array<string>): Array<string> {
    if (words.length == 0) return undefined;
    let result = undefined;
    this.keywords.forEach((item: string[]) => {
      if (!result && item.every((w: string, i: number) => words[i] && w == words[i].toLowerCase())) result = item;
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

  public get matcher() { return this._matcher; }

  public setMatchers = (arg: string): void => {
    worker.postMessage({ type: MessageType.SetMatchers, data: arg });
    this._matcher = new KeywordMatcher(arg);
    this.initTokenizer();
  }

  public setKeypairs = (arg: string): void => {
    let pairs = JSON.parse(arg);
    this.clearObject(this.keypairs);
    Object.keys(pairs).forEach((key: string) => {
      let list = pairs[key].map((w: string) => w.toLowerCase());;
      this.keypairs[key.toLowerCase()] = list;
    });
  }

  public setMetatags = (arg: string): void => {
    let list = JSON.parse(arg);
    this.clearArray(this._metatags);
    list.forEach((w: string) => this._metatags.push(w));
    this.initTokenizer();
    worker.postMessage({ type: MessageType.SetMetatags, data: this.metatags });
  }

  public setImports = (arg: string): void => {
    worker.postMessage({ type: MessageType.SetImports, data: arg });
  }

  public setSoundHint = (arg: string): void => {
    this._soundHint = arg;
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
    worker.postMessage({ type: MessageType.SetVariables, data: this.variables });
  }

  public setStepList = (list: string, clear: boolean = false): void => {
    if (clear) this.clearObject(this.steps);
    JSON.parse(list).forEach((e: VanessaStep) => {
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
    worker.postMessage({ type: MessageType.SetStepList, data: this.steps });
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

  public constructor(locale: string) {
    this._locale = locale;
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

  public provideCodeActions(model: monaco.editor.ITextModel
    , range: monaco.Range
    , context: monaco.languages.CodeActionContext
    , token: monaco.CancellationToken
  ): monaco.languages.ProviderResult<monaco.languages.CodeActionList> {
    const errors = [];
    context.markers.forEach((e, index) => {
      if (e.severity === monaco.MarkerSeverity.Error) {
        const value = model.getLineContent(e.endLineNumber);
        errors.push({ index, value });
      }
    });
    if (errors.length == 0) return undefined;
    const message = {
      type: MessageType.GetCodeActions,
      versionId: model.getVersionId(),
      uri: model.uri.toString(),
      data: errors
    };
    return postMessage<any>(model as VanessaModel, message).then(msg => {
      const actions: Array<monaco.languages.CodeAction> = [];
      msg.forEach((e, i) => {
        const marker = context.markers[e.index];
        const lineNumber = marker.endLineNumber;
        const range = new monaco.Range(lineNumber, e.startColumn, lineNumber, e.endColumn);
        actions.push({
          title: e.text,
          diagnostics: [marker],
          kind: "quickfix",
          edit: {
            edits: [{
              resource: model.uri,
              edit: { range, text: e.text }
            }]
          },
          isPreferred: i === 0
        });
      });
      return { actions, dispose: () => { } };
    });
  }

  public provideFoldingRanges(
    model: monaco.editor.ITextModel,
    context: monaco.languages.FoldingContext,
    token: monaco.CancellationToken,
  ): monaco.languages.ProviderResult<monaco.languages.FoldingRange[]> {
    return postMessage<monaco.languages.FoldingRange[]>(
      model as VanessaModel,
      {
        type: MessageType.GetCodeFolding,
        tabSize: model.getOptions().tabSize,
        versionId: model.getVersionId(),
        uri: model.uri.toString()
      });
  }

  public provideLinks(model: monaco.editor.ITextModel, token: monaco.CancellationToken)
    : monaco.languages.ProviderResult<monaco.languages.ILinksList> {
    return postMessage<monaco.languages.ILinksList>(
      model as VanessaModel,
      {
        type: MessageType.GetHiperlinks,
        versionId: model.getVersionId(),
        uri: model.uri.toString()
      });
  }

  public getLinkData(model: monaco.editor.ITextModel, key: string)
    : Promise<any> {
    return postMessage<monaco.languages.ILinksList>(
      model as VanessaModel,
      {
        key: key,
        type: MessageType.GetLinkData,
        versionId: model.getVersionId(),
        uri: model.uri.toString()
      });
  }

  public provideHover(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ): monaco.languages.ProviderResult<monaco.languages.Hover> {
    return postMessage<monaco.languages.Hover>(
      model as VanessaModel,
      {
        type: MessageType.GetLineHover,
        line: model.getLineContent(position.lineNumber),
        lineNumber: position.lineNumber,
        minColumn: model.getLineMinColumn(position.lineNumber),
        maxColumn: model.getLineMaxColumn(position.lineNumber),
        versionId: model.getVersionId(),
        uri: model.uri.toString()
      });
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
  ): monaco.languages.ProviderResult<monaco.languages.CompletionList> {
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
    let result: Array<monaco.languages.CompletionItem> = [];
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
      return { suggestions: result };
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
      return postMessage<monaco.languages.CompletionList>(
        model as VanessaModel,
        {
          type: MessageType.GetCompletions,
          keyword: keyword,
          range: range
        });
    }
  }

  public resolveCompletionItem(item, token) {
    return item;
  }

  public checkSyntax(model: monaco.editor.ITextModel) {
    if (model.getModeId() != "turbo-gherkin") return;
    return postMessage<monaco.editor.IMarkerData[]>(
      model as VanessaModel,
      {
        type: MessageType.CheckSyntax,
        versionId: model.getVersionId(),
        uri: model.uri.toString()
      }
    ).then(problems => monaco.editor.setModelMarkers(model, "syntax", problems));
  }

  private tokenizer: ITokenizationSupport;

  public initTokenizer() {
    let lang = new GherkinLanguage(this);
    if (this.tokenizer) this.tokenizer.dispose();
    this.tokenizer = createTokenizationSupport(
      StaticServices.modeService.get(),
      StaticServices.standaloneThemeService.get(),
      language.id,
      compile(language.id, lang),
    );
  }

  public getInitialState(): monaco.languages.IState {
    return this.tokenizer.getInitialState();
  }

  public tokenize(line: string, state: monaco.languages.IState): monaco.languages.ILineTokens {
    let words = this.splitWords(line);
    let keyword = this.findKeyword(words);
    if (keyword) {
      if (words.length > keyword.length) {
        let keypair = this.keypairs[keyword.join(" ")] || [];
        let lastnum = words.length - 1;
        let lastword = words[lastnum].toLowerCase();
        if (keypair.some((w: string) => w == lastword)) {
          let regexp = new RegExp(lastword + "\\s*$");
          let match = line.toLowerCase().match(regexp);
          if (match) {
            let length = match[0].length;
            line = line.substring(0, match.index);
            for (let i = 0; i < length; ++i) line += "҂";
          }
        }
      }
    }
    let tokens = [];
    let result = this.tokenizer.tokenize(line, false, state, 0);
    result.tokens.forEach((t: monaco.Token) => tokens.push({ startIndex: t.offset, scopes: t.type }));
    return { tokens: tokens, endState: result.endState };
  }

  public logTokens(model: monaco.editor.ITextModel) {
    let tokenizationSupport = TokenizationRegistry.get("turbo-gherkin");
    if (tokenizationSupport) {
      var state = tokenizationSupport.getInitialState();
      let lineCount = model.getLineCount();
      for (var lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
        let line: string = model.getLineContent(lineNumber);
        var tokenizationResult = tokenizationSupport.tokenize(line, state, 0);
        state = tokenizationResult.endState;
        console.log(lineNumber, state.stack.state, tokenizationResult.tokens);
      }
    };
  }
}
