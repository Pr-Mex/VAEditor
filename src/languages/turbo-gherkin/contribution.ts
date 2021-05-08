import { VanessaGherkinProvider } from "./provider";

interface ILangImpl {
  conf: monaco.languages.LanguageConfiguration;
  language: monaco.languages.IMonarchLanguage;
}

const language: monaco.languages.ILanguageExtensionPoint = {
  id: "turbo-gherkin",
  extensions: [".feature"],
};

monaco.languages.register(language);

monaco.languages.onLanguage(language.id, () => {
  import("./configuration").then((module: ILangImpl) => {
    let provider = VanessaGherkinProvider.instance;
    provider.init(language.id, module.language);
    monaco.languages.setLanguageConfiguration(language.id, module.conf);
    monaco.languages.registerCodeActionProvider(language.id, provider);
    monaco.languages.registerCompletionItemProvider(language.id, provider);
    monaco.languages.registerFoldingRangeProvider(language.id, provider);
    monaco.languages.registerHoverProvider(language.id, provider);
    monaco.languages.registerLinkProvider(language.id, provider);
    monaco.languages.setTokensProvider(language.id, provider);
  });
});
