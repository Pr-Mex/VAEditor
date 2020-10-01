interface IProblem {
  lineNumber: number;
  severity: string;
  message: string;
  code: string;
  source: string;
}

export class ProblemManager {

  private editor: monaco.editor.IStandaloneCodeEditor;

  constructor(
    editor: monaco.editor.IStandaloneCodeEditor
  ) {
    this.editor = editor;
  }

  public dispose(): void {
    this.editor = null;
  }

  set problems(problems: IProblem[]) {
    const model: monaco.editor.ITextModel = this.editor.getModel();
    let data: monaco.editor.IMarkerData[] = [];
    problems.forEach(problem => {
      let severity: monaco.MarkerSeverity;
      switch (problem.severity) {
        case "Hint": severity = monaco.MarkerSeverity.Hint; break;
        case "Info": severity = monaco.MarkerSeverity.Info; break;
        case "Warning": severity = monaco.MarkerSeverity.Warning; break;
        case "Error": severity = monaco.MarkerSeverity.Error; break;
        default: severity = monaco.MarkerSeverity.Error;
      }
      data.push(<monaco.editor.IMarkerData>{
        startLineNumber: problem.lineNumber,
        startColumn: model.getLineFirstNonWhitespaceColumn(problem.lineNumber),
        endLineNumber: problem.lineNumber,
        endColumn: model.getLineLastNonWhitespaceColumn(problem.lineNumber),
        message: problem.message,
        severity: severity,
        code: problem.code,
        source: problem.source
      });
    });
    monaco.editor.setModelMarkers(model, "problems", data);
  }
}