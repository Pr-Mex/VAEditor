import { ActionProvider } from "./provider.action";
import { FoldingProvider } from "./provider.folding";
import { HoverProvider } from "./provider.hover";
import { SuggestProvider } from "./provider.suggest";
import { TokensProvider } from "./provider.tokens";

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
    monaco.languages.setLanguageConfiguration(language.id, module.conf);
    monaco.languages.setTokensProvider(language.id, new TokensProvider(language.id, module.language));
    monaco.languages.registerCodeActionProvider(language.id, new ActionProvider);
    monaco.languages.registerCompletionItemProvider(language.id, new SuggestProvider);
    monaco.languages.registerFoldingRangeProvider(language.id, new FoldingProvider);
    monaco.languages.registerHoverProvider(language.id, new HoverProvider);
  });
});
