import { getLineMaxColumn, getLineMinColumn, IWorkerContext, IWorkerModel } from './common';

function lineSyntaxError(context: IWorkerContext, line: string): boolean {
  let match = line.match(context.matcher.step);
  if (!match) return false;
  let steptext = line.substring(match[0].length);
  let key = context.matcher.getStepKey(steptext);
  if (!key || context.steplist[key]) return false;
  let keyword = match[0].trim().replace(/\s+/, " ").toLowerCase();
  let keypair = context.keypairs[keyword];
  if (!keypair) return true;
  let index = steptext.search(new RegExp(keypair + "\s*$", "i"));
  if (index < 0) return true;
  steptext = steptext.substring(0, index);
  key = context.matcher.getStepKey(steptext);
  return context.steplist[key] == undefined;
}

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
    if (lineSyntaxError(context, line)) problems.push({
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
