import { getLineMaxColumn, getLineMinColumn, IWorkerContext, IWorkerModel } from './common';
import { VAStepLine } from './stepline';

export function checkSyntax(context: IWorkerContext, model: IWorkerModel, msg: {}) {
  const problems: monaco.editor.IMarkerData[] = [];
  const lineCount = model.getLineCount();
  let multiline = false;
  let section = "";
  for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
    const line: string = model.getLineContent(lineNumber);
    if (/^\s*""".*$/.test(line)) { multiline = !multiline; continue; }
    if (multiline) continue;
    if (/^\s*(#|@|\*|\/\/)/.test(line)) continue;
    if (context.matcher.isSection(line)) { section = context.matcher.getSection(line); continue; }
    if (section == "feature") continue;
    const step = new VAStepLine(context.matcher, line);
    if (step.isSyntaxError(context)) problems.push({
      severity: 8, // monaco.MarkerSeverity.Error = 8
      message: context.messages.syntaxMsg,
      startLineNumber: lineNumber,
      endLineNumber: lineNumber,
      startColumn: getLineMinColumn(line),
      endColumn: getLineMaxColumn(line),
    });
  }
  return problems;
}
