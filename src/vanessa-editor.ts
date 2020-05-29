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
  CONTENT_DID_CHANGE = "CONTENT_DID_CHANGE"
}

export class VanessaEditor {

  public SendAction: Function; // 1C:Enterprise interaction call.

  public editor: monaco.editor.IStandaloneCodeEditor;
  private breakpointManager: BreakpointManager;
  private runtimeProcessManager: RuntimeProcessManager;
  private problemManager: ProblemManager;

  constructor(content: string, language: string) {
    this.editor = monaco.editor.create(document.getElementById("VanessaEditor"), {
      language: language,
      scrollBeyondLastLine: false,
      glyphMargin: true,
      automaticLayout: true
    });

    this.editor.setValue(content);

    this.breakpointManager = new BreakpointManager(this);
    this.runtimeProcessManager = new RuntimeProcessManager(this);
    this.problemManager = new ProblemManager(this);
    this.subscribeEditorEvents();

    this.SendAction = (action: string, arg: string) => this.onReceiveActionHandler(action, arg);
  }

  public dispose(): void {
    this.editor.dispose();
  }

  public fireEvent(event: string, arg: any=undefined): void {
    // tslint:disable-next-line: no-console
    console.debug("fireEvent: " + event + " : " + arg);

    let fakeButtonFireClickEvent: HTMLButtonElement = document.getElementById("VanessaEditorEventForwarder") as HTMLButtonElement;
    fakeButtonFireClickEvent.title = event;
    fakeButtonFireClickEvent.value = arg;
    fakeButtonFireClickEvent.click();
  }

  private onReceiveActionHandler(action: string, arg: string): any {
    // tslint:disable-next-line: no-console
    console.debug("OnReceiveAction: " + action + " : " + arg);

    switch (action) {
      case "setTheme":
        monaco.editor.setTheme(arg);
        return undefined;
      case "setContent":
        this.editor.setValue(arg);
        return undefined;
      case "getContent":
        return this.editor.getValue();
      case "revealLine":
        this.editor.revealLine(Number.parseInt(arg, 10));
        return undefined;
      case "enableEdit":
        this.editor.updateOptions({
          readOnly: false
        });
        return undefined;
      case "disableEdit":
        this.editor.updateOptions({
          readOnly: true
        });
        return undefined;
      case "decorateBreakpoints":
        this.breakpointManager.DecorateBreakpoints(JSON.parse(arg));
        return undefined;
      case "decorateCurrentStep":
        this.runtimeProcessManager.DecorateCurrentStep(Number.parseInt(arg, 10));
        return undefined;
      case "decorateCompleteSteps":
        this.runtimeProcessManager.DecorateCompleteSteps(JSON.parse(arg));
        return undefined;
      case "decorateErrorSteps":
        this.runtimeProcessManager.DecorateErrorSteps(JSON.parse(arg));
        return undefined;
      case "cleanDecorateRuntimeProgress":
        this.runtimeProcessManager.CleanDecorates();
        return undefined;
      case "decorateProblems":
          this.problemManager.DecorateProblems(JSON.parse(arg));
          return undefined;
      default:
    }
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

    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_Z,
      () => this.editor.trigger('undo…', 'undo', undefined)
    );

    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_Y,
      () => this.editor.trigger('redo…', 'redo', undefined)
    );

    this.editor.addCommand(monaco.KeyCode.F9,
      () => this.breakpointManager.toggleBreakpoint(this.editor.getPosition().lineNumber)
    );

    this.editor.onMouseDown(e => this.breakpointManager.breakpointOnMouseDown(e));

    this.editor.onMouseMove(e => this.breakpointManager.breakpointsOnMouseMove(e));

    const model: monaco.editor.ITextModel = this.editor.getModel();

    model.onDidChangeDecorations(() => this.breakpointManager.breakpointOnDidChangeDecorations());
  }
}
