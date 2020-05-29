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
window["createVanessaEditor"] = (content: string, language: string) => {
  window["VanessaEditor"] = new VanessaEditor(content, language);
};

// tslint:disable-next-line: no-string-literal
window["createVanessaDiffEditor"] = (original: string, modified: string, language: string) => {
  window["VanessaEditor"] = new VanessaDiffEditor(original, modified, language);
};

// FIXME: надо создать VanessaCompletionManager куда вынести все из клобального контекста


// FIXME: Надо сделать команду SendAction котрая установит список причем не только сюда но и в languages/turbo-gherkin.ts
// Потому что этот список может зависеть от языка и должен усаналвиваться ванессой
window["VanessaKeywords"] = [
  "Функционал",
  "Сценарий",
  "Контекст",
  "Допустим",
  "Дано",
  "Когда",
  "И",
  "Не",
  "Тогда",
  "Затем",
  "Если",
  "Примеры",
];

window["VanessaStepList"] = [];

// FIXME: Надо сделать команду SendAction котрая установит список причем знать о струткуре json файла ванессы на русском языке плохо
// Лучше либо конвериторовать в нужный формат на стороне 1С и скарпливать его в этитор либо в принципе передалать формат хранения в ванессе
//
window["setVanessaStepList"] = function (arg) {
  function isKeyword(w) {
    return window["VanessaKeywords"].some(e => e.localeCompare(w, 'ru', { sensitivity: 'base' }) == 0);
  }
  window["VanessaStepList"] = [];
  JSON.parse(arg).forEach(e => {
    let first = true;
    let words = e.ИмяШага.split('\n')[0].replace(/'/g, '"');
    words = words.match(/(?:[^\s"]+|"[^"]*")+/g).filter(word => word && !isKeyword(word));
    window["VanessaStepList"].push({
      label: words.join(' '),
      filterText: words.filter(s => s && s[0] != '"').join(' '),
      documentation: e.ОписаниеШага,
      insertText: e.ИмяШага,
    });
  });
}

window['VanessaCompletion'] = function (line, range) {
  let result = [];
  window["VanessaStepList"].forEach(e => {
    result.push({
      label: e.label,
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: e.documentation,
      insertText: e.insertText,
      filterText: e.filterText,
      range: range
    });
  });
  return result;
}
