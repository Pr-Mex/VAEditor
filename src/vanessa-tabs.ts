import * as dom from 'monaco-editor/esm/vs/base/browser/dom';
import { VanessaEditor } from "./vanessa-editor";
import { VanessaDiffEditor } from "./vanessa-diff-editor";
import { IVanessaEditor, createModel, VanessaEditorEvent, EventsManager, disposeModel } from "./common";
import { StaticServices } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices';

const $ = dom.$;

class VanessaTabItem {
  public editor: IVanessaEditor;
  private filename: string;
  private encoding: number;
  private owner: VanessaTabs;
  private domNode: HTMLElement;
  private domItem: HTMLElement;
  private domTitle: HTMLElement;
  private domClose: HTMLElement;

  constructor(
    owner: VanessaTabs,
    editor: IVanessaEditor,
    title: string,
    filename: string,
    encoding: number,
  ) {
    this.owner = owner;
    this.editor = editor;
    this.encoding = encoding;
    this.filename = filename;
    this.domNode = $(".vanessa-tab-box", {},
      this.domItem = $(".vanessa-tab-item", { title: title },
        this.domTitle = $(".vanessa-tab-title"),
        this.domClose = $(".vanessa-tab-close.codicon-close", { title: "Close" }),
      ));
    this.domItem.addEventListener("click", this.onClick.bind(this), true);
    this.domTitle.innerText = title;
    this.owner.domTabPanel.append(this.domNode);
    this.registerOnDidChangeContent();
    this.select();
  }

  public open(
    editor: IVanessaEditor,
    title: string,
    filename: string,
    encoding: number,
  ): VanessaTabItem {
    if (this.onChangeHandler) this.onChangeHandler.dispose();
    this.owner.hideEditor(this.editor);
    this.editor = editor;
    this.encoding = encoding;
    this.filename = filename;
    this.domTitle.innerText = title;
    this.domItem.setAttribute("title", title);
    this.registerOnDidChangeContent();
    return this;
  }

  private onChangeHandler: monaco.IDisposable;

  private registerOnDidChangeContent() {
    setTimeout(() => {
      const model = this.editor.getModel();
      this.onChangeHandler = model.onDidChangeContent(() => this.onModified());
      this.onModified();
    }, 500);
  }

  private onModified() {
    if (this.modified) {
      this.domClose.classList.remove('codicon-close');
      this.domClose.classList.add('codicon-circle-filled');
    } else {
      this.domClose.classList.remove('codicon-circle-filled');
      this.domClose.classList.add('codicon-close');
    }
  }

  private onClick(event: any) {
    if (event.target === this.domClose) {
      this.onClose();
    } else {
      this.onSelect();
    }
  }

  public onSelect() {
    this.select();
  }

  public onClose() {
    const data = this.getEventData();
    data["accept"] = () => this.close();
    EventsManager.fireEvent(this.editor, VanessaEditorEvent.ON_TAB_CLOSING, data);
  }

  public onFileSave() {
    const data = this.getEventData();
    const model = this.editor.getModel();
    data["accept"] = () => model.resetModified();
    EventsManager.fireEvent(this.editor, VanessaEditorEvent.PRESS_CTRL_S, data);
  }

  public select(): IVanessaEditor {
    const className = "vanessa-tab-select";
    this.domNode.parentElement.querySelectorAll("." + className).forEach(e => e.classList.remove(className));
    this.domNode.classList.add(className);
    this.domNode.scrollIntoView();
    let domEditor = this.editor.domNode();
    setTimeout(() => domEditor.parentElement.appendChild(domEditor), 100);
    const index = this.owner.tabStack.findIndex(e => e === this);
    if (index >= 0) this.owner.tabStack.splice(index, 1);
    this.owner.tabStack.push(this);
    EventsManager.fireEvent(this.editor, VanessaEditorEvent.ON_TAB_SELECT, this.getEventData());
    return this.editor;
  }

  private close() {
    const index = this.owner.tabStack.findIndex(e => e === this);
    if (index >= 0) this.owner.tabStack.splice(index, 1);
    const next = this.owner.tabStack.pop();
    if (next) next.select();
    this.dispose();
  }

  dispose() {
    this.owner.hideEditor(this.editor);
    if (this.onChangeHandler) this.onChangeHandler.dispose();
    if (this.owner.tabStack.length == 0) this.owner.disposeHidden();
    this.domNode.remove();
    this.editor = null;
    this.owner = null;
  }

  private getEventData() {
    return {
      tab: this,
      editor: this.editor,
      model: this.editor.getModel(),
      title: this.title,
      filename: this.filename,
      encoding: this.encoding,
      modified: this.modified,
    }
  }

  public get modified(): boolean {
    const model = this.editor.getModel();
    return model && model.isModified();
  }

  public get uri(): string {
    return this.editor.getModel().uri;
  }

  public get key(): string {
    return this.editor.getModel().uri.toString();
  }

  public get type(): string {
    return this.editor.editor.getEditorType();
  }

  public get title(): string {
    return this.domTitle.innerText;
  }

  public set title(value: string) {
    this.domTitle.innerText = value;
  }

  public getVersionId = () => {
    const model = this.editor.getModel();
    return model ? 0 : model.getVersionId();
  }

  public resetModified = () => {
    const model = this.editor.getModel();
    model.resetModified();
    this.onModified();
  }

  private rewriteModel(model: any) {
    model.pushEditOperations("save-file-as", [{
      text: this.editor.getModel().getValue(),
      range: model.getFullModelRange(),
      forceMoveMarkers: true,
    }]);
    model.pushStackElement();
  }

  public doSaveAs = (filepath: string, title: string) => {
    this.domTitle.innerText = title;
    const uri = monaco.Uri.parse(filepath);
    const oldKey = this.editor.getModel().uri.toString();
    const newKey = uri.toString();
    this.resetModified();
    if (oldKey === newKey) return;
    const tab = this.owner.tabStack.find((tab: VanessaTabItem) =>
      tab !== this && tab.type === "vs.editor.ICodeEditor"
      && tab.editor.editor.getModel().uri.toString() === newKey
    );
    if (tab) {
      this.rewriteModel(tab.editor.getModel());
      tab.encoding = this.encoding;
      tab.resetModified();
      tab.select();
      this.close();
      return;
    }
    const model = monaco.editor.getModel(uri);
    if (model) {
      this.rewriteModel(model);
      const oldModel = this.editor.getModel();
      this.editor.editor.setModel(model);
      disposeModel(oldModel);
    } else {
      this.editor.getModel()._associatedResource = uri;
      const service = StaticServices.modelService.get();
      const data = service._models[oldKey];
      delete service._models[oldKey];
      service._models[newKey] = data;
    }
    this.filename = filepath;
    this.resetModified();
  }

  public get dom(): HTMLElement {
    return this.domNode;
  }
}

export class VanessaTabs {

  private static standaloneInstance: VanessaTabs;
  public domContainer: HTMLElement;
  public domTabPanel: HTMLElement;
  public tabStack: Array<VanessaTabItem> = [];
  private hiddenEditors: Array<IVanessaEditor> = [];

  public static createStandalone() {
    if (this.standaloneInstance) return this.standaloneInstance;
    VanessaEditor.disposeStandalone();
    VanessaDiffEditor.disposeStandalone();
    return this.standaloneInstance = new VanessaTabs;
  }

  public static getStandalone() { return this.standaloneInstance; }

  public static disposeStandalone() {
    if (this.standaloneInstance) {
      this.standaloneInstance.dispose();
      this.standaloneInstance = null;
    }
  }

  private constructor() {
    this.domContainer = document.getElementById("VanessaTabsContainer");
    this.domContainer.classList.remove("vanessa-hidden");
    this.domTabPanel = $("div.vanessa-tab-panel");
    this.domContainer.append(this.domTabPanel);
  }

  public dispose() {
    if (VanessaTabs.standaloneInstance === this) VanessaTabs.standaloneInstance = null;
    while (this.tabStack.length) this.tabStack.pop().dispose();
    this.domContainer.classList.add("vanessa-hidden");
    this.domTabPanel.remove();
    this.disposeHidden();
  }

  public get current() {
    if (this.tabStack.length) return this.tabStack[this.tabStack.length - 1];
  }

  private key(original: string, modified: string = undefined) {
    return modified ? original + "\n" + modified : original;
  }

  public hideEditor(editor: IVanessaEditor) {
    editor.resetModel();
    this.hiddenEditors.push(editor);
    const domEditor = editor.domNode();
    domEditor.classList.add("vanessa-hidden");
  }

  public disposeHidden() {
    while (this.hiddenEditors.length) {
      this.hiddenEditors.pop().dispose();
    }
  }

  public find = (
    original: string = "",
    modified: string = "",
  ): IVanessaEditor => {
    const key = this.key(original, modified);
    let tab = this.tabStack.find(t => t.key === key);
    if (tab) return tab.select();
  }

  private open(
    editor: IVanessaEditor,
    title: string,
    filepath: string,
    encoding: number,
    newTab: boolean,
  ): IVanessaEditor {
    if (newTab || !this.current || this.current.modified) {
      new VanessaTabItem(this, editor, title, filepath, encoding);
    } else {
      this.current.open(editor, title, filepath, encoding);
    }
    return editor;
  }

  public edit = (
    content: string,
    filename: string,
    filepath: string,
    title: string,
    encoding: number = 0,
    readOnly: boolean = false,
    newTab: boolean = true,
  ): IVanessaEditor => {
    const uri = monaco.Uri.parse(filepath);
    const key = uri.toString();
    const tab = this.tabStack.find((tab: VanessaTabItem) =>
      tab.key === key && tab.type === "vs.editor.ICodeEditor"
    );
    if (tab) return tab.select();
    let model = monaco.editor.getModel(uri);
    if (!model) model = createModel(content, filename, uri);
    this.disposeHidden();
    const editor = new VanessaEditor(model, readOnly);
    return this.open(editor, title, filepath, encoding, newTab);
  }

  public diff = (
    oldContent: string,
    oldFileName: string,
    oldFilePath: string,
    newContent: string,
    newFileName: string,
    newFilePath: string,
    title: string,
    encoding: number = 0,
    readOnly: boolean = false,
    newTab: boolean = true,
  ) => {
    const originalKey = monaco.Uri.parse(oldFilePath).toString();
    const modifiedKey = monaco.Uri.parse(newFilePath).toString();
    const tab = this.tabStack.find((tab: VanessaTabItem) =>
      tab.type === "vs.editor.IDiffEditor"
      && tab.editor.editor.getModel().original.uri.toString() === originalKey
      && tab.editor.editor.getModel().modified.uri.toString() === modifiedKey
    );
    if (tab) return tab.select();
    const uriOriginal = monaco.Uri.parse(oldFilePath);
    const uriModified = monaco.Uri.parse(newFilePath);
    const diff: monaco.editor.IDiffEditorModel = {
      original: monaco.editor.getModel(uriOriginal),
      modified: monaco.editor.getModel(uriModified),
    };
    if (!diff.original) diff.original = createModel(oldContent, oldFileName, uriOriginal);
    if (!diff.modified) diff.modified = createModel(newContent, newFileName, uriModified);
    this.disposeHidden();
    const editor = new VanessaDiffEditor(diff, readOnly);
    return this.open(editor, title, newFilePath, encoding, newTab);
  }

  public onPageNext = (forward: boolean) => {
    const count = this.tabStack.length;
    if (count === 0) return;
    let index = 0;
    const delta = forward ? 1 : - 1;
    const selected = this.current.dom;
    this.domTabPanel.childNodes.forEach((n, i) => {
      if (n === selected) index = (i + delta + count) % count;
    });
    let next = undefined;
    this.domTabPanel.childNodes.forEach((n, i) => {
      if (index === i) next = n;
    });
     this.tabStack.find(t => t.dom === next).select();
  }

  public onFileSave = () => {
    const tab = this.current;
    if (tab) tab.onFileSave();
  }

  public static useDebugger = (value: boolean) => {
    VanessaEditor.editors.forEach(e => e.useDebugger(value));
    VanessaEditor.useDebuggerDefault = value;
  }

  public closeAll = () => {
    while (this.tabStack.length) this.tabStack.pop().dispose();
    this.disposeHidden();
  }

  public close = () => {
    if (this.current) this.current.onClose();
  }

  public count = () => this.tabStack.length;
  public tab = (index: number) => this.tabStack[index];
  public select = (index: number) => this.tabStack[index].select();
}
