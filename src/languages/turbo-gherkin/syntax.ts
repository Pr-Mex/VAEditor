import { getLineMaxColumn, getLineMinColumn, ISyntaxDecorations, IWorkerContext, IWorkerModel, VAToken } from './common';
import { VAStepLine } from './stepline';

function groupDecoration(lineNumber: number, style: string = undefined): monaco.editor.IModelDeltaDecoration {
  return {
    range: { startLineNumber: lineNumber, startColumn: 1, endLineNumber: lineNumber, endColumn: 1 },
    options: {
      stickiness: 1, // monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges = 1
      glyphMarginClassName: "codicon-triangle-right",
      inlineClassName: style,
      isWholeLine: style != undefined,
    }
  };
}

export function checkSyntax(
  context: IWorkerContext,
  model: IWorkerModel,
  msg: {}
): ISyntaxDecorations {
  const steps = {};
  const groups: Array<{ lineNumber: number, folding: number }> = [];
  const decorations: monaco.editor.IModelDeltaDecoration[] = [];
  const problems: monaco.editor.IMarkerData[] = [];
  const lineCount = model.getLineCount();
  let section = "";
  for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
    const line: string = model.getLineContent(lineNumber);
    const token = model.getLineToken(lineNumber);
    switch (token.token) {
      case VAToken.Empty:
      case VAToken.Comment:
      case VAToken.Multiline:
      case VAToken.Parameter:
      case VAToken.Instruction:
        continue;
      case VAToken.Section:
        section = context.matcher.getSection(line);
        continue;
      case VAToken.Asterisk:
        decorations.push(groupDecoration(lineNumber));
        continue;
    }
    if (section == "feature" || section == "variables") continue;
    if (context.matcher.metatags.test(line)) { continue; }
    const step = new VAStepLine(context.matcher, line);
    if (step.keyword) steps[lineNumber] = true;
    const syntax = step.checkSyntax(context, lineNumber, line);
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
    else if (token.folding) {
      groups.push({ lineNumber, folding: token.folding });
    }
  }
  groups.forEach(e => {
    for (let i = e.lineNumber + 1; i <= e.folding; ++i) if (steps[i]) {
      decorations.push(groupDecoration(e.lineNumber, "vanessa-style-bold"));
      break;
    }
  });
  return { decorations, problems };
}
