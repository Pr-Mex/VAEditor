import "./1c-webkit-scrollbar-patch";
import "./languages/turbo-gherkin.contribution";
import "./media/breakpoint";

import { VanessaEditor } from "./vanessa-editor";

// tslint:disable-next-line: no-string-literal
window["MonacoEnvironment"] = { // worker loader
  getWorkerUrl: function (moduleId: any, label: any): void {
    // tslint:disable-next-line: max-line-length
    return require("blob-url-loader?type=application/javascript!compile-loader?target=worker&emit=false!monaco-editor/esm/vs/editor/editor.worker");
  }
};

// tslint:disable-next-line: no-string-literal
window["VanessaEditor"] = new VanessaEditor;
