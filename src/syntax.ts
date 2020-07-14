import { SyntaxProvider } from "./languages/turbo-gherkin/provider.syntax";

export class SyntaxManager {

  private editor: monaco.editor.IStandaloneCodeEditor;
  private timer: NodeJS.Timeout;

  constructor(
    editor: monaco.editor.IStandaloneCodeEditor
  ) {
    this.editor = editor;
    this.checkSyntax();
    this.editor.onDidChangeModelContent(() => this.checkSyntax());
  }

  public dispose(): void {
    this.editor = null;
  }

  public checkSyntax() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() =>
      SyntaxProvider.checkSyntax(this.editor.getModel())
      , 1000);
  }

  get errors(): number[] {
    return monaco.editor.getModelMarkers({owner: "syntax"}).map( m => m.startLineNumber );
  }
}
