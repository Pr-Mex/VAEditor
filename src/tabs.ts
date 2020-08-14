import * as dom from '../node_modules/monaco-editor/esm/vs/base/browser/dom';
import { VanessaEditor } from "./vanessa-editor";
import { VanessaDiffEditor } from "./vanessa-diff-editor";
import { IVAEditor, createModel } from "./common";

const $ = dom.$;

class VanessaTabItem {
  public editor: IVAEditor;
  public modified: boolean = false;
  public encoding: number;

  private model: monaco.editor.IDiffEditorModel;
  private owner: VanessaTabs;
  private domNode: HTMLElement;
  private domItem: HTMLElement;
  private domTitle: HTMLElement;
  private domClose: HTMLElement;

  constructor(
    owner: VanessaTabs,
    editor: IVAEditor,
    model: monaco.editor.IDiffEditorModel,
    title: string,
    encoding: number,
  ) {
    this.owner = owner;
    this.editor = editor;
    this.model = model;
    this.encoding = encoding;
    this.domNode = $("div.vanessa-tab-box");
    this.domItem = $("div.vanessa-tab-item", { title: title });
    this.domClose = $("div.vanessa-tab-close", { title: "Close" });
    this.domTitle = $("div.vanessa-tab-title");
    this.domItem.addEventListener("click", this.select.bind(this), true);
    this.domClose.addEventListener("click", this.close.bind(this), true);
    this.domClose.innerText = "\uEA76";
    this.domTitle.innerText = title;
    this.domItem.append(this.domTitle, this.domClose);
    this.domNode.append(this.domItem);
    owner.domTabPanel.append(this.domNode);
    editor.setVisible(true);
    this.select();
  }

  public open(
    editor: IVAEditor,
    model: monaco.editor.IDiffEditorModel,
    title: string,
    encoding: number,
  ) {
    this.editor = editor;
    this.model = model;
    this.encoding = encoding;
    this.domTitle.innerText = title;
    this.domItem.setAttribute("title", title);
    return this.editor;
  }

  public select() {
    const className = "vanessa-tab-select";
    this.domNode.parentElement.querySelectorAll("." + className).forEach(e => e.classList.remove(className));
    this.domNode.classList.add(className);
    this.domNode.scrollIntoView();
    if (this.model.modified) {
      VanessaDiffEditor.get().editor.setModel(this.model);
    } else {
      VanessaEditor.get().editor.setModel(this.model.original);
    }
    const index = this.owner.tabStack.findIndex(e => e === this);
    if (index >= 0) this.owner.tabStack.splice(index, 1);
    this.owner.tabStack.push(this);
    this.editor.setVisible(true);
  }

  private close() {
    const index = this.owner.tabStack.findIndex(e => e === this);
    if (index >= 0) this.owner.tabStack.splice(index, 1);
    const next = this.owner.tabStack.pop();
    if (next) next.select(); else VanessaDiffEditor.get().setVisible(false);
    this.dispose();
  }

  dispose() {
    this.domNode.remove();
    this.editor = null;
    this.owner = null;
  }

  public isEqual(model: monaco.editor.IDiffEditorModel): boolean {
    return this.model.original === model.original && this.model.modified === model.modified;
  }
}

export class VanessaTabs {
  public domContainer: HTMLElement;
  public domTabPanel: HTMLElement;
  public tabStack: Array<VanessaTabItem> = [];

  private constructor() {
    this.domTabPanel = $("div.vanessa-tab-panel");
    const container = $("div", { id: "VanessaTabsContainer" });
    container.append(this.domTabPanel);
    document.body.append(container);
    this.domContainer = document.getElementById("VanessaEditorContainer");
    this.domContainer.setAttribute("style", "top: 2em");
  }

  public current() {
    if (this.tabStack.length) return this.tabStack[this.tabStack.length - 1];
  }

  private openTab(
    editor: IVAEditor,
    model: monaco.editor.IDiffEditorModel,
    title: string,
    encoding: number,
    openNewTab: boolean,
   ) {
    let tab = openNewTab ? null : this.current();
    if (tab && !tab.modified) tab.open(editor, model, title, encoding);
    else tab = new VanessaTabItem(this, editor, model, title, encoding);
    editor.setVisible(true);
    return editor;
  }

  public edit = (
    content: string,
    filename: string,
    title: string,
    encoding: number = 0,
    openNewTab = false,
  ) => {
    const uri = monaco.Uri.parse(filename);
    let model: monaco.editor.IDiffEditorModel = {
      original: monaco.editor.getModel(uri),
      modified: null,
    };
    if (model.original) {
      const tab = this.tabStack.find(tab => tab.isEqual(model));
      if (tab) { tab.select(); return tab.editor; }
    }
    if (!model.original) model.original = createModel(content, filename, uri);
    const editor = VanessaEditor.get();
    editor.editor.setModel(model.original);
    return this.openTab(editor, model, title, encoding, openNewTab);
  }

  public diff = (
    oldValue: string,
    oldFile: string,
    newValue: string,
    newFile: string,
    title: string,
    encoding: number = 0,
    openNewTab = false,
  ) => {
    const original = monaco.Uri.parse(oldFile);
    const modified = monaco.Uri.parse(newFile);
    const model: monaco.editor.IDiffEditorModel = {
      original: monaco.editor.getModel(original),
      modified: monaco.editor.getModel(modified),
    };
    if (model.original && model.modified) {
      const tab = this.tabStack.find(tab => tab.isEqual(model));
      if (tab) { tab.select(); return tab.editor; }
    }
    if (!model.original) model.original = createModel(oldValue, oldFile, original);
    if (!model.modified) model.modified = createModel(newValue, newFile, modified);
    const editor = VanessaDiffEditor.get();
    editor.editor.setModel(model);
    return this.openTab(editor, model, title, encoding, openNewTab);
  }

  public closeAll = () => {
    while (this.tabStack.length) this.tabStack.pop().dispose();
    monaco.editor.getModels().forEach(model => model.dispose());
  }

  private static instance: VanessaTabs;

  public static get() {
    if (!this.instance) {
      this.instance = new VanessaTabs();
      VanessaDiffEditor.get().hide();
      VanessaEditor.get().hide();
    }
    return this.instance;
  }
}