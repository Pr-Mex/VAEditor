import * as monaco from "monaco-editor";
import "./languages/bsl/contribution";
import "./languages/turbo-gherkin/contribution";
import { language as gherkin } from './languages/turbo-gherkin/configuration'
import { IVanessaEditor, EventsManager, createModel, VanessaEditorEvent, disposeModel } from "./common";
import { VanessaEditor } from "./vanessa-editor";
import { VanessaTabs } from "./vanessa-tabs";

export class VanessaDiffEditor implements IVanessaEditor {

  static editors: Array<VanessaDiffEditor> = [];
  private static standaloneInstance: VanessaDiffEditor;
  public navigator: monaco.editor.IDiffNavigator;
  public editor: monaco.editor.IStandaloneDiffEditor;
  public eventsManager: EventsManager;

  public static createStandalone(
    original: string = "",
    modified: string = "",
    language: string = gherkin.id,
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
      contextmenu: false,
      originalEditable: false,
      scrollBeyondLastLine: false,
      glyphMargin: true,
      automaticLayout: true,
      readOnly: readOnly,
      useShadowDOM: false,
    });
    this.editor.setModel(model);
    this.eventsManager = new EventsManager(this);
    this.navigator = monaco.editor.createDiffNavigator(this.editor);
    VanessaDiffEditor.editors.push(this);
  }

  public dispose(): void {
    if (VanessaDiffEditor.standaloneInstance === this) VanessaDiffEditor.standaloneInstance = null;
    const index = VanessaDiffEditor.editors.indexOf(this);
    if (index >= 0) VanessaDiffEditor.editors.splice(index, 1);
    const oe = this.editor.getOriginalEditor();
    const me = this.editor.getModifiedEditor();
    const original = oe ? oe.getModel() : null;
    const modified = me ? me.getModel() : null;
    this.eventsManager.dispose();
    this.navigator.dispose();
    this.editor.dispose();
    disposeModel(original);
    disposeModel(modified);
  }

  public resetModel() {
    const oe = this.editor.getOriginalEditor();
    const me = this.editor.getModifiedEditor();
    const original = oe ? oe.getModel() : null;
    const modified = me ? me.getModel() : null;
    this.editor.setModel({
      original: monaco.editor.createModel(''),
      modified: monaco.editor.createModel(''),
    });
    disposeModel(original);
    disposeModel(modified);
  };

  public setValue = (oldValue: string, oldFile: string, newValue: string, newFile: string) => {
    this.editor.setModel({
      original: createModel(oldValue, oldFile),
      modified: createModel(newValue, newFile),
    });
  }

  public static findModel(model: monaco.editor.ITextModel): boolean {
    return this.editors.some(e => {
      const original = e.editor.getOriginalEditor();
      if (original && original.getModel() === model) return true;
      const modified = e.editor.getModifiedEditor();
      if (modified && modified.getModel() === model) return true;
      return false;
    });
  }

  //@ts-ignore
  public domNode = () => this.editor._containerDomElement;
  public popMessage = () => EventsManager.popMessage();
  public onFileSave = () => this.fireEvent(VanessaEditorEvent.PRESS_CTRL_S, this.getModel());
  public fireEvent = (event: any, arg: any = undefined) => this.eventsManager.fireEvent(event, arg);
  public setReadOnly = (arg: boolean) => this.editor.updateOptions({ readOnly: arg });
  public setSideBySide = (value: boolean) => this.editor.updateOptions({ renderSideBySide: value });
  public setTheme = (theme: string) => monaco.editor.setTheme(theme);
  public getModel = () => this.editor.getModifiedEditor().getModel();
  public canNavigate = () => this.navigator.canNavigate();
  public previous = () => this.navigator.previous();
  public next = () => this.navigator.next();
  public focus() { this.editor.focus(); }
  public undo = () => (this.editor.getModifiedEditor()?.getModel() as any)?.undo();
  public redo = () => (this.editor.getModifiedEditor()?.getModel() as any)?.redo();
  public trigger = (source: string, handlerId: string, payload: any = undefined) => this.editor.trigger(source, handlerId, payload);
}
