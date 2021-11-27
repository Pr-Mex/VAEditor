import * as monaco from "monaco-editor"
import * as dom from 'monaco-editor/esm/vs/base/browser/dom';
import { renderMarkdown } from 'monaco-editor/esm/vs/base/browser/markdownRenderer.js';
import { EventsManager, IVanessaEditor, VAEditorType, VanessaEditorEvent } from "./common";
const $ = dom.$;

const markdownToHTML = (value: string) => {
  return renderMarkdown({ value }, {
    inline: false,
    codeBlockRenderer: async function (languageAlias: string, value: string) {
      const alias = languageAlias.toLowerCase();
      const id = monaco.languages.getLanguages().find(
        lang => lang.aliases?.some(a => a.toLocaleLowerCase() === alias)
      )?.id || alias;
      const html = await monaco.editor.colorize(value, id, {});
      const element = $("span", { class: "vanessa-markdown-code" });
      element.innerHTML = html;
      return element;
    }
  }).element;
}

class VanessaViewModel {
  private _uri: monaco.Uri;
  get uri() { return this._uri; };
  isModified() { return false; }
  onDidChangeContent() { }
  constructor(uri: string) {
    this._uri = monaco.Uri.parse(uri);
  }
}

export class WelcomeParams {
  title: string;
  subtitle: string;
  sections: Array<{
    name: string;
    items: Array<{
      href: string;
      name: string;
      path?: string;
      event: string;
      gliph?: string;
    }>;
  }>;
}

function getWelcomePage(arg: string) {
  const welcome: WelcomeParams = JSON.parse(arg);
  const result = $("div", { class: "welcome" },
    $("h1", {}, welcome.title),
    $("h2", {}, welcome.subtitle),
  );
  welcome.sections.forEach(section => {
    result.appendChild($("h3", {}, section.name));
    const list = $("ul", {});
    section.items.forEach(item => {
      list.appendChild($("li", {},
        $("a", { href: "#", "data-href": item.href, "data-event": item.event },
          item.gliph ? $("span", { class: "codicon codicon-" + item.gliph }) : "", item.name),
        item.path ? $("span", { class: "path" }, item.path) : "",
      ));
    });
    result.appendChild(list);
  });
  return result;
}

class VanessaViewEditor {
  model: VanessaViewModel;
  getModel() { return this.model; }
  getEditorType() { return "vanessa.IMarkdownViewer"; }
  constructor(uri: string) {
    this.model = new VanessaViewModel(uri);
  }
}

export class VanessaViwer implements IVanessaEditor {
  domNode(): HTMLElement { return this._domNode; }
  dispose(): void { }
  focus = () => { };
  undo = () => { };
  redo = () => { };
  trigger = () => { };
  resetModel = () => { };
  getModel = () => this.editor.getModel();
  editor: VanessaViewEditor;

  private _domNode: HTMLElement;
  private _domInner: HTMLElement;
  private _scrollTop: number;

  constructor(uri: string, src: string, markdown: boolean = true) {
    this.editor = new VanessaViewEditor(uri);
    let node = document.getElementById("VanessaEditorContainer");
    this._domNode = $("div", { class: "vanessa-viewer" },
      this._domInner = $("div", { class: "vanessa-inner" }));
    if (markdown) {
      this._domInner.classList.add("vanessa-markdown");
      this._domInner.appendChild(markdownToHTML(src));
      this._domInner.addEventListener("click", this.onMarkdownClick.bind(this), true);
    }
    else {
      this._domInner.appendChild(getWelcomePage(src));
      this._domInner.addEventListener("click", this.onWelcomeClick.bind(this), true);
    }
    node.appendChild(this._domNode);
  }

  private onMarkdownClick(event: any) {
    if (event.target instanceof HTMLAnchorElement) {
      const data = (event.target as HTMLAnchorElement).dataset.href;
      EventsManager.fireEvent(this, VanessaEditorEvent.ON_MARK_CLICK, data);
    }
  }

  private onWelcomeClick(event: any) {
    if (event.target instanceof HTMLAnchorElement) {
      const id = (event.target as HTMLAnchorElement).dataset.event;
      const data = (event.target as HTMLAnchorElement).dataset.href;
      EventsManager.fireEvent(this, id, data);
    }
  }

  public get type() { return VAEditorType.MarkdownViwer; }
  public saveScroll() { this._scrollTop = this._domInner.scrollTop; }
  public restoreScroll() { this._domInner.scrollTop = this._scrollTop; }
}
