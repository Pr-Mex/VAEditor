import { getLineMaxColumn, getLineMinColumn, ISyntaxDecorations, IWorkerContext, IWorkerModel } from './common';
import { VAStepLine } from './stepline';

function groupDecoration(lineNumber: number): monaco.editor.IModelDeltaDecoration {
  return {
    range: { startLineNumber: lineNumber, startColumn: 1, endLineNumber: lineNumber, endColumn: 1 },
    options: {
      stickiness: 1, // monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges = 1
      glyphMarginClassName: "codicon-triangle-right",
    }
  };
}

export function checkSyntax(
  context: IWorkerContext,
  model: IWorkerModel,
  msg: {}
): ISyntaxDecorations {
  const decorations: monaco.editor.IModelDeltaDecoration[] = [];
  const problems: monaco.editor.IMarkerData[] = [];
  const lineCount = model.getLineCount();
  let multiline = false;
  let section = "";
  for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
    const line: string = model.getLineContent(lineNumber);
    if (/^\s*""".*$/.test(line)) { multiline = !multiline; continue; }
    if (multiline) continue;
    if (/^\s*(#|@|\/\/)/.test(line)) continue;
    if (/^\s*\*/.test(line)) { decorations.push(groupDecoration(lineNumber)); continue; }
    if (context.matcher.isSection(line)) { section = context.matcher.getSection(line); continue; }
    if (section == "feature") continue;
    const step = new VAStepLine(context.matcher, line);
    const syntax = step.checkSyntax(context, lineNumber);
    if (syntax.error) problems.push({
      severity: 8, // monaco.MarkerSeverity.Error = 8
      message: context.messages.syntaxMsg,
      startLineNumber: lineNumber,
      endLineNumber: lineNumber,
      startColumn: getLineMinColumn(line),
      endColumn: getLineMaxColumn(line),
    })
    else if (syntax.decoration) {
      if (syntax.decoration.options.inlineClassName) {
        syntax.decoration.range = {
          startLineNumber: lineNumber,
          startColumn: getLineMinColumn(line),
          endLineNumber: lineNumber,
          endColumn: getLineMaxColumn(line),
        }
      }
      decorations.push(syntax.decoration);
    }
  }
  return { decorations, problems };
}
