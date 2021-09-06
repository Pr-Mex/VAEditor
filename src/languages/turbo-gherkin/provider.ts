import { createTokenizationSupport } from 'monaco-editor/esm/vs/editor/standalone/common/monarch/monarchLexer';
import { StaticServices } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices';
import { TokenizationRegistry, ITokenizationSupport } from 'monaco-editor/esm/vs/editor/common/modes';
import { compile } from 'monaco-editor/esm/vs/editor/standalone/common/monarch/monarchCompile';
import { language, GherkinLanguage } from './configuration';
import { MessageType, IVanessaModel } from './common';
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

function postMessage<T>(model: IVanessaModel, message: any)
  : Promise<T> {
  const versionId = model.getVersionId();
  if (model.workerVersionId !== versionId) {
    model.workerVersionId = versionId;
    worker.postMessage({
      type: MessageType.UpdateModel,
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
  worker.postMessage({ type: MessageType.DeleteModel, uri: uri.toString() });
}

export class VanessaGherkinProvider {

  public static get instance(): VanessaGherkinProvider { return window["VanessaGherkinProvider"]; }
  public get errorLinks(): any { return this._errorLinks; }
  public get keypairs(): any { return this._keypairs; }

  protected _metatags: string[] = ["try", "except", "попытка", "исключение"];
  protected _keypairs: any = { };
  protected _errorLinks = [];
  protected _matcher: KeywordMatcher;
  protected _locale: string;

  public get metatags(): string[] {
    return this._metatags;
  }

  public get locale(): string {
    return this._locale;
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
    this.initTokenizer();
  }

  public setKeypairs = (arg: string): void => {
    let pairs = JSON.parse(arg);
    this.clearObject(this.keypairs);
    Object.keys(pairs).forEach((key: string) => {
      let list = pairs[key].map((w: string) => w.toLowerCase());;
      this.keypairs[key.toLowerCase()] = list;
    });
    worker.postMessage({ type: MessageType.SetKeypairs, data: this.keypairs });
  }

  public setMetatags = (arg: string): void => {
    let list = JSON.parse(arg);
    this.clearArray(this._metatags);
    list.forEach((w: string) => this._metatags.push(w));
    this.initTokenizer();
    worker.postMessage({ type: MessageType.SetMetatags, data: this.metatags });
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
    const message = {
      type: MessageType.GetCodeActions,
      versionId: model.getVersionId(),
      uri: model.uri.toString(),
      errors: errors,
    };
    return postMessage<VAQuickAction[]>(model as IVanessaModel, message).then(msg => {
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
    return postMessage<monaco.languages.FoldingRange[]>(
      model as IVanessaModel,
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
      model as IVanessaModel,
      {
        type: MessageType.GetHiperlinks,
        versionId: model.getVersionId(),
        uri: model.uri.toString()
      });
  }

  public getLinkData(model: monaco.editor.ITextModel, key: string)
    : Promise<any> {
    return postMessage<monaco.languages.ILinksList>(
      model as IVanessaModel,
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
      model as IVanessaModel,
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

  public provideCompletionItems(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ): monaco.languages.ProviderResult<monaco.languages.CompletionList> {
    return postMessage<monaco.languages.CompletionList>(
      model as IVanessaModel,
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

  public checkSyntax(model: monaco.editor.ITextModel) {
    if (model.getModeId() != language.id) return;
    return postMessage<monaco.editor.IMarkerData[]>(
      model as IVanessaModel,
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
    let words = this.matcher.splitWords(line);
    let keyword = this.matcher.findKeyword(words);
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
