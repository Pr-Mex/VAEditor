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

class IVanessaGherkinStep {
  public label: string;
  public insertText: string;
  public filterText: string;
  public documentation: string;
};

class IVanessaGherkinManager {

  public keywords: Array<string> = [
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

  private locales: Array<string> = ['en', 'ru'];

  private isKeyword(w: string): boolean {
    return this.keywords.some(e => e.localeCompare(w, this.locales, { sensitivity: 'base' }) == 0);
  }

  private steps: Array<IVanessaGherkinStep> = [];

  public setKeywords: Function;
  public setStepList: Function

  constructor() {
    this.setKeywords = (list: string): void => {
      this.keywords = JSON.parse(list);
    }
    this.setStepList = (list: string): void => {
      this.steps = [];
      JSON.parse(list).forEach(e => {
        let first = true;
        let words = e.ИмяШага.split('\n')[0].replace(/'/g, '"');
        words = words.match(/(?:[^\s"]+|"[^"]*")+/g).filter(word => word && !this.isKeyword(word));
        this.steps.push({
          label: words.join(' '),
          filterText: words.filter(s => s && s[0] != '"').join(' '),
          documentation: e.ОписаниеШага,
          insertText: e.ИмяШага,
        });
      })
    }
  }

  public getSuggestions(line: any, range: any): any {
    let result = [];
    this.steps.forEach(e => {
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
}

window["VanessaGherkinManager"] = new IVanessaGherkinManager;
