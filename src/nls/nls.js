// Свой NLS-шим VAEditor. Заменяет monaco-editor-nls@2.0.0, который не годится
// с актуальными monaco: с 0.34 нужен getConfiguredDefaultLocale, с 0.45 —
// localize2 (ILocalizedString). Подставляется вместо vs/nls через
// NormalModuleReplacementPlugin (см. webpack.config.js).
//
// Call-sites monaco получают путь модуля первым аргументом (лоадер
// tools/loaders/monacoNls.js дописывает его в localize(/localize2():
//   localize(path, key|data, defaultMessage, ...args) -> string
//   localize2(path, key|data, defaultMessage, ...args) -> { value, original }
//
// Locale-данные вендорятся в src/nls/locale/*.json и грузятся через
// setLocaleData (см. src/main.ts). Промах по таблице -> defaultMessage (en).
//
// Только ES2015 (этот файл НЕ проходит через esbuild/ts-loader).

var CURRENT_LOCALE_DATA = null;

function _format(message, args) {
  if (message === undefined || message === null) return message;
  if (!args || args.length === 0) return message;
  return String(message).replace(/\{(\d+)\}/g, function (match, rest) {
    var i = rest[0];
    return typeof args[i] !== 'undefined' ? args[i] : match;
  });
}

function _lookup(path, data, defaultMessage) {
  var key = (data && typeof data === 'object') ? data.key : data;
  var table = CURRENT_LOCALE_DATA || {};
  var message = (table[path] || {})[key];
  return (message === undefined || message === null) ? defaultMessage : message;
}

function localize(path, data, defaultMessage) {
  var args = Array.prototype.slice.call(arguments, 3);
  return _format(_lookup(path, data, defaultMessage), args);
}

function localize2(path, data, defaultMessage) {
  var args = Array.prototype.slice.call(arguments, 3);
  var value = _format(_lookup(path, data, defaultMessage), args);
  var original = _format(defaultMessage, args);
  return { value: value, original: original };
}

function getConfiguredDefaultLocale() { return undefined; }

// 0.52: vs/nls реэкспортит их из nls.messages.js (читают globalThis._VSCODE_NLS_*).
// Импортятся defaultWorkerFactory.js/platform.js из vs/nls (который мы заменяем),
// поэтому экспортим из шима. Наш localize не использует _VSCODE_NLS_MESSAGES
// (берёт из вендоренной таблицы по path+key), поэтому undefined безопасен.
function getNLSLanguage() { return undefined; }
function getNLSMessages() { return undefined; }

function setLocaleData(data) { CURRENT_LOCALE_DATA = data; }

// AMD-совместимость (на случай прямых обращений); в ESM не используется.
function loadMessageBundle() { return localize; }
function config() { return loadMessageBundle; }

module.exports.localize = localize;
module.exports.localize2 = localize2;
module.exports.getConfiguredDefaultLocale = getConfiguredDefaultLocale;
module.exports.getNLSLanguage = getNLSLanguage;
module.exports.getNLSMessages = getNLSMessages;
module.exports.setLocaleData = setLocaleData;
module.exports.loadMessageBundle = loadMessageBundle;
module.exports.config = config;
