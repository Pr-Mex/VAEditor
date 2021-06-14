import * as monaco from "monaco-editor"
import { renderMarkdown } from 'monaco-editor/esm/vs/base/browser/markdownRenderer.js';
import * as dom from 'monaco-editor/esm/vs/base/browser/dom';
import { IVanessaEditor } from "./common";
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
    node.appendChild(this._domNode);
  }
}
