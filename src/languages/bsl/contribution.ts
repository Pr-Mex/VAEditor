import { conf, language as monarchLanguage } from "./configuration";

const language: monaco.languages.ILanguageExtensionPoint = {
  id: "bsl",
  extensions: [".bsl", ".os"],
};

monaco.languages.register(language);

monaco.languages.onLanguage(language.id, () => {
  monaco.languages.setLanguageConfiguration(language.id, conf);
  monaco.languages.setMonarchTokensProvider(language.id, monarchLanguage);
});
