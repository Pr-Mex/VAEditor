interface ILangImpl {
  conf: monaco.languages.LanguageConfiguration;
  language: monaco.languages.IMonarchLanguage;
}

const language: monaco.languages.ILanguageExtensionPoint = {
  id: "bsl",
  extensions: [".bsl"],
};

monaco.languages.register(language);

monaco.languages.onLanguage(language.id, () => {
  import("./configuration").then((module: ILangImpl) => {
    monaco.languages.setLanguageConfiguration(language.id, module.conf);
    monaco.languages.setMonarchTokensProvider(language.id, module.language);
  });
});
