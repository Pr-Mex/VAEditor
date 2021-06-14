import * as monaco from "monaco-editor"
import { renderMarkdown } from 'monaco-editor/esm/vs/base/browser/markdownRenderer.js';
import * as dom from 'monaco-editor/esm/vs/base/browser/dom';
import { EventsManager, IVanessaEditor, VanessaEditorEvent } from "./common";
const $ = dom.$;


const markdownToHTML = (value: string) => {
  const result = renderMarkdown({
    value
  }, {
    inline: false,
    codeBlockRenderer: async function (languageAlias: string, value: string) {
      return await monaco.editor.colorize(value, languageAlias, {})
    }

  })
  return result
}

export class VanessaViwer implements IVanessaEditor {
  domNode(): HTMLElement { return this._domNode; }
  dispose(): void { }
  focus(): void { }
  getModel = () => { };
  resetModel = () => { };
  editor: any;

  private _domNode: HTMLElement;
  private _domInner: HTMLElement;

  constructor(src: string) {
    let node = document.getElementById("VanessaEditorContainer");
    this._domNode = $("div", { class: "vanessa-viewer" },
      this._domInner = $("div", { class: "vanessa-inner" }));
    this._domInner.appendChild(markdownToHTML(src));
    this._domInner.addEventListener("click", this.onClick.bind(this), true);
    node.appendChild(this._domNode);
  }

  private onClick(event: any) {
    if (event.target instanceof HTMLAnchorElement) {
      const data = (event.target as HTMLAnchorElement).dataset.href;
      EventsManager.fireEvent(this.editor, VanessaEditorEvent.ON_MARK_CLICK, data);
    }
  }
}
