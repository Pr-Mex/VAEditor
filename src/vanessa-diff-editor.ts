import * as monaco from "monaco-editor";
import "./languages/bsl/contribution";
import "./languages/turbo-gherkin/contribution";

export class VanessaDiffEditor {

  public editor: monaco.editor.IStandaloneDiffEditor;

  constructor(original: string, modified: string, language: string) {
    this.editor = monaco.editor.createDiffEditor(document.getElementById("VanessaEditor"), {
      scrollBeyondLastLine: false,
      glyphMargin: true,
      automaticLayout: true
    });

    this.editor.setModel({
      original: monaco.editor.createModel(original, language),
      modified: monaco.editor.createModel(modified, language),
    });
  }

  public dispose(): void {
    this.editor.dispose();
  }

  public getLanguage = (filename: string) => {
    let ext = "." + filename.split('.').pop().toLowerCase();
    let languages = monaco.languages.getLanguages();
    for (let key in languages) {
      let lang = languages[key];
      if (lang.extensions == undefined) continue;
      if (lang.extensions.find(e => e == ext)) return lang.id;
    }
  }

  public setValue = (oldValue: string, newValue: string, filename: string) => {
    let language = this.getLanguage(filename);
    this.editor.setModel({
      original: monaco.editor.createModel(oldValue, language),
      modified: monaco.editor.createModel(newValue, language),
    });
  }

  public setTheme = (theme: string) => monaco.editor.setTheme(theme);;
}
