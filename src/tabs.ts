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
    model: any,
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
    this.owner.domTabPanel.append(this.domNode);
    this.editor.editor.setModel(model);
    this.select();
  }

  public open(
    editor: IVAEditor,
    model: any,
    title: string,
    encoding: number,
  ) {
    this.editor = editor;
    this.model = model;
    this.encoding = encoding;
    this.domTitle.innerText = title;
    this.domItem.setAttribute("title", title);
    this.editor.editor.setModel(model);
    return this.editor;
  }

  public select() {
    const className = "vanessa-tab-select";
    this.domNode.parentElement.querySelectorAll("." + className).forEach(e => e.classList.remove(className));
    this.domNode.classList.add(className);
    this.domNode.scrollIntoView();
    this.editor.editor.setModel(this.model);
    let domEditor = this.editor.domNode();
    domEditor.parentElement.appendChild(domEditor);
    const index = this.owner.tabStack.findIndex(e => e === this);
    if (index >= 0) this.owner.tabStack.splice(index, 1);
    this.owner.tabStack.push(this);
  }

  private close() {
    const index = this.owner.tabStack.findIndex(e => e === this);
    if (index >= 0) this.owner.tabStack.splice(index, 1);
    const next = this.owner.tabStack.pop();
    if (next) next.select();
    this.editor.dispose();
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
    this.domContainer = document.getElementById("VanessaTabsContainer");
    this.domContainer.classList.remove("vanessa-hidden");
    this.domTabPanel = $("div.vanessa-tab-panel");
    this.domContainer.append(this.domTabPanel);
  }

  public current() {
    if (this.tabStack.length) return this.tabStack[this.tabStack.length - 1];
  }

  private openTab(
    editor: IVAEditor,
    model: any,
    title: string,
    encoding: number,
    newTab: boolean,
   ) {
    new VanessaTabItem(this, editor, model, title, encoding);
    return editor;
  }

  public edit = (
    content: string,
    filename: string,
    title: string,
    encoding: number = 0,
    newTab = false,
  ) => {
    const uri = monaco.Uri.parse(filename);
    let model = monaco.editor.getModel(uri);
    if (!model) model = createModel(content, filename, uri);
    return this.openTab(new VanessaEditor(), model, title, encoding, newTab);
  }

  public diff = (
    oldValue: string,
    oldFile: string,
    newValue: string,
    newFile: string,
    title: string,
    encoding: number = 0,
    newTab = false,
  ) => {
    const original = monaco.Uri.parse(oldFile);
    const modified = monaco.Uri.parse(newFile);
    const model: monaco.editor.IDiffEditorModel = {
      original: monaco.editor.getModel(original),
      modified: monaco.editor.getModel(modified),
    };
    if (!model.original) model.original = createModel(oldValue, oldFile, original);
    if (!model.modified) model.modified = createModel(newValue, newFile, modified);
    return this.openTab(new VanessaDiffEditor, model, title, encoding, newTab);
  }

  public closeAll = () => {
    while (this.tabStack.length) this.tabStack.pop().dispose();
  }

  private static instance: VanessaTabs;

  public static get() {
    if (!this.instance) this.instance = new VanessaTabs();
    return this.instance;
  }

  show = () => this.setVisible(true);
  hide = () => this.setVisible(false);
  setVisible = (visible: boolean) => {
    if (visible) this.domContainer.classList.remove("vanessa-hidden");
    else this.domContainer.classList.add("vanessa-hidden");
  }
}