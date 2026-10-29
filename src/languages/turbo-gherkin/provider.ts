import { createTokenizationSupport } from 'monaco-editor/esm/vs/editor/standalone/common/monarch/monarchLexer';
import { StaticServices } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices';
import { TokenizationRegistry, ITokenizationSupport } from 'monaco-editor/esm/vs/editor/common/modes';
import { compile } from 'monaco-editor/esm/vs/editor/standalone/common/monarch/monarchCompile';
import { MessageType, IVanessaModel, ISyntaxDecorations, WorkerMessage, ISyntaxManager, ISpprDirect } from './common';
import { process } from './worker';
import { language, GherkinLanguage } from './configuration';
import { VanessaEditor } from "../../vanessa-editor";
import { IVanessaAction } from "../../common";
import { KeywordMatcher } from './matcher';
import { ActionManager } from '../../actions';
import { VACodeError, VAQuickAction } from './quickfix';
import { workerUrl, setWorkerDelivery } from '../../worker-source';

// Воркер встраивается в страницу как base64 (InlineWorkerSourcePlugin):
// отдельный файл рядом со страницей встроенный WebKit/WebView2 по file://
// не загружает. Из встроенной строки собираются blob- и data-URL.
const WORKER_ASSET = 'gherkin-worker.js';

type WorkerMode = 'blob' | 'data' | 'none';

function workerUrlFor(mode: WorkerMode): string {
  return workerUrl(WORKER_ASSET, mode);
}

function nextWorkerMode(mode: WorkerMode): WorkerMode {
  if (mode === 'blob') return 'data';
  return 'none';
}

let workerMessageId = 0;
const messageMap = new Map<number, any>();

// Воркер может оказаться недоступен любым способом: политика WebView может
// запретить и blob, и data. Тогда запросы провайдера повисли бы навсегда,
// поэтому держим копию сообщений и переигрываем их в главном потоке — логика
// в worker.ts чистая функция и от окружения воркера не зависит. Это аварийный
// режим: он теряет многопоточность.
const WORKER_TIMEOUT = 3000;
// Первый ответ ждём короче: если воркер мёртв, нельзя съедать весь таймаут
// теста (в mocha по умолчанию 2 с).
const PROBE_TIMEOUT = 800;
let workerAnswered = false;
let workerAlive = true;
let workerMode: WorkerMode = 'blob';
let worker: Worker = null;
const replay: WorkerMessage[] = [];

// Диагностика для отчёта: нужно понять, воркер вообще стартовал или молчит.
export const workerDiagnostics: string[] = [];
(window as any).VAWorkerDiagnostics = workerDiagnostics;

function flushPending() {
  const pending = Array.from(messageMap.entries());
  messageMap.clear();
  pending.forEach(([, item]) => {
    try { item.resolve(runLocally(item.message)); }
    catch (e) { item.reject(e); }
  });
}

// Повторная отправка в новый воркер: сначала состояние моделей, потом
// запросы, которые всё ещё ждут ответа.
function resend() {
  replay.forEach(message => worker.postMessage(message));
  messageMap.forEach(item => worker.postMessage(item.message));
}

// Переход на следующий способ доставки. Ложь — способы кончились, остаётся
// главный поток.
function switchWorker(from: WorkerMode): boolean {
  const next = nextWorkerMode(from);
  if (next === 'none') return false;
  const target = startWorker(next);
  if (!target) return switchWorker(next);
  workerDiagnostics.push('воркер (' + from + ') недоступен — пробую ' + next);
  worker = target;
  workerMode = next;
  // Monaco создаёт свои воркеры лениво: сообщаем ему проверенный способ.
  setWorkerDelivery(next);
  resend();
  return true;
}

function onWorkerFailure(mode: WorkerMode, text: string) {
  workerDiagnostics.push('worker.onerror (' + mode + '): ' + text);
  if (switchWorker(mode)) return;
  workerAlive = false;
  workerMode = 'none';
  flushPending();
}

function attach(target: Worker, mode: WorkerMode) {
  target.onmessage = function (e) {
    workerAnswered = true;
    const msg = e.data;
    const promise = msg.id && messageMap.get(msg.id);
    if (promise) {
      messageMap.delete(msg.id);
      if (msg.success) {
        promise.resolve(msg.data);
      } else {
        // Ошибку воркера видно только здесь: тест, у которого промис
        // отклонён без catch, просто висит до таймаута mocha.
        workerDiagnostics.push('воркер вернул ошибку: ' + String(msg.data).slice(0, 500));
        promise.reject(msg.data);
      }
    }
  };
  target.onerror = function (e: ErrorEvent) {
    // Пустое сообщение — типичный признак запрета загрузки скрипта, поэтому
    // печатаем и место: оно отличает «исходника нет в странице» от «политика
    // не пустила».
    const place = e && e.filename ? ' ' + e.filename + ':' + e.lineno + ':' + e.colno : '';
    onWorkerFailure(mode, ((e && e.message) || 'без текста') + place);
  };
}

function startWorker(mode: WorkerMode): Worker {
  try {
    const url = workerUrlFor(mode);
    if (!url) throw new Error('исходник воркера не встроен в страницу (window.__VAWorkerSources)');
    const target = new Worker(url);
    attach(target, mode);
    return target;
  } catch (e) {
    workerDiagnostics.push('воркер (' + mode + ') не создан: ' + ((e && e.message) || e));
    return null;
  }
}

worker = startWorker('blob');
if (!worker && !switchWorker('blob')) {
  workerAlive = false;
  workerMode = 'none';
}

function isRequest(type: MessageType): boolean {
  switch (type) {
    case MessageType.GetCodeFolding:
    case MessageType.GetCodeActions:
    case MessageType.GetHiperlinks:
    case MessageType.GetLineHover:
    case MessageType.GetLinkData:
    case MessageType.GetCompletions:
    case MessageType.CheckSyntax:
      return true;
  }
  return false;
}

function remember(message: WorkerMessage) {
  if (isRequest(message.type)) return;
  if (message.type === MessageType.UpdateModel) {
    // От модели нужно только последнее состояние.
    const index = replay.findIndex(m => m.type === MessageType.UpdateModel && m.uri === message.uri);
    if (index >= 0) replay.splice(index, 1);
  }
  replay.push(message);
}

function send(message: WorkerMessage) {
  remember(message);
  if (workerAlive) worker.postMessage(message);
  else process(message);
}

function runLocally<T>(message: WorkerMessage): T {
  const pending = replay.splice(0, replay.length);
  pending.forEach(m => process(m));
  const result: any = process(message);
  if (!result) return undefined;
  if (!result.success) throw new Error('Gherkin: запрос вернул пустой результат');
  return result.data as T;
}

function postMessage<T>(mod: monaco.editor.ITextModel, message: WorkerMessage)
  : Promise<T> {
  if (mod) {
    const model = mod as IVanessaModel;
    const versionId = model.getVersionId();
    if (model.workerVersionId !== versionId) {
      model.workerVersionId = versionId;
      send({
        type: MessageType.UpdateModel,
        content: model.getLinesContent(),
        tabSize: model.getOptions().tabSize,
        uri: model.uri.toString(),
        versionId: versionId,
      });
    }
  }

  if (!workerAlive) {
    return new Promise<T>((resolve, reject) => {
      try { resolve(runLocally<T>(message)); } catch (e) { reject(e); }
    });
  }

  const id = message.id = ++workerMessageId;
  const promise = new Promise<T>((resolve, reject) => {
    messageMap.set(id, { resolve, reject, message });
  });
  worker.postMessage(message);
  armTimeout(id, workerMode);
  return promise;
}

// Молчание воркера — тоже сбой. Сначала пробуем другой способ доставки
// (файл → blob), и только если он тоже молчит, уходим в главный поток.
function armTimeout(id: number, mode: WorkerMode) {
  const timeout = workerAnswered ? WORKER_TIMEOUT : PROBE_TIMEOUT;
  setTimeout(() => {
    if (!messageMap.has(id)) return;
    if (switchWorker(mode)) {
      // Новому способу доставки даём собственное окно ожидания.
      armTimeout(id, workerMode);
      return;
    }
    workerDiagnostics.push('воркер (' + mode + ') не ответил за ' + timeout + ' мс');
    workerAlive = false;
    workerMode = 'none';
    flushPending();
  }, timeout);
}

export function clearWorkerCache(uri: monaco.Uri) {
  send({ type: MessageType.DeleteModel, uri: uri.toString() });
}

export class VanessaGherkinProvider {

  public static get instance(): VanessaGherkinProvider { return window["VanessaGherkinProvider"]; }
  public get directives(): ISpprDirect { return this._directives; }
  public get errorLinks(): any { return this._errorLinks; }
  public get keypairs(): any { return this._keypairs; }

  private _metatags: string[] = ["try", "except", "попытка", "исключение"];
  private _directives: ISpprDirect = {};
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

  public setErrorLinks = (arg: string): void => {
    const commands = JSON.parse(arg)
    this.clearArray(this.errorLinks);
    commands.forEach((e: IVanessaAction) => {
      this.errorLinks.push(e);
    });
  }

  public get matcher() { return this._matcher; }

  public setKeywords = (arg: string): void => {
    send({ type: MessageType.SetKeywords, data: arg });
    this._matcher = new KeywordMatcher(arg);
    this.matcher.setKeypairs(this.keypairs);
    this.matcher.setMetatags(this.metatags);
    this.matcher.setSPPR(this._sppr);
    this.initTokenizer();
  }

  public setDirectives = (arg: string): void => {
    send({ type: MessageType.SetDirectives, data: arg });
    this._directives = JSON.parse(arg) as ISpprDirect;
    this.matcher?.setDirectives(this.directives);
  }

  public setKeypairs = (arg: string): void => {
    this._keypairs = {};
    let data = JSON.parse(arg);
    Object.keys(data).forEach((key: string) =>
      this.keypairs[key.toLowerCase()] = data[key].map((w: string) => w.toLowerCase())
    );
    this.matcher?.setKeypairs(this.keypairs);
    send({ type: MessageType.SetKeypairs, data: this.keypairs });
  }

  public setMetatags = (arg: string): void => {
    this._metatags = [];
    let list = JSON.parse(arg);
    list.forEach((w: string) => this._metatags.push(w));
    this.matcher?.setMetatags(this.metatags);
    this.initTokenizer();
    send({ type: MessageType.SetMetatags, data: this.metatags });
  }

  public setSPPR = (arg: boolean): void => {
    send({ type: MessageType.SetSPPR, sppr: arg });
    this._sppr = arg;
    this.matcher?.setSPPR(arg);
  }

  public setMessages = (arg: string): void => {
    send({ type: MessageType.SetMessages, data: arg });
  }

  public setImports = (arg: string): void => {
    send({ type: MessageType.SetImports, data: arg });
  }

  public setElements = (values: string, clear: boolean = false): void => {
    send({ type: MessageType.SetElements, values, clear });
  }

  public setVariables = (values: string, clear: boolean = false): void => {
    send({ type: MessageType.SetVariables, values, clear });
  }

  public setStepList = (list: string, clear: boolean = false): void => {
    send({ type: MessageType.SetSteplist, list, clear });
    VanessaEditor.checkAllSyntax();
  }

  public constructor(locale: string) {
    this._locale = locale;
    this.createTheme1C();
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
    if (model.getLanguageId() != language.id) return Promise.resolve();
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
