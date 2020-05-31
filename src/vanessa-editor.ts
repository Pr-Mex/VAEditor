import * as monaco from "monaco-editor";

import "./languages/turbo-gherkin.contribution";

import { BreakpointManager, RuntimeProcessManager } from "./debug";
import { ProblemManager } from "./problems";

export enum VanessaEditorEvent {
  START_DEBUGGING = "START_DEBUGGING",
  START_DEBUGGING_AT_STEP = "START_DEBUGGING_AT_STEP",
  START_DEBUGGING_AT_STEP_AND_CONTINUE = "START_DEBUGGING_AT_STEP_AND_CONTINUE",
  START_DEBUGGING_AT_ENTRY = "START_DEBUGGING_AT_ENTRY",
  UPDATE_BREAKPOINTS = "UPDATE_BREAKPOINTS",
  STEP_OVER = "STEP_OVER",
  CONTENT_DID_CHANGE = "CONTENT_DID_CHANGE",
  POSITION_DID_CHANGE = "POSITION_DID_CHANGE",
  CHANGE_UNDO_REDO = "CHANGE_UNDO_REDO",
}

export interface VanessaEditorMessage {
  type: VanessaEditorEvent;
  data: any;
}

export class VanessaEditor {

  // 1C:Enterprise interaction call.
  public undo: Function;
  public redo: Function;
  public popMessage: Function;
  public getContent: Function;
  public getLineContent: Function;
  public getPosition: Function;
  public setContent: Function;
  public setPosition: Function;
  public setReadOnly: Function;
  public setTheme: Function;
  public revealLine: Function;
  public decorateBreakpoints: Function;
  public decorateCompleteSteps: Function;
  public decorateCurrentStep: Function;
  public decorateErrorSteps: Function;
  public decorateProblems: Function;
  public cleanRuntimeProcess: Function;

  public editor: monaco.editor.IStandaloneCodeEditor;
  private breakpointManager: BreakpointManager;
  private runtimeProcessManager: RuntimeProcessManager;
  private problemManager: ProblemManager;
  private syntaxTimer: any = 0;

  private messages: Array<VanessaEditorMessage>;
  private initialVersion;
  private currentVersion;
  private lastVersion;

  constructor(content: string, language: string) {
    this.editor = monaco.editor.create(document.getElementById("VanessaEditor"), {
      language: language,
      scrollBeyondLastLine: false,
      glyphMargin: true,
      automaticLayout: true
    });
    this.messages = [];
    this.editor.setValue(content);
    this.initialVersion = this.editor.getModel().getAlternativeVersionId();
    this.currentVersion = this.initialVersion;
    this.lastVersion = this.initialVersion;

    this.breakpointManager = new BreakpointManager(this);
    this.runtimeProcessManager = new RuntimeProcessManager(this);
    this.problemManager = new ProblemManager(this);
    this.subscribeEditorEvents();

    this.undo = () => this.editor.trigger('undo…', 'undo', undefined);
    this.redo = () => this.editor.trigger('undo…', 'redo', undefined);
    this.popMessage = () => this.messages.shift();
    this.getContent = () => this.editor.getValue();
    this.getLineContent = (num: number) => this.editor.getModel().getLineContent(num);
    this.getPosition = () => this.editor.getPosition();
    this.setContent = (arg: string) => this.editor.setValue(arg);
    this.setPosition = (lineNumber: number, column: number) => this.editor.setPosition({ lineNumber: lineNumber, column: column });
    this.setReadOnly = (arg: boolean) => this.editor.updateOptions({ readOnly: arg });
    this.setTheme = (arg: string) => monaco.editor.setTheme(arg);
    this.revealLine = (arg: number) => this.editor.revealLine(arg);
    this.decorateBreakpoints = (arg: string) => this.breakpointManager.DecorateBreakpoints(JSON.parse(arg));
    this.decorateCurrentStep = (arg: number) => this.runtimeProcessManager.DecorateCurrentStep(arg);
    this.decorateCompleteSteps = (arg: string) => this.runtimeProcessManager.DecorateCompleteSteps(JSON.parse(arg));
    this.decorateErrorSteps = (arg: string) => this.runtimeProcessManager.DecorateErrorSteps(JSON.parse(arg));
    this.decorateProblems = (arg: string) => this.problemManager.DecorateProblems(JSON.parse(arg));
    this.cleanRuntimeProcess = () => this.runtimeProcessManager.CleanDecorates();
  }

  public dispose(): void {
    this.editor.dispose();
  }

  public fireEvent(event: VanessaEditorEvent, arg: any = undefined): void {
    // tslint:disable-next-line: no-console
    console.debug("fireEvent: " + event + " : " + arg);
    this.messages.push({ type: event, data: arg });
    let fakeButtonFireClickEvent: HTMLButtonElement = document.getElementById("VanessaEditorEventForwarder") as HTMLButtonElement;
    fakeButtonFireClickEvent.click();
  }

  private subscribeEditorEvents(): void {
    this.editor.addCommand(monaco.KeyCode.F5,
      () => this.fireEvent(VanessaEditorEvent.START_DEBUGGING)
    );

    // tslint:disable-next-line: no-bitwise
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.F5,
      () => this.fireEvent(VanessaEditorEvent.START_DEBUGGING_AT_STEP, this.editor.getPosition().lineNumber)
    );

    // tslint:disable-next-line: no-bitwise
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.F5,
      () => this.fireEvent(VanessaEditorEvent.START_DEBUGGING_AT_STEP_AND_CONTINUE, this.editor.getPosition().lineNumber));

    // tslint:disable-next-line: no-bitwise
    this.editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.F5,
      () => this.fireEvent(VanessaEditorEvent.START_DEBUGGING_AT_ENTRY)
    );

    this.editor.addCommand(monaco.KeyCode.F11,
      () => this.fireEvent(VanessaEditorEvent.STEP_OVER, this.editor.getPosition().lineNumber)
    );

    this.editor.onDidChangeModelContent(
      () => this.fireEvent(VanessaEditorEvent.CONTENT_DID_CHANGE)
    );

    this.editor.onDidChangeCursorPosition(
      (e: monaco.editor.ICursorPositionChangedEvent) => {
        this.fireEvent(VanessaEditorEvent.POSITION_DID_CHANGE, { lineNumber: e.position.lineNumber, column: e.position.column })
      }
    );

    this.editor.addCommand(monaco.KeyCode.F9,
      () => this.breakpointManager.toggleBreakpoint(this.editor.getPosition().lineNumber)
    );

    this.editor.onMouseDown(e => this.breakpointManager.breakpointOnMouseDown(e));

    this.editor.onMouseMove(e => this.breakpointManager.breakpointsOnMouseMove(e));

    const model: monaco.editor.ITextModel = this.editor.getModel();

    model.onDidChangeDecorations(() => this.breakpointManager.breakpointOnDidChangeDecorations());

    this.editor.onDidChangeModelContent(() => {
      clearTimeout(this.syntaxTimer);
      this.syntaxTimer = setTimeout(() => {
        window["VanessaGherkinProvider"].checkSyntax();
      }, 1000);
    });

    this.editor.onDidChangeModelContent(() => {
      const versionId = this.editor.getModel().getAlternativeVersionId();
      let buttons = {undo: true, redo: true, version: versionId};
      if (versionId < this.currentVersion) {
        if (versionId === this.initialVersion) buttons.undo = false;
      } else {
        // redoing
        if (versionId <= this.lastVersion) {
          // redoing the last change
          if (versionId == this.lastVersion) buttons.redo = false;
        } else { // adding new change, disable redo when adding new changes
          buttons.redo = false;
          if (this.currentVersion > this.lastVersion) this.lastVersion = this.currentVersion;
        }
      }
      this.currentVersion = versionId;
      this.fireEvent(VanessaEditorEvent.CHANGE_UNDO_REDO, buttons)
    });
  }
}
