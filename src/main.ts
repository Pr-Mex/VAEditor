//@ts-ignore
self.MonacoEnvironment = {
	globalAPI: true,
  getWorkerUrl: function (moduleId: string, label: string): string {
    switch (label)
    {
      case 'css':
        // tslint:disable-next-line: max-line-length
        return require("blob-url-loader?type=application/javascript!compile-loader?target=worker&emit=false!monaco-editor/esm/vs/language/css/css.worker");
      case 'json':
        // tslint:disable-next-line: max-line-length
        return require("blob-url-loader?type=application/javascript!compile-loader?target=worker&emit=false!monaco-editor/esm/vs/language/json/json.worker");
      case 'html':
        // tslint:disable-next-line: max-line-length
        return require("blob-url-loader?type=application/javascript!compile-loader?target=worker&emit=false!monaco-editor/esm/vs/language/html/html.worker");
      default:
        // tslint:disable-next-line: max-line-length
        return require("blob-url-loader?type=application/javascript!compile-loader?target=worker&emit=false!monaco-editor/esm/vs/editor/editor.worker");
      }
  }
};

import "./polyfills"; // ПЕРВЫМ: queueMicrotask/ResizeObserver до загрузки monaco
import "./product-service"; // регистрация IProductService до StandaloneServices (нужен paste)
import "./media/debug";
import "./media/tabs";
import "./media/welcome";
import { setLocaleData } from './nls/nls';
import { patchWebKit1C } from "./1c-webkit-patch";

let reg = new RegExp('[?&]localeCode=([^&#]*)', 'i');
let queryString = reg.exec(window.location.search);
let localeCode = queryString ? queryString[1] : 'en';
console.log('Current locale is: ' + localeCode);
if (localeCode !== 'en') {
  // Вендоренные locale-данные в src/nls/locale/*.json. Сейчас вендорим ru;
  // отсутствие локали — не ошибка (фолбэк на английский).
  try {
    const localeData = require('./nls/locale/' + localeCode + '.json');
    setLocaleData(localeData);
  } catch (e) {
    console.warn('VAEditor: нет вендоренной локали "' + localeCode + '", использую английский.');
  }
}

import { VanessaTabs } from "./vanessa-tabs";
import { VanessaEditor } from "./vanessa-editor";
import { VanessaDiffEditor } from "./vanessa-diff-editor";
import { VanessaGherkinProvider } from "./languages/turbo-gherkin/provider";
import { language as gherkin } from './languages/turbo-gherkin/configuration';
import { initPage } from "./common";

initPage();

import { StandaloneServices } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices';
import { IStandaloneThemeService } from 'monaco-editor/esm/vs/editor/standalone/common/standaloneTheme';
StandaloneServices.get(IStandaloneThemeService).registerEditorContainer(document.body);

Object.defineProperties(window, {
  VanessaTabs: { get: () => VanessaTabs.getStandalone() },
  VanessaEditor: { get: () => VanessaEditor.getStandalone() },
  VanessaDiffEditor: { get: () => VanessaDiffEditor.getStandalone() },
});

window["VanessaGherkinProvider"] = new VanessaGherkinProvider(localeCode);
window["createVanessaTabs"] = () => VanessaTabs.createStandalone();
window["createVanessaEditor"] = (content?: string, language: string = gherkin.id) => VanessaEditor.createStandalone(content, language);
window["createVanessaDiffEditor"] = (original?: string, modified?: string, language: string = gherkin.id) => VanessaDiffEditor.createStandalone(original, modified, language);
window["disposeVanessaAll"] = () => { VanessaTabs.disposeStandalone(); VanessaTabs.disposeStandalone(); VanessaEditor.disposeStandalone() };
window["disposeVanessaTabs"] = () => VanessaTabs.disposeStandalone();
window["disposeVanessaEditor"] = () => VanessaEditor.disposeStandalone();
window["disposeVanessaDiffEditor"] = () => VanessaDiffEditor.disposeStandalone();
window["useVanessaDebugger"] = (value: boolean) => VanessaTabs.useDebugger(value);

patchWebKit1C();
