import { VanessaGherkinProvider } from "./languages/turbo-gherkin.provider";

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

  public checkSyntax() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const provider = window["VanessaGherkinProvider"] as VanessaGherkinProvider;
      if (provider) provider.checkSyntax(this.editor.getModel());
    }, 1000);
  }
}
