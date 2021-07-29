import "./media/debug";
import "./media/tabs";
import { setLocaleData } from 'monaco-editor-nls';
import { runChromeTest } from "./1c-chrome-test";
import { patchWebKit1C } from "./1c-webkit-style-patch";

let reg = new RegExp('[?&]localeCode=([^&#]*)', 'i');
let queryString = reg.exec(window.location.search);
let localeCode = queryString ? queryString[1] : 'en';
console.log('Current locale is: ' + localeCode);
if (localeCode !== 'en') {
  const localeData = require('monaco-editor-nls/locale/' + localeCode + '.json');
  setLocaleData(localeData);
}

import { VanessaTabs } from "./vanessa-tabs";
import { VanessaEditor } from "./vanessa-editor";
import { VanessaDiffEditor } from "./vanessa-diff-editor";
import { VanessaGherkinProvider } from "./languages/turbo-gherkin/provider";
import { EventsManager, initPage } from "./common";

initPage();

//@ts-ignore
window.MonacoEnvironment = { // worker loader
  getWorkerUrl: function (moduleId: any, label: any): void {
    // tslint:disable-next-line: max-line-length
    return require("blob-url-loader?type=application/javascript!compile-loader?target=worker&emit=false!monaco-editor/esm/vs/editor/editor.worker");
  }
};

Object.defineProperties(window, {
  VanessaTabs: { get: () => VanessaTabs.getStandalone() },
  VanessaEditor: { get: () => VanessaEditor.getStandalone() },
  VanessaDiffEditor: { get: () => VanessaDiffEditor.getStandalone() },
});

window["VanessaGherkinProvider"] = new VanessaGherkinProvider();
window["createVanessaTabs"] = () => VanessaTabs.createStandalone();
window["createVanessaEditor"] = (content?: string, language: string = "turbo-gherkin") => VanessaEditor.createStandalone(content, language);
window["createVanessaDiffEditor"] = (original?: string, modified?: string, language: string = "turbo-gherkin") => VanessaDiffEditor.createStandalone(original, modified, language);
window["disposeVanessaAll"] = () => { VanessaTabs.disposeStandalone(); VanessaTabs.disposeStandalone(); VanessaEditor.disposeStandalone() };
window["disposeVanessaTabs"] = () => VanessaTabs.disposeStandalone();
window["disposeVanessaEditor"] = () => VanessaEditor.disposeStandalone();
window["disposeVanessaDiffEditor"] = () => VanessaDiffEditor.disposeStandalone();
window["useVanessaDebugger"] = (value: boolean) => VanessaTabs.useDebugger(value);
window["popVanessaMessage"] = () => EventsManager.popMessage();
window["VanessaDemo"] = () => runChromeTest();

patchWebKit1C();
