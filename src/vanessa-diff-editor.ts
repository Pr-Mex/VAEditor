import * as monaco from "monaco-editor";
import "./languages/bsl/contribution";
import "./languages/turbo-gherkin/contribution";
import { EventsManager } from "./common";

export class VanessaDiffEditor {

  public editor: monaco.editor.IStandaloneDiffEditor;
  public eventsManager: EventsManager;

  constructor(original: string, modified: string, language: string) {
    let node = document.getElementById("VanessaEditorContainer");
    this.editor = monaco.editor.createDiffEditor(node, {
      scrollBeyondLastLine: false,
      glyphMargin: true,
      automaticLayout: true
    });
    this.editor.setModel({
      original: monaco.editor.createModel(original, language),
      modified: monaco.editor.createModel(modified, language),
    });
    this.eventsManager = new EventsManager(this.editor);
    this.setVisible(true);
  }

  public dispose(): void {
    this.editor.dispose();
  }

  public setValue = (oldValue: string, oldFilename: string, newValue: string, newFilename: string) => {
    this.editor.setModel({
      original: this.eventsManager.createModel(oldValue, oldFilename),
      modified: this.eventsManager.createModel(newValue, newFilename),
    });
  }

  public fireEvent = (event: any, arg: any = undefined) => this.eventsManager.fireEvent(event, arg);
  public popMessage = () => this.eventsManager.popMessage();
  public setSideBySide = (value: boolean) => this.editor.updateOptions({ renderSideBySide: value });
  public setTheme = (theme: string) => monaco.editor.setTheme(theme);
  public setVisible = (value: boolean) => this.eventsManager.show("monaco-diff-editor", value);
}
