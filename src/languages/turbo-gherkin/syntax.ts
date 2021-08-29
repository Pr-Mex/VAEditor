import { firstNonWhitespaceIndex, lastNonWhitespaceIndex } from 'monaco-editor/esm/vs/base/common/strings'
import { IVanessaModel } from './common';
import { KeywordMatcher } from './matcher';

function lineSyntaxError(matcher: KeywordMatcher, steplist: any, keypairs: any, line: string): boolean {
  let match = line.match(matcher.step);
  if (!match) return false;
  let words = matcher.splitWords(line);
  let keyword = matcher.findKeyword(words);
  if (keyword == undefined) return false;
  let s = true;
  let notComment = (w: string) => s && !(/^[\s]*[#|//]/.test(w));
  words = words.filter((w, i) => (i < keyword.length) ? false : (notComment(w) ? true : s = false));
  let key = matcher.key(words);
  if (key === "") return false;
  if (steplist[key]) return false;
  let keypair = keypairs[keyword.join(" ")];
  if (!keypair) return true;
  let lastnum = words.length - 1;
  let lastword = words[lastnum].toLowerCase();
  let step = words.filter((w, i) => i < lastnum);
  return !(steplist[matcher.key(step)] && keypair.some((w: string) => w == lastword));
}

export function checkSyntax(
  matcher: KeywordMatcher,
  steplist: any,
  keypairs: any,
  syntaxMsg: string,
  model: IVanessaModel
) {
  const problems: monaco.editor.IMarkerData[] = [];
  const lineCount = model.getLineCount();
  let multiline = false;
  let section = "";
  for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
    const line: string = model.getLineContent(lineNumber);
    if (/^\s*""".*$/.test(line)) { multiline = !multiline; continue; }
    if (multiline) continue;
    if (/^\s*(#|@|\*|\/\/)/.test(line)) continue;
    if (matcher.isSection(line)) { section = matcher.getSection(line); continue; }
    if (section == "feature") continue;
    if (lineSyntaxError(matcher, steplist, keypairs, line)) problems.push({
      severity: 8, // monaco.MarkerSeverity.Error = 8
      message: syntaxMsg,
      startLineNumber: lineNumber,
      endLineNumber: lineNumber,
      startColumn: firstNonWhitespaceIndex(line) + 1,
      endColumn: lastNonWhitespaceIndex(line) + 2,
    });
  }
  return problems;
}
