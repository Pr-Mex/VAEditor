import "./1c-webkit-style-patch";
import "./media/debug";

import { VanessaEditor } from "./vanessa-editor";
import { VanessaDiffEditor } from "./vanessa-diff-editor";

function createDOMNode(tagName: string, id: string, style: string): void {
  const element: HTMLElement = document.createElement(tagName);
  element.id = id;
  element.setAttribute("style", style);
  document.body.appendChild(element);
}

(() => {
  createDOMNode("div", "VanessaEditor", "width: 100%; height:100%;");
  createDOMNode("button", "VanessaEditorEventForwarder", "display: none");
})();

// tslint:disable-next-line: no-string-literal
window["MonacoEnvironment"] = { // worker loader
  getWorkerUrl: function (moduleId: any, label: any): void {
    // tslint:disable-next-line: max-line-length
    return require("blob-url-loader?type=application/javascript!compile-loader?target=worker&emit=false!monaco-editor/esm/vs/editor/editor.worker");
  }
};

// tslint:disable-next-line: no-string-literal
window["createVanessaEditor"] = () => window["VanessaEditor"] = new VanessaEditor;

// tslint:disable-next-line: no-string-literal
window["createVanessaDiffEditor"] = (original: string, modified: string, language: string) => {
    window["VanessaEditor"] = new VanessaDiffEditor(original, modified, language);
};
