import { VanessaEditor } from "./vanessa-editor";

interface IProblem {
  lineNumber: number;
  severity: string;
  message: string;
  code: string;
  source: string;
}

export class ProblemManager {

  private VanessaEditor: VanessaEditor;

  constructor(
    VanessaEditor: VanessaEditor
    ) {
      this.VanessaEditor = VanessaEditor;
  }

  public DecorateProblems (problems: IProblem[]): void {
    const model: monaco.editor.ITextModel = this.VanessaEditor.editor.getModel();
    let data: monaco.editor.IMarkerData[] = [];
    problems.forEach(problem => {
      let severity: monaco.MarkerSeverity;
      if (problem.severity === "Hint") {
        severity = monaco.MarkerSeverity.Hint;
      } else if(problem.severity === "Info") {
        severity = monaco.MarkerSeverity.Info;
      } else if(problem.severity === "Warning") {
        severity = monaco.MarkerSeverity.Warning;
      } else if(problem.severity === "Error") {
        severity = monaco.MarkerSeverity.Error;
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