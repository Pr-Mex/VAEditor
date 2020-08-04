import * as monaco from "monaco-editor";

import "./languages/turbo-gherkin/contribution";

import { RuntimeManager } from "./runtime";
import { ProblemManager } from "./problems";

export enum VanessaDiffEditorEvent {
  START_DEBUGGING = "START_DEBUGGING",
  START_DEBUGGING_AT_STEP = "START_DEBUGGING_AT_STEP",
  START_DEBUGGING_AT_STEP_AND_CONTINUE = "START_DEBUGGING_AT_STEP_AND_CONTINUE",
  START_DEBUGGING_AT_ENTRY = "START_DEBUGGING_AT_ENTRY",
  UPDATE_BREAKPOINTS = "UPDATE_BREAKPOINTS",
  STEP_OVER = "STEP_OVER",
  CONTENT_DID_CHANGE = "CONTENT_DID_CHANGE"
}

export class VanessaDiffEditor {

  public editor: monaco.editor.IStandaloneDiffEditor;
  private runtimeProcessManager: RuntimeManager;
  private problemManager: ProblemManager;

  constructor(original: string, modified: string, language: string) {
    this.editor = monaco.editor.createDiffEditor(document.getElementById("VanessaEditor"), {
      scrollBeyondLastLine: false,
      glyphMargin: true,
      automaticLayout: true
    });

    this.editor.setModel({
      original: monaco.editor.createModel(original, language),
      modified: monaco.editor.createModel(modified, language),
    });
  }

  public dispose(): void {
    this.editor.dispose();
  }

  public fireEvent(event: string, arg: any = undefined): void {
    // tslint:disable-next-line: no-console
    console.debug("fireEvent: " + event + " : " + arg);
    let fakeButtonFireClickEvent: HTMLButtonElement = document.getElementById("VanessaEditorEventForwarder") as HTMLButtonElement;
    fakeButtonFireClickEvent.title = event;
    fakeButtonFireClickEvent.value = arg;
    fakeButtonFireClickEvent.click();
  }

  public setValue = (oldValue: string, oldFile: string, newValue: string, newFile: string) => {
    this.editor.setModel({
      original: monaco.editor.createModel(oldValue, undefined, monaco.Uri.file(oldFile)),
      modified: monaco.editor.createModel(newValue, undefined, monaco.Uri.file(newFile)),
    });
  }
}
