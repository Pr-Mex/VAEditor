import * as dom from '../node_modules/monaco-editor/esm/vs/base/browser/dom';

const $ = dom.$;

export class VanessaTabItem {
  private owner: VanessaTabs;
  private domNode: HTMLElement;
  constructor(owner: VanessaTabs, text: string) {
    this.owner = owner;
    this.domNode = $("div.VanessaTabBox");
    const item = $("div.VanessaTabItem", { title: text });
    const close = $("div.VanessaTabClose", { title: "Закрыть" });
    const title = $("div.VanessaTabTitle");
    close.innerText = "\uEA76";
    title.innerText = text;
    item.append(title, close);
    this.domNode.append(item);
    owner.panel.append(this.domNode);
    const editor: HTMLElement = document.getElementById("VanessaEditorContainer");
    editor.style.position = "absolute";
    editor.style.bottom = "0";
    editor.style.top = "2em";
  }
  public select() {
    this.domNode.classList.add("VanessaTabSelect");
  }
}

export class VanessaTabs {
  public container: HTMLElement;
  public panel: HTMLElement;
  constructor() {
    this.container = $("div", { id: "VanessaTabsContainer" });
    this.panel = $("div.VanessaTabPanel");
    this.container.append(this.panel);
    document.body.append(this.container);
    new VanessaTabItem(this, "AddInBase.cpp");
    new VanessaTabItem(this, "AddInBase.h");
    new VanessaTabItem(this, "Compile.os").select();
    new VanessaTabItem(this, "Decompile.os");
  }
 }