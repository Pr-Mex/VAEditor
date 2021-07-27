import { VanessaGherkinProvider } from "./provider";
import { conf, language } from './configuration'

monaco.languages.register(language);

monaco.languages.onLanguage(language.id, () => {
  let provider = VanessaGherkinProvider.instance;
  provider.initTokenizer();
  monaco.languages.setLanguageConfiguration(language.id, conf);
  monaco.languages.registerCodeActionProvider(language.id, provider);
  monaco.languages.registerCompletionItemProvider(language.id, provider);
  monaco.languages.registerFoldingRangeProvider(language.id, provider);
  monaco.languages.registerHoverProvider(language.id, provider);
  monaco.languages.registerLinkProvider(language.id, provider);
  monaco.languages.setTokensProvider(language.id, provider);
});
