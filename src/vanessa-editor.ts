import * as monaco from "monaco-editor";

import "./languages/turbo-gherkin.contribution";

import { RuntimeProcessManager } from "./debug";
import { ActionManager } from "./actions";
import { ProblemManager } from "./problems";
import { SyntaxManager } from "./syntax";
import { Entry } from "webpack";

export class VanessaEditor {

  // 1C:Enterprise interaction call.
  public setContent = (arg: string) => this.editor.setValue(arg);
  public getContent = (codeWidget: number = 0) => this.runtimeProcessManager.getContent(codeWidget);
  public undo = () => this.editor.trigger('undo…', 'undo', undefined);
  public redo = () => this.editor.trigger('undo…', 'redo', undefined);
  public popMessage = () => this.actionManager.popMessage();
  public getLineContent = (lineNumber: number, codeWidget: number = 0) => this.runtimeProcessManager.getLineContent(lineNumber, codeWidget);
  public getSelectedContent = () => this.editor.getModel().getValueInRange(this.editor.getSelection());
  public getPosition = () => this.editor.getPosition();
  public getSelection = () => this.editor.getSelection();
  public setPosition = (lineNumber: number, column: number) => this.editor.setPosition({ lineNumber: lineNumber, column: column });
  public setSelection = (startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number) => this.editor.setSelection(new monaco.Range(startLineNumber, startColumn, endLineNumber, endColumn));
  public setReadOnly = (arg: boolean) => this.editor.updateOptions({ readOnly: arg });
  public setTheme = (arg: string) => monaco.editor.setTheme(arg);
  public revealLine = (arg: number) => this.editor.revealLine(arg);
  public setRuntimeProgress = (status: string, lines: any, widget: number = 0) => this.runtimeProcessManager.setStatus(status, lines, widget);
  public getRuntimeProgress = (status: string) => this.runtimeProcessManager.getStatus(status);
  public getCurrentProgress = () => this.runtimeProcessManager.getCurrent();
  public setCurrentProgress = (lineNumber: number, codeWidget: number = 0) => this.runtimeProcessManager.setCurrent(lineNumber, codeWidget);
  public showRuntimeError = (lineNumber: number, codeWidget: number, data: string, text: string) => this.runtimeProcessManager.showError(lineNumber, codeWidget, data, text);
  public showRuntimeCode = (lineNumber: number, text: string) => this.runtimeProcessManager.showCode(lineNumber, text);
  public setRuntimeUnderline = (status: string, lines: any, widget: number = 0) => this.runtimeProcessManager.setUnderline(status, lines, widget);
  public nextRuntimeProgress = () => this.runtimeProcessManager.next();
  public clearRuntimeCodes = () => this.runtimeProcessManager.clearSubcode();
  public clearRuntimeErrors = () => this.runtimeProcessManager.clearErrors();
  public clearRuntimeStatus = () => this.runtimeProcessManager.clearStatus();
  public clearRuntimeUnderline = () => this.runtimeProcessManager.clearUnderline();
  public clearRuntimeProgress = () => this.runtimeProcessManager.clear();
  public decorateBreakpoints = (arg: string) => this.runtimeProcessManager.breakpoints = JSON.parse(arg);
  public setBreakpoints = (arg: string) => this.runtimeProcessManager.breakpoints = JSON.parse(arg);
  public getBreakpoints = (arg: string) => JSON.stringify(this.runtimeProcessManager.breakpoints);
  public decorateProblems = (arg: string) => this.problemManager.problems = JSON.parse(arg);
  public toggleBreakpoint = () => this.runtimeProcessManager.toggleBreakpoint(this.editor.getPosition().lineNumber);
  public getActions = () => JSON.stringify(this.actionManager.actions);
  public addCommands = (arg: string) => this.actionManager.addCommands(JSON.parse(arg));
  public insertText = (text: string, arg: string = undefined) => this.actionManager.insertText(text, arg);
  public fireEvent = (event: any, arg: any = undefined) => this.actionManager.fireEvent(event, arg);
  public setSuggestWidgetWidth = (arg: any) => this.actionManager.setSuggestWidgetWidth(arg);
  public showMessage = (arg: string) => this.editor.getContribution('editor.contrib.messageController')["showMessage"](arg, this.getPosition());
  public onErrorLink = (e: HTMLElement) => this.fireEvent(e.dataset.id, e.parentElement.dataset.value);
  public checkSyntax = () => this.syntaxManager.checkSyntax();

  public editor: monaco.editor.IStandaloneCodeEditor;
  private runtimeProcessManager: RuntimeProcessManager;
  private problemManager: ProblemManager;
  private actionManager: ActionManager;
  private syntaxManager: SyntaxManager;

  constructor(content: string, language: string) {
    this.editor = monaco.editor.create(document.getElementById("VanessaEditor"), {
      language: language,
      scrollBeyondLastLine: false,
      glyphMargin: true,
      automaticLayout: true,
      lightbulb: { enabled: true }
    });
    this.editor.setValue(content);
    this.runtimeProcessManager = new RuntimeProcessManager(this);
    this.problemManager = new ProblemManager(this.editor);
    this.actionManager = new ActionManager(this.editor)
    this.syntaxManager = new SyntaxManager(this.editor);
  }

  public dispose(): void {
    this.editor.dispose();
  }

  public get errorLinks() {
    return this.actionManager.errorLinks;
  }
}
