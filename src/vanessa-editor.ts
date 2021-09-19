import { IVanessaEditor, EventsManager, createModel, VanessaEditorEvent, disposeModel, VAEditorType } from "./common";
import { language as gherkin } from './languages/turbo-gherkin/configuration'
import { ActionManager } from "./actions";
import { ProblemManager } from "./problems";
import { RuntimeManager } from "./runtime";
import { StyleManager } from "./style";
import { SyntaxManager } from "./syntax";
import { VanessaTabs } from "./vanessa-tabs";
import { VanessaDiffEditor } from "./vanessa-diff-editor";
import { VanessaGherkinProvider } from "./languages/turbo-gherkin/provider";
import * as dom from 'monaco-editor/esm/vs/base/browser/dom';

const $ = dom.$;

export class VanessaEditor implements IVanessaEditor {

  // 1C:Enterprise interaction call.
  public popMessage = () => EventsManager.popMessage();
  public setTheme = (arg: string) => StyleManager.theme = arg;
  public setValue = (value: string, filename: string) => { this.runtimeManager.clear(); this.editor.setModel(createModel(value, filename)); }
  public getContent = (codeWidget: string = "") => this.runtimeManager.getContent(codeWidget);
  public setContent = (arg: string) => { this.runtimeManager.clear(); this.editor.setValue(arg); }
  public trigger = (source: string, handlerId: string, payload: any = undefined) => this.editor.trigger(source, handlerId, payload);
  public getLineContent = (lineNumber: number, codeWidget: string = "") => this.runtimeManager.getLineContent(lineNumber, codeWidget);
  public getLineWidgets = (lineNumber: number) => JSON.stringify(this.runtimeManager.getLineWidgets(lineNumber));
  public getWidgets = () => JSON.stringify(this.runtimeManager.getWidgets());
  public getWidgetLine = (codeWidget: string) => this.runtimeManager.getWidgetLine(codeWidget);
  public getSelectedContent = () => this.editor.getModel().getValueInRange(this.editor.getSelection());
  public getPosition = () => this.runtimeManager.position;
  public getSelection = () => this.runtimeManager.selection;
  public setPosition = (lineNumber: number, column: number, codeWidget: string = "") => this.runtimeManager.position = { lineNumber: lineNumber, column: column, codeWidget: codeWidget };
  public setSelection = (startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number) => this.editor.setSelection(new monaco.Range(startLineNumber, startColumn, endLineNumber, endColumn));
  public selectSubcodeLine = (codeWidget: string, lineNumber: number) => this.runtimeManager.selectSubcodeLine(codeWidget, lineNumber);
  public setReadOnly = (arg: boolean) => this.editor.updateOptions({ readOnly: arg });
  public revealLine = (lineNumber: number, codeWidget: string = "") => this.runtimeManager.revealLine(lineNumber, codeWidget);
  public revealLineInCenter = (lineNumber: number, codeWidget: string = "") => this.runtimeManager.revealLineInCenter(lineNumber, codeWidget);
  public setRuntimeProgress = (status: string, lines: any, widget: string = "", inline = null) => this.runtimeManager.setStatus(status, lines, widget, inline);
  public getRuntimeProgress = (status: string) => this.runtimeManager.getStatus(status);
  public getCurrentProgress = () => this.runtimeManager.getCurrent();
  public setCurrentProgress = (lineNumber: number, codeWidget: string = "") => this.runtimeManager.setCurrent(lineNumber, codeWidget);
  public showRuntimeError = (lineNumber: number, codeWidget: string, data: string, text: string) => this.runtimeManager.showError(lineNumber, codeWidget, data, text);
  public showRuntimeCode = (lineNumber: number, text: string) => this.runtimeManager.showCode(lineNumber, text);
  public setSubcodeFolding = (lineNumber: number, codeWidget: string, collapsed: boolean) => this.runtimeManager.setFolding(lineNumber, codeWidget, collapsed);
  public setLineStyle = (lines: any, widget: string = "", bold: boolean, italic: boolean, underline: boolean) => this.runtimeManager.setStyle(lines, widget, bold, italic, underline);
  public setStackStatus = (status: boolean, lineNumber: number) => this.runtimeManager.setStack(status, lineNumber);
  public getStackStatus = (lineNumber: number) => this.runtimeManager.getStack(lineNumber);
  public clearLinesStyle = () => this.runtimeManager.clearStyle();
  public clearStackStatus = () => this.runtimeManager.clearStack();
  public nextRuntimeProgress = () => this.runtimeManager.next();
  public clearRuntimeCodes = () => this.runtimeManager.clearSubcode();
  public clearRuntimeErrors = () => this.runtimeManager.clearErrors();
  public clearRuntimeStatus = () => this.runtimeManager.clearStatus();
  public clearRuntimeProgress = () => this.runtimeManager.clear();
  public decorateBreakpoints = (arg: string) => this.runtimeManager.breakpoints = JSON.parse(arg);
  public setBreakpoints = (arg: string) => this.runtimeManager.breakpoints = JSON.parse(arg);
  public getBreakpoints = (arg: string) => JSON.stringify(this.runtimeManager.breakpoints);
  public decorateProblems = (arg: string) => this.problemManager.problems = JSON.parse(arg);
  public toggleBreakpoint = (lineNumber: number = 0, codeWidget: string = "") => this.runtimeManager.toggleBreakpoint(lineNumber, codeWidget);
  public getActions = () => JSON.stringify(this.actionManager.actions);
  public addCommands = (arg: string) => this.actionManager.addCommands(JSON.parse(arg));
  public setLineCodicon = (arg: string, codicon: string) => this.actionManager.setCodicon(arg, codicon);
  public getLineCodicon = (lineNumber: number) => this.actionManager.getCodicon(lineNumber);
  public clearCodicons = () => this.actionManager.clearCodicons();
  public insertText = (text: string, arg: string = undefined) => this.actionManager.insertText(text, arg);
  public fireEvent = (event: any, arg: any = undefined) => this.eventsManager.fireEvent(event, arg);
  public setSuggestWidgetWidth = (arg: any) => ActionManager.setSuggestWidgetWidth(arg);
  public getSyntaxErrors = () => JSON.stringify(this.syntaxManager.errors);
  public showMinimap = (value: boolean) => this.editor.updateOptions({ minimap: { enabled: value } });
  public useDebugger = (value: boolean) => this.runtimeManager.useDebugger = value;
  public getModel = () => this.editor.getModel();
  public domNode = () => this._domNode;
  public setHoverDelay = (value: number) => this.editor.updateOptions({ hover: { enabled: true, sticky: true, delay: value } });
  public setTabSize = (arg: number) => this.editor.getModel().updateOptions({ tabSize: arg });
  public setInsertSpaces = (arg: boolean) => this.editor.getModel().updateOptions({ insertSpaces: arg });
  public setDetectIndentation = (arg: boolean) => this.editor.updateOptions({ detectIndentation: arg });
  public normalizeIndentation = () => this.syntaxManager.normalizeIndentation();

  public checkSyntax = () => { if (this.syntaxManager) this.syntaxManager.checkSyntax(); }
  public get enableSyntaxCheck(): boolean { return this.syntaxManager !== null; }
  public set enableSyntaxCheck(value: boolean) {
    if (value) {
      if (this.syntaxManager == null) {
        this.syntaxManager = new SyntaxManager(this.editor);
      }
    } else {
      if (this.syntaxManager != null) {
        this.syntaxManager.dispose();
        this.syntaxManager = null;
        const model = this.editor.getModel();
        monaco.editor.setModelMarkers(model, "syntax", []);
      }
    }
  }

  //@ts-ignore
  public showMessage = (arg: string) => this.editor.getContribution('editor.contrib.messageController').showMessage(arg, this.getPosition());

  get errorLinks() { return VanessaGherkinProvider.instance.errorLinks; }
  get traceKeyboard(): boolean { return this.actionManager.traceKeyboard; }
  set traceKeyboard(value: boolean) { this.actionManager.traceKeyboard = value; }

  private static standaloneInstance: VanessaEditor;
  public static useDebuggerDefault: boolean = false;
  public editor: monaco.editor.IStandaloneCodeEditor;
  public actionManager: ActionManager;
  public eventsManager: EventsManager;
  public runtimeManager: RuntimeManager;
  public problemManager: ProblemManager;
  public syntaxManager: SyntaxManager;
  public styleManager: StyleManager;
  private _domNode: HTMLElement;

  public static createStandalone(
    content: string = "",
    language: string = gherkin.id,
  ) {
    if (this.standaloneInstance) return this.standaloneInstance;
    VanessaDiffEditor.disposeStandalone();
    VanessaTabs.disposeStandalone();
    const model = monaco.editor.createModel(content, language);
    return this.standaloneInstance = new VanessaEditor(model);
  }

  public static getStandalone() { return this.standaloneInstance; }

  public static disposeStandalone() {
    if (this.standaloneInstance) {
      this.standaloneInstance.dispose();
      this.standaloneInstance = null;
    }
  }

  constructor(
    model: monaco.editor.ITextModel,
    readOnly: boolean = false,
    checkSyntax = true,
    options: monaco.editor.IEditorConstructionOptions = {
      renderWhitespace: "selection",
      glyphMargin: true,
      lightbulb: { enabled: true },
      minimap: { enabled: true },
    }
  ) {
    let container = document.getElementById("VanessaEditorContainer");
    this._domNode = $("div", { class: "vanessa-editor" });
    container.appendChild(this._domNode);
    const editorOptions = JSON.parse(JSON.stringify(options));
    editorOptions.model = model;
    editorOptions.readOnly = readOnly;
    editorOptions.detectIndentation = false;
    editorOptions.insertSpaces = false;
    editorOptions.useShadowDOM = false;
    editorOptions.contextmenu = false;
    editorOptions.automaticLayout = true;
    this.editor = monaco.editor.create(this._domNode, editorOptions);
    this.editor.getModel().updateOptions({ insertSpaces: false });
    this.runtimeManager = new RuntimeManager(this);
    this.actionManager = new ActionManager(this);
    this.eventsManager = new EventsManager(this);
    this.problemManager = new ProblemManager(this.editor);
    this.styleManager = new StyleManager(this.editor);
    if (checkSyntax) this.syntaxManager = new SyntaxManager(this.editor);
    VanessaEditor.editors.push(this);
  }

  public dispose(): void {
    if (VanessaEditor.standaloneInstance === this) VanessaEditor.standaloneInstance = null;
    const index = VanessaEditor.editors.indexOf(this);
    if (index >= 0) VanessaEditor.editors.splice(index, 1);
    const model = this.editor.getModel();
    this.runtimeManager.dispose();
    this.problemManager.dispose();
    this.actionManager.dispose();
    this.syntaxManager.dispose();
    this.styleManager.dispose();
    this.editor.dispose();
    disposeModel(model);
  }

  public static findModel(model: monaco.editor.ITextModel): boolean {
    return this.editors.some(e => e.editor.getModel() === model);
  }

  public resetModel() {
    const newModel = monaco.editor.createModel('');
    const oldModel = this.getModel();
    this.editor.setModel(newModel);
    disposeModel(oldModel);
  };

  public set options(value: string) {
    this.editor.updateOptions(JSON.parse(value));
  }

  public get type() { return VAEditorType.CodeEditor; }
  public focus() { this.editor.focus(); }
  static editors: Array<VanessaEditor> = [];
  public onFileSave = () => this.fireEvent(VanessaEditorEvent.PRESS_CTRL_S, this.getModel());
  static checkAllSyntax = () => VanessaEditor.editors.forEach(e => {
    if (e.syntaxManager) VanessaGherkinProvider.instance.checkSyntax(e.editor.getModel())
  });
}
