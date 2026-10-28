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

import "./media/debug";
import "./media/tabs";
import "./media/welcome";
import { setLocaleData } from 'monaco-editor-nls';
import { patchWebKit1C } from "./1c-webkit-patch";
import { initErrorReporting } from "./error-reporting";

let reg = new RegExp('[?&]localeCode=([^&#]*)', 'i');
let queryString = reg.exec(window.location.search);
// 1С передаёт код языка интерфейса: ru, ru-RU, en и т.п.
let localeCode = (queryString ? decodeURIComponent(queryString[1]) : 'en').toLowerCase().split(/[-_]/)[0];
console.log('Current locale is: ' + localeCode);

// Локали Monaco весят по ~0.5 МБ, а используется всегда ровно одна. Поэтому
// список языков задан явно: require с переменной в пути заставляет webpack
// включить в бандл все 20 локалей пакета (~9 МБ в странице). Языка нет в
// списке — Monaco остаётся на английском.
if (localeCode === 'ru') {
  setLocaleData(require('monaco-editor-nls/locale/ru.json'));
}

import { VanessaTabs } from "./vanessa-tabs";
import { VanessaEditor } from "./vanessa-editor";
import { VanessaDiffEditor } from "./vanessa-diff-editor";
import { VanessaGherkinProvider } from "./languages/turbo-gherkin/provider";
import { language as gherkin } from './languages/turbo-gherkin/configuration';
import { initPage } from "./common";
import { applyUiEnvironment } from "./ui-interface";

// Версия сборки нужна обработке, встраивающей редактор: по ней видно, какой
// шаблон распакован и совпадает ли он с ожидаемым.
window.VAEditorVersion = __VA_EDITOR_VERSION__;

applyUiEnvironment();
initErrorReporting();
initPage();

import { StaticServices } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices';
StaticServices.standaloneThemeService.get().registerEditorContainer(document.body);

Object.defineProperties(window, {
  VanessaTabs: { get: () => VanessaTabs.getStandalone() },
  VanessaEditor: { get: () => VanessaEditor.getStandalone() },
  VanessaDiffEditor: { get: () => VanessaDiffEditor.getStandalone() },
});

window["VanessaGherkinProvider"] = new VanessaGherkinProvider(localeCode);
window["createVanessaTabs"] = () => VanessaTabs.createStandalone();
window["createVanessaEditor"] = (content?: string, language: string = gherkin.id) => VanessaEditor.createStandalone(content, language);
window["createVanessaDiffEditor"] = (original?: string, modified?: string, language: string = gherkin.id) => VanessaDiffEditor.createStandalone(original, modified, language);
window["disposeVanessaAll"] = () => { VanessaTabs.disposeStandalone(); VanessaEditor.disposeStandalone(); VanessaDiffEditor.disposeStandalone() };
window["disposeVanessaTabs"] = () => VanessaTabs.disposeStandalone();
window["disposeVanessaEditor"] = () => VanessaEditor.disposeStandalone();
window["disposeVanessaDiffEditor"] = () => VanessaDiffEditor.disposeStandalone();
window["useVanessaDebugger"] = (value: boolean) => VanessaTabs.useDebugger(value);

patchWebKit1C();
