import { ProviderBase } from "./provider.base";
import { createTokenizationSupport } from '../../../node_modules/monaco-editor/esm/vs/editor/standalone/common/monarch/monarchLexer';
import { StaticServices } from '../../../node_modules/monaco-editor/esm/vs/editor/standalone/browser/standaloneServices';
import { compile } from '../../../node_modules/monaco-editor/esm/vs/editor/standalone/common/monarch/monarchCompile';

export class TokensProvider extends ProviderBase {

  private tokenizer: any;

  public constructor(languageId: string, languageDef: monaco.languages.IMonarchLanguage) {
    super();
    this.tokenizer = createTokenizationSupport(
      StaticServices.modeService.get(),
      StaticServices.standaloneThemeService.get(),
      languageId,
      compile(languageId, languageDef),
    );
  }

  public getInitialState(): monaco.languages.IState {
    return this.tokenizer.getInitialState();
  }

  public tokenize(line: string, state: monaco.languages.IState): monaco.languages.ILineTokens {
    let tokens = [];
    let result = this.tokenizer.tokenize(line, state, 0);
    result.tokens.forEach((t: monaco.Token) => tokens.push({ startIndex: t.offset, scopes: t.type }));
    return { tokens: tokens, endState: result.endState };
  }
}
