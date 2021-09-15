import * as dom from 'monaco-editor/esm/vs/base/browser/dom';
import { ActionManager } from './actions';
import { VanessaEditor } from "./vanessa-editor";
import { VanessaDiffEditor } from "./vanessa-diff-editor";
import { IVanessaEditor, createModel, VanessaEditorEvent, EventsManager, disposeModel, WhitespaceType, VAEditorOptions, VAEditorType } from "./common";
import { StaticServices } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices';
import { VanessaViwer } from './vanessa-viewer';
import { version } from '../version.json'
import { StyleManager } from './style';

const $ = dom.$;

class TabEventData {
  tab: VanessaTabItem;
  filename: string;
  encoding: number;
  accept: Function;
  get title() { return this.tab.title; }
  get editor() { return this.tab.editor; }
  get model() { return this.tab.model; }
  get modified() { return this.tab.model?.isModified() }
  get value() { return this.tab.model?.getValue() }
  constructor(
    tab: VanessaTabItem,
    filename: string,
    encoding: number,
    accept: Function
  ) {
    this.tab = tab;
    this.filename = filename;
    this.encoding = encoding;
    this.accept = accept;
  }
}

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
    this.owner.domTabPanel.appendChild(this.domNode);
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
    this.showEditor();
    return this;
  }

  private onChangeHandler: monaco.IDisposable;

  private registerOnDidChangeContent() {
    setTimeout(() => {
      if (this.model) this.onChangeHandler = this.model.onDidChangeContent(() => this.onModified());
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
    this.fireEvent(VanessaEditorEvent.ON_TAB_CLOSING, () => this.close());
  }

  public onFileSave() {
    this.fireEvent(VanessaEditorEvent.PRESS_CTRL_S, () => this.model.resetModified());
  }

  private showEditor() {
    clearTimeout(this.owner.timer);
    let node = this.editor.domNode();
    let show = () => {
      if (node.nextSibling)
        node.parentElement.appendChild(node);
      this.editor?.focus();
    }
    setTimeout(() => show(), 100);
    this.owner.timer = setTimeout(() => show(), 300);
  };

  public select = () => {
    const className = "vanessa-tab-select";
    let tabDomElement = this.domNode.parentElement.firstElementChild;
    while (tabDomElement) {
      tabDomElement.classList.remove(className);
      tabDomElement = tabDomElement.nextElementSibling;
    }
    this.domNode.classList.add(className);
    this.domNode.scrollIntoView();
    const index = this.owner.tabStack.indexOf(this);
    if (index >= 0) this.owner.tabStack.splice(index, 1);
    this.owner.tabStack.push(this);
    this.showEditor();
    this.fireEvent(VanessaEditorEvent.ON_TAB_SELECT);
    return this.editor;
  }

  public close = () => {
    const index = this.owner.tabStack.indexOf(this);
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

  private fireEvent(event: VanessaEditorEvent, accept: Function = undefined) {
    const data = new TabEventData(this, this.filename, this.encoding, accept);
    EventsManager.fireEvent(this.editor, event, data);
  }

  public get model() { return this.editor?.getModel(); }
  public get modified(): boolean { return this.model?.isModified(); }
  public get uri(): string { return this.model?.uri; }
  public get key(): string { return this.model?.uri.toString(); }

  public get type(): VAEditorType { return this.editor.type; }
  public get isDiffEditor(): boolean { return this.type === VAEditorType.DiffEditor; }
  public get isCodeEditor(): boolean { return this.type === VAEditorType.CodeEditor; }
  public get isMarkdownViwer(): boolean { return this.type === VAEditorType.MarkdownViwer; }

  public get title(): string { return this.domTitle.innerText; }
  public set title(value: string) { this.domTitle.innerText = value; }

  public getVersionId = () => {
    return this.model?.getVersionId();
  }

  public resetModified = () => {
    this.model?.resetModified();
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
    const tab = this.owner.findTab((tab: VanessaTabItem) =>
      tab !== this && tab.type === VAEditorType.CodeEditor
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
  private _showMinimap: boolean = true;
  private _renderWhitespace: WhitespaceType = "none";
  private hiddenEditors: Array<IVanessaEditor> = [];
  private checkSyntax: boolean = true;
  public timer: NodeJS.Timeout;

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
    this.domContainer.appendChild(this.domTabPanel);
  }

  public dispose() {
    if (VanessaTabs.standaloneInstance === this) VanessaTabs.standaloneInstance = null;
    while (this.tabStack.length) this.tabStack.pop().dispose();
    this.domContainer.classList.add("vanessa-hidden");
    this.domTabPanel.remove();
    this.disposeHidden();
  }

  public findTab(callback: any) {
    let index = -1;
    this.tabStack.forEach((t, i) => { if (callback(t)) index = i; });
    if (index < 0) return undefined;
    return this.tabStack[index];
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
    let tab = this.findTab(t => t.key === key);
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
    const tab = this.findTab((tab: VanessaTabItem) =>
      tab.key === key && tab.type === VAEditorType.CodeEditor
    );
    if (tab) return tab.select();
    let model = monaco.editor.getModel(uri);
    if (!model) model = createModel(content, filename, uri);
    this.disposeHidden();
    const options: VAEditorOptions = {
      renderWhitespace: this.renderWhitespace,
      showMinimap: this.showMinimap,
    }
    const editor = new VanessaEditor(model, readOnly, this.checkSyntax, options);
    editor.editor.updateOptions({ renderWhitespace: this.renderWhitespace });
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
    const tab = this.findTab((tab: VanessaTabItem) =>
      tab.type === VAEditorType.DiffEditor
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
    editor.editor.updateOptions({ renderWhitespace: this.renderWhitespace });
    return this.open(editor, title, newFilePath, encoding, newTab);
  }

  public view = (
    title: string,
    url: string,
    src: string,
    newTab: boolean = true,
  ): IVanessaEditor => {
    this.findTab(tab => tab.key === url && tab.type === VAEditorType.MarkdownViwer)?.close();
    const editor = new VanessaViwer(url, src);
    return this.open(editor, title, url, 0, newTab);
  }

  public welcome = (
    title: string,
    src: string,
    newTab: boolean = true,
  ): IVanessaEditor => {
    const url = "memory:welcome";
    this.findTab(tab => tab.key === url && tab.type === VAEditorType.MarkdownViwer)?.close();
    const editor = new VanessaViwer(url, src, false);
    return this.open(editor, title, url, 0, newTab);
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
    this.findTab((tab: VanessaTabItem) => tab.dom === next).select();
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
    this.current?.onClose();
  }

  public get enableSyntaxCheck(): boolean { return this.checkSyntax; }
  public set enableSyntaxCheck(value: boolean) {
    VanessaEditor.editors.forEach(e => { e.enableSyntaxCheck = value });
    this.checkSyntax = value;
  }

  public get renderWhitespace(): WhitespaceType { return this._renderWhitespace; }
  public set renderWhitespace(value: WhitespaceType) {
    this._renderWhitespace = value;
    this.tabStack.forEach(tab => {
      if (tab.type == VAEditorType.CodeEditor)
        tab.editor.editor.updateOptions({ renderWhitespace: value })
    });
  }

  public get showMinimap(): boolean { return this._showMinimap; }
  public set showMinimap(value: boolean) {
    this._showMinimap = value;
    this.tabStack.forEach(tab => {
      if (tab.type == VAEditorType.CodeEditor)
        tab.editor.editor.updateOptions({ minimap: { enabled: value } })
    });
  }

  public showContextMenu = () => {
    if (this.current) {
      const editor = this.current.editor.editor;
      editor.updateOptions({ contextmenu: true });
      editor.trigger("", "editor.action.showContextMenu", undefined);
      editor.updateOptions({ contextmenu: false });
    }
  }

  public trigger = (source: string, handlerId: string, payload: any = undefined) => {
    this.current?.editor.focus();
    this.current?.editor.trigger(source, handlerId, payload);
  }

  public setSuggestWidgetWidth = (arg: any) => ActionManager.setSuggestWidgetWidth(arg);
  public get isDiffEditor(): boolean { return this.current ? this.current.type === VAEditorType.DiffEditor : false; }
  public get isCodeEditor(): boolean { return this.current ? this.current.type === VAEditorType.CodeEditor : false; }
  public get isMarkdownViwer(): boolean { return this.current ? this.current.type === VAEditorType.MarkdownViwer : false; }
  public get diffEditor(): VanessaDiffEditor { return this.current?.editor as VanessaDiffEditor; }
  public get editor(): IVanessaEditor { return this.current?.editor; }
  public canNavigateDiff = () => this.isDiffEditor ? this.diffEditor.canNavigate() : false;
  public previousDiff = () => this.diffEditor?.previous();
  public nextDiff = () => this.diffEditor?.next();
  public count = () => this.tabStack.length;
  public tab = (index: number) => this.tabStack[index];
  public select = (index: number) => this.tabStack[index].select();
  public set theme(arg: string) { StyleManager.theme = arg; }
  public get version(): string { return version }
}
