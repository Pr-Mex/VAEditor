import { workerUrl, workerDelivery } from './worker-source'

// Воркеры Monaco — отдельные входы webpack, встроенные в страницу как base64
// (tools/plugins/inlineWorkerSource.js). Отдельных js-файлов в поставке нет:
// встроенный WebKit 1С по file:// их не загружает, а blob-url-loader с
// compile-loader в этой сборке результат не отдавал.
const WORKER_ASSETS: { [label: string]: string } = {
  css: 'css-worker.js',
  json: 'json-worker.js',
  html: 'html-worker.js',
  editor: 'editor-worker.js'
}

//@ts-ignore
self.MonacoEnvironment = {
	globalAPI: true,
  // getWorker, а не getWorkerUrl: при пустом URL Monaco делает
  // new Worker(''), пустой путь резолвится в саму страницу и WebView2 пишет в
  // консоль "Unsafe attempt to load URL file:///...index.html" — то есть
  // пытается загрузить file://-ресурс. Поэтому воркер создаём сами и бросаем
  // понятную ошибку, если исходник в страницу не попал.
  getWorker: function (moduleId: string, label: string): Worker {
    const asset = WORKER_ASSETS[label] || WORKER_ASSETS.editor
    const url = workerUrl(asset, workerDelivery())
    if (!url) throw new Error('исходник воркера ' + asset + ' не встроен в страницу (window.__VAWorkerSources)')
    return new Worker(url)
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
import { applyEditorVersion } from "./version";

applyEditorVersion();
applyUiEnvironment();
initErrorReporting();
initPage();

import { StaticServices } from 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices';
StaticServices.standaloneThemeService.get().registerEditorContainer(document.body);

// configurable: свойства переопределяются повторно, если страницу инициализируют
// дважды (например, в test.html оказались чанки обоих входов).
Object.defineProperties(window, {
  VanessaTabs: { configurable: true, get: () => VanessaTabs.getStandalone() },
  VanessaEditor: { configurable: true, get: () => VanessaEditor.getStandalone() },
  VanessaDiffEditor: { configurable: true, get: () => VanessaDiffEditor.getStandalone() },
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
