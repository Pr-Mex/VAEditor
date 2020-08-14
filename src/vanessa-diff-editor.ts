import * as monaco from "monaco-editor";
import "./languages/bsl/contribution";
import "./languages/turbo-gherkin/contribution";
import { IVAEditor, EventsManager, createModel } from "./common";
import { VanessaTabs } from "./tabs";

export class VanessaDiffEditor implements IVAEditor {

  public editor: monaco.editor.IStandaloneDiffEditor;
  public eventsManager: EventsManager;

  private constructor() {
    let node = document.getElementById("VanessaEditorContainer");
    this.editor = monaco.editor.createDiffEditor(node, {
      scrollBeyondLastLine: false,
      glyphMargin: true,
      automaticLayout: true,
    });
    this.eventsManager = new EventsManager(this.editor);
    this.setVisible(true);
  }

  public dispose(): void {
    this.editor.dispose();
  }

  public setValue = (oldValue: string, oldFile: string, newValue: string, newFile: string) => {
    this.editor.setModel({
      original: createModel(oldValue, oldFile),
      modified: createModel(newValue, newFile),
    });
  }

  public fireEvent = (event: any, arg: any = undefined) => this.eventsManager.fireEvent(event, arg);
  public popMessage = () => this.eventsManager.popMessage();
  public setReadOnly = (arg: boolean) => this.editor.updateOptions({ readOnly: arg });
  public setSideBySide = (value: boolean) => this.editor.updateOptions({ renderSideBySide: value });
  public setTheme = (theme: string) => monaco.editor.setTheme(theme);
  public setVisible = (value: boolean) => this.eventsManager.show(this.editor["_containerDomElement"], value);
  public hide = () => this.setVisible(false);
  public show = () => this.setVisible(true);

  private static instance: VanessaDiffEditor;

  public static get() {
    if (!this.instance) this.instance = new VanessaDiffEditor();
    return this.instance;
  }
}
