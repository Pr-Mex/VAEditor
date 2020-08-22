import * as monaco from "monaco-editor";
import "./languages/bsl/contribution";
import "./languages/turbo-gherkin/contribution";
import { IVanessaEditor, EventsManager, createModel, VanessaEditorEvent } from "./common";
import { VanessaEditor } from "./vanessa-editor";
import { VanessaTabs } from "./vanessa-tabs";

export class VanessaDiffEditor implements IVanessaEditor {

  private static standaloneInstance: VanessaDiffEditor;
  public editor: monaco.editor.IStandaloneDiffEditor;
  public eventsManager: EventsManager;

  public static createStandalone(
    original: string = "",
    modified: string = "",
    language: string = "turbo-gherkin",
  ) {
    if (this.standaloneInstance) return this.standaloneInstance;
    VanessaEditor.disposeStandalone();
    VanessaTabs.disposeStandalone();
    const model = {
      original: monaco.editor.createModel(original, language),
      modified: monaco.editor.createModel(modified, language),
    };
      return this.standaloneInstance = new VanessaDiffEditor(model);
  }

  public static getStandalone() { return this.standaloneInstance; }

  public static disposeStandalone() {
    if (this.standaloneInstance) {
      this.standaloneInstance.dispose();
      this.standaloneInstance = null;
    }
  }

  constructor(model: monaco.editor.IDiffEditorModel, readOnly: boolean = false) {
    let node = document.getElementById("VanessaEditorContainer");
    this.editor = monaco.editor.createDiffEditor(node, {
      originalEditable: !readOnly,
      scrollBeyondLastLine: false,
      glyphMargin: true,
      automaticLayout: true,
    });
    this.editor.setModel(model);
    this.eventsManager = new EventsManager(this);
  }

  public dispose(): void {
    if (VanessaDiffEditor.standaloneInstance === this) VanessaDiffEditor.standaloneInstance = null;
    this.eventsManager.dispose();
    this.editor.dispose();
  }

  public setValue = (oldValue: string, oldFile: string, newValue: string, newFile: string) => {
    this.editor.setModel({
      original: createModel(oldValue, oldFile),
      modified: createModel(newValue, newFile),
    });
  }

  public popMessage = () => EventsManager.popMessage();
  public onFileSave = () => this.fireEvent(VanessaEditorEvent.PRESS_CTRL_S, this.getModel());
  public fireEvent = (event: any, arg: any = undefined) => this.eventsManager.fireEvent(event, arg);
  public setReadOnly = (arg: boolean) => this.editor.updateOptions({ readOnly: arg });
  public setSideBySide = (value: boolean) => this.editor.updateOptions({ renderSideBySide: value });
  public setTheme = (theme: string) => monaco.editor.setTheme(theme);
  public getModel = () => this.editor.getModifiedEditor().getModel();
  public domNode = () => this.editor["_containerDomElement"];
}
