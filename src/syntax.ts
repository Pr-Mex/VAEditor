import { VanessaGherkinProvider } from "./languages/turbo-gherkin/provider";

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
    clearTimeout(this.timer);
    this.editor = null;
  }

  public checkSyntax() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() =>
      VanessaGherkinProvider.instance.checkSyntax(this.editor.getModel())
      , 1000);
  }

  public normalizeIndentation() {
    const model = this.editor.getModel();
    const lines = model.getLinesContent();
    const value = lines.map(line =>
      model.normalizeIndentation(line)
    ).join(model.getEOL());
    model.setValue(value);
  }

  get errors(): number[] {
    return monaco.editor.getModelMarkers({owner: "syntax"}).map( m => m.startLineNumber );
  }
}
