import "./1c-webkit-style-patch";
import "./1c-chrome-test";
import "./media/debug";
import "./media/tabs";
import { setLocaleData } from 'monaco-editor-nls';

var url = new URL(location.href);
const localeCode = url.searchParams.get('localeCode') || navigator.language.substr(0, 2);
console.log('Current locale is: ' + localeCode);
if (localeCode !== 'en') {
  const localeData = require('monaco-editor-nls/locale/' + localeCode + '.json');
  setLocaleData(localeData);
}

import * as monaco from "monaco-editor"

import { VanessaTabs } from "./tabs";
import { VanessaEditor } from "./vanessa-editor";
import { VanessaDiffEditor } from "./vanessa-diff-editor";
import { VanessaGherkinProvider } from "./languages/turbo-gherkin/provider";

function createDOMNode(tagName: string, id: string): void {
  const element: HTMLElement = document.createElement(tagName);
  element.id = id;
  document.body.appendChild(element);
}

(() => {
  createDOMNode("div", "VanessaEditorContainer");
  createDOMNode("button", "VanessaEditorEventForwarder")
})();

// tslint:disable-next-line: no-string-literal
window["MonacoEnvironment"] = { // worker loader
  getWorkerUrl: function (moduleId: any, label: any): void {
    // tslint:disable-next-line: max-line-length
    return require("blob-url-loader?type=application/javascript!compile-loader?target=worker&emit=false!monaco-editor/esm/vs/editor/editor.worker");
  }
};

// tslint:disable-next-line: no-string-literal
window["VanessaGherkinProvider"] = new VanessaGherkinProvider;

// tslint:disable-next-line: no-string-literal
window["createVanessaEditor"] = (content: string, language: string) => {
  const id = "VanessaEditor";
  if (window[id]) return window[id];
  return window[id] = new VanessaEditor(content, language);
};

// tslint:disable-next-line: no-string-literal
window["createVanessaDiffEditor"] = (original: string, modified: string, language: string) => {
  const id = "VADiffEditor";
  if (window[id]) return window[id];
  return window[id] = new VanessaDiffEditor(original, modified, language);
};

// tslint:disable-next-line: no-string-literal
window["createVanessaTabs"] = () => {
  const id = "VanessaTabs";
  if (window[id]) return window[id];
  return window[id] = new VanessaTabs();
};
