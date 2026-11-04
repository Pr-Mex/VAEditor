import { XBSL_LANGUAGE_ID, conf, language as monarchLanguage } from "./configuration";

const language: monaco.languages.ILanguageExtensionPoint = {
  id: XBSL_LANGUAGE_ID,
  // .sbsl — расширение скриптов «1С:Элемента» по документации ИТС
  // («Файл скрипт.sbsl», «#требуется модуль.sbsl»). .xbsl оставлен рядом:
  // этим расширением язык называют инструменты, и файлы с ним встречаются.
  extensions: [".sbsl", ".xbsl"],
};

monaco.languages.register(language);

monaco.languages.onLanguage(language.id, () => {
  monaco.languages.setLanguageConfiguration(language.id, conf);
  monaco.languages.setMonarchTokensProvider(language.id, monarchLanguage);
});
