import { createTokenizationSupport } from 'monaco-editor/esm/vs/editor/standalone/common/monarch/monarchLexer';
import { StaticServices } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices';
import { TokenizationRegistry, ITokenizationSupport } from 'monaco-editor/esm/vs/editor/common/modes';
import { compile } from 'monaco-editor/esm/vs/editor/standalone/common/monarch/monarchCompile';
import { MessageType, IVanessaModel, ISyntaxDecorations, WorkerMessage, ISyntaxManager } from './common';
import { language, GherkinLanguage } from './configuration';
import { VanessaEditor } from "../../vanessa-editor";
import { IVanessaAction } from "../../common";
import { KeywordMatcher } from './matcher';
import { ActionManager } from '../../actions';
import { VACodeError, VAQuickAction } from './quickfix';

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

function postMessage<T>(mod: monaco.editor.ITextModel, message: WorkerMessage)
  : Promise<T> {
  if (mod) {
    const model = mod as IVanessaModel;
    const versionId = model.getVersionId();
    if (model.workerVersionId !== versionId) {
      model.workerVersionId = versionId;
      worker.postMessage({
        type: MessageType.UpdateModel,
        content: model.getLinesContent(),
        tabSize: model.getOptions().tabSize,
        uri: model.uri.toString(),
        versionId: versionId,
      });
    }
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
  worker.postMessage({ type: MessageType.DeleteModel, uri: uri.toString() });
}

export class VanessaGherkinProvider {

  public static get instance(): VanessaGherkinProvider { return window["VanessaGherkinProvider"]; }
  public get errorLinks(): any { return this._errorLinks; }
  public get keypairs(): any { return this._keypairs; }

  private _metatags: string[] = ["try", "except", "попытка", "исключение"];
  private _directives: string[] = [];
  private _keypairs: any = {};
  private _errorLinks = [];
  private _sppr: boolean = false;
  private _matcher: KeywordMatcher;
  private _locale: string;

  public get metatags(): string[] {
    return this._metatags;
  }

  public get locale(): string {
    return this._locale;
  }

  public get directives(): string[] {
    return this._directives;
  }

  public setErrorLinks = (arg: string): void => {
    const commands = JSON.parse(arg)
    this.clearArray(this.errorLinks);
    commands.forEach((e: IVanessaAction) => {
      this.errorLinks.push(e);
    });
  }

  public get matcher() { return this._matcher; }

  public setKeywords = (arg: string): void => {
    worker.postMessage({ type: MessageType.SetKeywords, data: arg });
    this._matcher = new KeywordMatcher(arg);
    this.matcher.setKeypairs(this.keypairs);
    this.matcher.setMetatags(this.metatags);
    this.initTokenizer();
  }

  public setKeypairs = (arg: string): void => {
    this._keypairs = {};
    let data = JSON.parse(arg);
    Object.keys(data).forEach((key: string) =>
      this.keypairs[key.toLowerCase()] = data[key].map((w: string) => w.toLowerCase())
    );
    this.matcher?.setKeypairs(this.keypairs);
    worker.postMessage({ type: MessageType.SetKeypairs, data: this.keypairs });
  }

  public setMetatags = (arg: string): void => {
    this._metatags = [];
    let list = JSON.parse(arg);
    list.forEach((w: string) => this._metatags.push(w));
    this.matcher?.setMetatags(this.metatags);
    this.initTokenizer();
    worker.postMessage({ type: MessageType.SetMetatags, data: this.metatags });
  }

  public setDirectives = (arg: string): void => {
    this._directives = [];
    let list = JSON.parse(arg);
    list.forEach((w: string) => this._directives.push(w));
    this.matcher?.setDirectives(this.directives);
    worker.postMessage({ type: MessageType.SetDirectives, data: this.directives });
  }

  public setSPPR = (arg: boolean): void => {
    this._sppr = arg;
    this.matcher?.setSPPR(arg);
  }

  public setMessages = (arg: string): void => {
    worker.postMessage({ type: MessageType.SetMessages, data: arg });
  }

  public setImports = (arg: string): void => {
    worker.postMessage({ type: MessageType.SetImports, data: arg });
  }

  public setElements = (values: string, clear: boolean = false): void => {
    worker.postMessage({ type: MessageType.SetElements, values, clear });
  }

  public setVariables = (values: string, clear: boolean = false): void => {
    worker.postMessage({ type: MessageType.SetVariables, values, clear });
  }

  public setStepList = (list: string, clear: boolean = false): void => {
    worker.postMessage({ type: MessageType.SetSteplist, list, clear });
    VanessaEditor.checkAllSyntax();
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

  public setSuggestWidgetWidth = (arg: any) => ActionManager.setSuggestWidgetWidth(arg);

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
    const errors: VACodeError[] = [];
    context.markers.forEach((e, index) => {
      if (e.severity === monaco.MarkerSeverity.Error) {
        errors.push({ index, value: model.getLineContent(e.endLineNumber) });
      }
    });
    if (errors.length == 0) return undefined;
    const message: WorkerMessage = {
      type: MessageType.GetCodeActions,
      versionId: model.getVersionId(),
      uri: model.uri.toString(),
      errors: errors,
    };
    return postMessage<VAQuickAction[]>(model, message).then(msg => {
      const actions: Array<monaco.languages.CodeAction> = [];
      msg.forEach((e, i) => {
        const marker = context.markers[e.index];
        const lineNumber = marker.endLineNumber;
        const range = new monaco.Range(lineNumber, e.startColumn, lineNumber, e.endColumn);
        actions.push({
          title: e.label,
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
    return postMessage<monaco.languages.FoldingRange[]>(model, {
      type: MessageType.GetCodeFolding,
      versionId: model.getVersionId(),
      uri: model.uri.toString(),
    });
  }

  public provideLinks(model: monaco.editor.ITextModel, token: monaco.CancellationToken)
    : monaco.languages.ProviderResult<monaco.languages.ILinksList> {
    return postMessage<monaco.languages.ILinksList>(model, {
      type: MessageType.GetHiperlinks,
      versionId: model.getVersionId(),
      uri: model.uri.toString(),
    });
  }

  public getLinkData(model: monaco.editor.ITextModel, key: string)
    : Promise<any> {
    return postMessage<monaco.languages.ILinksList>(model, {
      type: MessageType.GetLinkData,
      versionId: model.getVersionId(),
      uri: model.uri.toString(),
      key: key,
    });
  }

  public provideHover(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ): monaco.languages.ProviderResult<monaco.languages.Hover> {
    return postMessage<monaco.languages.Hover>(model, {
      type: MessageType.GetLineHover,
      versionId: model.getVersionId(),
      uri: model.uri.toString(),
      lineNumber: position.lineNumber,
      minColumn: model.getLineMinColumn(position.lineNumber),
      maxColumn: model.getLineMaxColumn(position.lineNumber),
    });
  }

  public provideCompletionItems(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ): monaco.languages.ProviderResult<monaco.languages.CompletionList> {
    return postMessage<monaco.languages.CompletionList>(
      undefined,
      {
        type: MessageType.GetCompletions,
        line: model.getLineContent(position.lineNumber),
        lineNumber: position.lineNumber,
        column: position.column
      });
  }

  public resolveCompletionItem(item, token) {
    return item;
  }

  public checkSyntax(m: monaco.editor.ITextModel, manager?: ISyntaxManager) {
    const model = m as IVanessaModel;
    if (model.getLanguageId() != language.id) return;
    return postMessage<ISyntaxDecorations>(model, {
      type: MessageType.CheckSyntax,
      versionId: model.getVersionId(),
      uri: model.uri.toString(),
    }).then(result => {
      const oldDecorations = model.stepDecorations || [];
      model.stepDecorations = model.deltaDecorations(oldDecorations, result.decorations);
      monaco.editor.setModelMarkers(model, "syntax", result.problems);
      if (manager) {
        manager.setImages(result.images);
      } else {
        model.testedImages = result.images;
      }
    });
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
    var BreakException = {};
    try {
      this.matcher.keypairs.forEach(regexp => {
        const match = line.match(regexp);
        if (match === null) return;
        const length = line.length;
        line = line.substring(0, match[1].length);
        for (let i = line.length; i < length; ++i) line += "҂";
        throw BreakException;
      })
    } catch (e) {
      if (e !== BreakException) throw e;
    }
    let tokens = [];
    let result = this.tokenizer.tokenize(line, true, state, 0);
    result.tokens.forEach((t: monaco.Token) => tokens.push({ startIndex: t.offset, scopes: t.type }));
    return { tokens: tokens, endState: result.endState };
  }

  public logTokens(model: monaco.editor.ITextModel) {
    const tokenizationSupport = TokenizationRegistry.get(language.id);
    if (tokenizationSupport) {
      const lineCount = model.getLineCount();
      let state = tokenizationSupport.getInitialState();
      for (var lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
        const line = model.getLineContent(lineNumber);
        const tokenizationResult = tokenizationSupport.tokenize(line, true, state, 0);
        state = tokenizationResult.endState;
        console.log(lineNumber, state.stack.state, tokenizationResult.tokens);
      }
    };
  }
}
