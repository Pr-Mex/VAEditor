import * as monaco from "monaco-editor";

import "./languages/turbo-gherkin.contribution";

import { BreakpointManager, RuntimeProcessManager } from "./debug";
import { ProblemManager } from "./problems";

export enum VanessaEditorEvent {
  UPDATE_BREAKPOINTS = "UPDATE_BREAKPOINTS",
  CONTENT_DID_CHANGE = "CONTENT_DID_CHANGE",
  POSITION_DID_CHANGE = "POSITION_DID_CHANGE",
  CHANGE_UNDO_REDO = "CHANGE_UNDO_REDO",
  ON_KEY_DOWN = "ON_KEY_DOWN",
  ON_KEY_UP = "ON_KEY_UP",
}

export interface VanessaEditorMessage {
  type: VanessaEditorEvent;
  data: any;
}

export interface VanessaCommandItem {
  eventId: string;
  keyCode: string;
  keyMod: Array<string>;
  script: string;
}

export class VanessaEditor {

  // 1C:Enterprise interaction call.
  public undo: Function;
  public redo: Function;
  public addCommands: Function;
  public checkSyntax: Function;
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
  public toggleBreakpoint: Function;
  public showMessage: Function;
  public fireEvent: Function;

  public editor: monaco.editor.IStandaloneCodeEditor;
  public useKeyboardTracer: boolean;

  private breakpointManager: BreakpointManager;
  private runtimeProcessManager: RuntimeProcessManager;
  private problemManager: ProblemManager;
  private syntaxTimer: any = 0;

  private messages: Array<VanessaEditorMessage>;
  private initialVersion: number;
  private currentVersion: number;
  private lastVersion: number;

  constructor(content: string, language: string) {
    this.editor = monaco.editor.create(document.getElementById("VanessaEditor"), {
      language: language,
      scrollBeyondLastLine: false,
      glyphMargin: true,
      automaticLayout: true,
      lightbulb: { enabled: true }
    });
    this.messages = [];
    this.editor.setValue(content);
    this.resetHistory();

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
    this.toggleBreakpoint = () => this.breakpointManager.toggleBreakpoint(this.editor.getPosition().lineNumber);
    this.showMessage = (arg: string) => this.editor.getContribution('editor.contrib.messageController')["showMessage"](arg, this.getPosition());
    this.setContent = (arg: string) => {
      this.editor.setValue(arg);
      this.resetHistory();
      this.fireEvent(VanessaEditorEvent.CHANGE_UNDO_REDO, { undo: false, redo: false })
    };
    this.fireEvent = (event: VanessaEditorEvent, arg: any = undefined) => {
      // tslint:disable-next-line: no-console
      console.debug("fireEvent: " + event + " : " + arg);
      this.messages.push({ type: event, data: arg });
      let fakeButtonFireClickEvent: HTMLButtonElement = document.getElementById("VanessaEditorEventForwarder") as HTMLButtonElement;
      fakeButtonFireClickEvent.click();
    }
    this.addCommands = (arg: string) => {
      let list: Array<VanessaCommandItem> = JSON.parse(arg);
      list.forEach((e: any) => {
        let keybinding: number = Number(monaco.KeyCode[e.keyCode]);
        e.keyMod.forEach((id: string) => keybinding |= Number(monaco.KeyMod[id]));
        this.editor.addCommand(keybinding, () => eval.apply(null, [
          `VanessaEditor.fireEvent("${e.eventId}", VanessaEditor.getPosition().lineNumber)`, e.script
        ]));
      });
    }
    window["commandIdQuickFix"] = this.editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.F8, () => alert('Create new step!'));
  }

  public dispose(): void {
    this.editor.dispose();
  }

  private resetHistory() {
    this.initialVersion = this.editor.getModel().getAlternativeVersionId();
    this.currentVersion = this.initialVersion;
    this.lastVersion = this.initialVersion;
  }

  private subscribeEditorEvents(): void {

    this.editor.onDidChangeModelContent(
      () => this.fireEvent(VanessaEditorEvent.CONTENT_DID_CHANGE)
    );

    this.editor.onDidChangeCursorPosition(
      (e: monaco.editor.ICursorPositionChangedEvent) => {
        this.fireEvent(VanessaEditorEvent.POSITION_DID_CHANGE, { lineNumber: e.position.lineNumber, column: e.position.column })
      }
    );

    this.editor.onMouseDown(e => this.breakpointManager.breakpointOnMouseDown(e));
    this.editor.onMouseMove(e => this.breakpointManager.breakpointsOnMouseMove(e));
    this.editor.onKeyDown(e => {if (this.useKeyboardTracer) this.fireEvent(VanessaEditorEvent.ON_KEY_DOWN, e)});
    this.editor.onKeyUp(e => {if (this.useKeyboardTracer) this.fireEvent(VanessaEditorEvent.ON_KEY_UP, e)});

    const model: monaco.editor.ITextModel = this.editor.getModel();

    model.onDidChangeDecorations(() => this.breakpointManager.breakpointOnDidChangeDecorations());

    this.checkSyntax = () => {
      clearTimeout(this.syntaxTimer);
      this.syntaxTimer = setTimeout(() => {
        window["VanessaGherkinProvider"].checkSyntax();
      }, 1000);
    }

    this.checkSyntax();

    this.editor.onDidChangeModelContent(() => {
      this.checkSyntax();
      const versionId = this.editor.getModel().getAlternativeVersionId();
      let buttons = { undo: true, redo: true, version: versionId };
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
