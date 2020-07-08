import { ActionProvider } from "./provider.action";
import { FoldingProvider } from "./provider.folding";
import { HoverProvider } from "./provider.hover";
import { SuggestProvider } from "./provider.suggest";

interface ILangImpl {
  conf: monaco.languages.LanguageConfiguration;
  language: monaco.languages.IMonarchLanguage;
}

const language: monaco.languages.ILanguageExtensionPoint = { id: "turbo-gherkin" };

monaco.languages.register(language);

monaco.languages.onLanguage(language.id, () => {
  import("./configuration").then((module: ILangImpl) => {
    monaco.languages.setLanguageConfiguration(language.id, module.conf);
    monaco.languages.setMonarchTokensProvider(language.id, module.language);
  });
});

monaco.languages.registerCodeActionProvider(language.id, {
  provideCodeActions: (model, range, context, token) =>
  ActionProvider.getCodeAction(model, range, context, token)
});

monaco.languages.registerCompletionItemProvider(language.id, {
  provideCompletionItems: (model, position) =>
    SuggestProvider.getSuggestions(model, position)
});

monaco.languages.registerFoldingRangeProvider(language.id, {
  provideFoldingRanges: (model: monaco.editor.ITextModel, context, token) =>
    FoldingProvider.getModelFolding(model, context, token)
});

monaco.languages.registerHoverProvider(language.id, {
  provideHover: (model, position) =>
    HoverProvider.getHoverContents(model, position)
});
