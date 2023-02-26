import { getLineMaxColumn, getLineMinColumn, ISyntaxDecorations, IWorkerContext, IWorkerModel, VAImage, VAIndent, VAToken } from './common';
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

function matchImage(
  images: VAImage[],
  lineNumber: number,
  line: string,
  token: VAIndent,
): void {
  let regexp = /^\s*(\/\/|#)\s*image\s*\:\s*height\s*=\s*(\d+)\s+src\s*=\s*(\S+)/;
  let match = line.match(regexp);
  if (match && match.length === 4) {
    images.push({
      lineNumber,
      column: token.indent,
      height: parseInt(match[2]),
      src: match[3],
    });
  }
}

export function checkSyntax(
  ctx: IWorkerContext,
  model: IWorkerModel,
  msg: {}
): ISyntaxDecorations {
  const steps = {};
  const groups: Array<{ lineNumber: number, folding: number }> = [];
  const decorations: monaco.editor.IModelDeltaDecoration[] = [];
  const problems: monaco.editor.IMarkerData[] = [];
  const images: VAImage[] = [];
  const lineCount = model.getLineCount();
  let section = "";
  for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
    const line: string = model.getLineContent(lineNumber);
    const token = model.getLineToken(lineNumber);
    switch (token.token) {
      case VAToken.Empty:
      case VAToken.Multiline:
      case VAToken.Parameter:
      case VAToken.Instruction:
      case VAToken.DirectIf:
      case VAToken.DirectElse:
      case VAToken.DirectEndif:
        continue;
      case VAToken.Comment:
        matchImage(images, lineNumber, line, token);
        continue;
      case VAToken.Section:
        section = ctx.matcher.getSection(line);
        continue;
      case VAToken.Asterisk:
        decorations.push(groupDecoration(lineNumber));
        continue;
    }
    if (section == "feature" || section == "variables") continue;
    if (ctx.matcher.metatags.test(line)) { continue; }
    const step = new VAStepLine(ctx.matcher, line);
    if (step.keyword) steps[lineNumber] = true;
    const syntax = step.checkSyntax(ctx, lineNumber, line);
    if (syntax.error) problems.push({
      severity: 8, // monaco.MarkerSeverity.Error = 8
      message: ctx.messages.syntaxMsg,
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
      if (ctx.matcher.stepkey.else.test(line)) continue;
      if (ctx.matcher.stepkey.elseif.test(line)) continue;
      groups.push({ lineNumber, folding: token.folding });
    }
  }
  groups.forEach(e => {
    for (let i = e.lineNumber + 1; i <= e.folding; ++i) if (steps[i]) {
      decorations.push(groupDecoration(e.lineNumber, "vanessa-style-bold"));
      break;
    }
  });
  return { decorations, problems, images };
}
