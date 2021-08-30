import { getLineMaxColumn, getLineMinColumn, IWorkerContext, IWorkerModel } from './common';

function lineSyntaxError(context: IWorkerContext, line: string): boolean {
  let match = line.match(context.matcher.step);
  if (!match) return false;
  let words = context.matcher.splitWords(line);
  let keyword = context.matcher.findKeyword(words);
  if (keyword == undefined) return false;
  let s = true;
  let notComment = (w: string) => s && !(/^[\s]*[#|//]/.test(w));
  words = words.filter((w, i) => (i < keyword.length) ? false : (notComment(w) ? true : s = false));
  let key = context.matcher.key(words);
  if (key === "") return false;
  if (context.steplist[key]) return false;
  let keypair = context.keypairs[keyword.join(" ")];
  if (!keypair) return true;
  let lastnum = words.length - 1;
  let lastword = words[lastnum].toLowerCase();
  let step = words.filter((w, i) => i < lastnum);
  return !(context.steplist[context.matcher.key(step)] && keypair.some((w: string) => w == lastword));
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
