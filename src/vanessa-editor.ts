import { ActionManager } from "./actions";
import { ProblemManager } from "./problems";
import { RuntimeManager } from "./runtime";
import { StyleManager } from "./style";
import { SyntaxManager } from "./syntax";

export class VanessaEditor {

  // 1C:Enterprise interaction call.
  public getContent = (codeWidget: number = 0) => this.runtimeManager.getContent(codeWidget);
  public setContent = (arg: string) => { this.runtimeManager.clear(); this.editor.setValue(arg); }
  public undo = () => this.editor.trigger('undo…', 'undo', undefined);
  public redo = () => this.editor.trigger('undo…', 'redo', undefined);
  public popMessage = () => this.actionManager.popMessage();
  public getLineContent = (lineNumber: number, codeWidget: number = 0) => this.runtimeManager.getLineContent(lineNumber, codeWidget);
  public getLineWidgets = (lineNumber: number) => JSON.stringify(this.runtimeManager.getLineWidgets(lineNumber));
  public getWidgetLine = (codeWidget: string) => this.runtimeManager.getWidgetLine(codeWidget);
  public getSelectedContent = () => this.editor.getModel().getValueInRange(this.editor.getSelection());
  public getPosition = () => this.runtimeManager.position;
  public getSelection = () => this.runtimeManager.selection;
  public setPosition = (lineNumber: number, column: number, codeWidget: string = "") => this.runtimeManager.position = {lineNumber: lineNumber, column: column, codeWidget: codeWidget};
  public setSelection = (startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number) => this.editor.setSelection(new monaco.Range(startLineNumber, startColumn, endLineNumber, endColumn));
  public setReadOnly = (arg: boolean) => this.editor.updateOptions({ readOnly: arg });
  public setTheme = (arg: string) => monaco.editor.setTheme(arg);
  public revealLine = (lineNumber: number, codeWidget: string = "") => this.runtimeManager.revealLine(lineNumber, codeWidget);
  public setRuntimeProgress = (status: string, lines: any, widget: number = 0) => this.runtimeManager.setStatus(status, lines, widget);
  public getRuntimeProgress = (status: string) => this.runtimeManager.getStatus(status);
  public getCurrentProgress = () => this.runtimeManager.getCurrent();
  public setCurrentProgress = (lineNumber: number, codeWidget: string = "") => this.runtimeManager.setCurrent(lineNumber, codeWidget);
  public showRuntimeError = (lineNumber: number, codeWidget: number, data: string, text: string) => this.runtimeManager.showError(lineNumber, codeWidget, data, text);
  public showRuntimeCode = (lineNumber: number, text: string) => this.runtimeManager.showCode(lineNumber, text);
  public setSubcodeFolding = (lineNumber: number, codeWidget: string, collapsed: boolean) => this.runtimeManager.setFolding(lineNumber, codeWidget, collapsed);
  public setLineStyle = (lines: any, widget: number = 0, bold: boolean, italic: boolean, underline: boolean) => this.runtimeManager.setStyle(lines, widget, bold, italic, underline);
  public clearLinesStyle = () => this.runtimeManager.clearStyle();
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
  public insertText = (text: string, arg: string = undefined) => this.actionManager.insertText(text, arg);
  public fireEvent = (event: any, arg: any = undefined) => this.actionManager.fireEvent(event, arg);
  public setSuggestWidgetWidth = (arg: any) => this.actionManager.setSuggestWidgetWidth(arg);
  public showMessage = (arg: string) => this.editor.getContribution('editor.contrib.messageController')["showMessage"](arg, this.getPosition());
  public onErrorLink = (e: HTMLElement) => this.fireEvent(e.dataset.id, e.parentElement.dataset.value);
  public checkSyntax = () => this.syntaxManager.checkSyntax();

  get errorLinks() { return this.actionManager.errorLinks; }
  get traceKeyboard(): boolean { return this.actionManager.traceKeyboard; }
  set traceKeyboard(value: boolean) { this.actionManager.traceKeyboard = value; }

  public editor: monaco.editor.IStandaloneCodeEditor;
  public actionManager: ActionManager;
  public runtimeManager: RuntimeManager;
  public problemManager: ProblemManager;
  public syntaxManager: SyntaxManager;
  public styleManager: StyleManager;

  constructor(content: string, language: string) {
    this.editor = monaco.editor.create(document.getElementById("VanessaEditor"), {
      language: language,
      scrollBeyondLastLine: false,
      glyphMargin: true,
      automaticLayout: true,
      lightbulb: { enabled: true }
    });
    this.editor.setValue(content);
    this.editor.getModel().updateOptions({insertSpaces: false});
    this.runtimeManager = new RuntimeManager(this);
    this.problemManager = new ProblemManager(this.editor);
    this.actionManager = new ActionManager(this.editor)
    this.syntaxManager = new SyntaxManager(this.editor);
    this.styleManager = new StyleManager(this.editor);
  }

  public dispose(): void {
    this.runtimeManager.dispose();
    this.problemManager.dispose();
    this.actionManager.dispose();
    this.syntaxManager.dispose();
    this.styleManager.dispose();
    this.editor.dispose();
  }
}
