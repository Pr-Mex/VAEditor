import { ProviderBase } from "./provider.base";

export class SyntaxProvider extends ProviderBase {

  private static lineSyntaxError(line: string): boolean {
    if (/^[\s]*[#|@|//]/.test(line)) return false;
    if (this.isSection(line)) return false;
    let words = this.splitWords(line);
    let keyword = this.keywords.find(item => item.every((w: string, i: number) => words[i] && w == words[i].toLowerCase()));
    if (keyword == undefined) return false;
    let s = true;
    let notComment = (w: string) => s && !(/^[\s]*[#|//]/.test(w));
    words = words.filter((w, i) => (i < keyword.length) ? false : (notComment(w) ? true : s = false));
    if (words.length == 0) return false;
    return this.steps[this.key(words)] == undefined;
  }

  public static checkSyntax(model: monaco.editor.ITextModel) {
    let problems: monaco.editor.IMarkerData[] = [];
    let lineCount = model.getLineCount();
    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
      let error = this.lineSyntaxError(model.getLineContent(lineNumber));
      if (error) problems.push({
        severity: monaco.MarkerSeverity.Error,
        message: this.syntaxMsg,
        startLineNumber: lineNumber,
        startColumn: model.getLineFirstNonWhitespaceColumn(lineNumber),
        endLineNumber: lineNumber,
        endColumn: model.getLineLastNonWhitespaceColumn(lineNumber),
      });
    }
    monaco.editor.setModelMarkers(model, "syntax", problems);
  }
}