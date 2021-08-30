import { IWorkerModel, VAIndent, VAToken } from "./common";
import { KeywordMatcher } from "./matcher";

function getIndent(text: string, tabSize: number) {
  let indent = 0;
  let length = text.search(/[^\s]/)
  for (let i = 0; i < length; i++) {
    if (text.charAt(i) == "\t") {
      indent = indent + tabSize - (indent % tabSize);
    } else indent++;
  }
  return indent + 1;
}

function getToken(text: string) {
  if (/^\s*$/.test(text)) return VAToken.Empty;
  if (/^[\s]*@/.test(text)) return VAToken.Instruction;
  if (/^[\s]*\|/.test(text)) return VAToken.Parameter;
  if (/^[\s]*[#|//]/.test(text)) return VAToken.Comment;
  if (/^[\s]*"""/.test(text)) return VAToken.Multiline;
  return VAToken.Operator;
}

export function getCodeFolding(
  ctx: { matcher: KeywordMatcher },
  model: IWorkerModel,
  msg: { tabSize: number }
): Array<monaco.languages.FoldingRange> {
  let multiline = false;
  const lineCount = model.getLineCount();
  let lines: Array<VAIndent> = [{ token: VAToken.Empty, indent: 0 }];
  for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
    let text = model.getLineContent(lineNumber);
    let token = getToken(text);
    if (multiline) {
      if (token == VAToken.Multiline) multiline = false;
      token = VAToken.Multiline;
    } else {
      if (token == VAToken.Multiline) multiline = true;
    }
    if (token != VAToken.Operator) {
      lines.push({ token: token, indent: 0 });
    } else {
      let ident = 0;
      if (ctx.matcher.isSection(text)) token = VAToken.Section;
      else ident = getIndent(text, msg.tabSize);
      lines.push({ token: token, indent: ident });
    }
  }
  let result = [];
  for (let i = 1; i <= lineCount; i++) {
    let k = i;
    let line = lines[i];
    let kind = undefined;
    switch (line.token) {
      case VAToken.Instruction:
        for (let j = i + 1; j <= lineCount; j++) {
          if (lines[j].token == VAToken.Instruction) k = j; else break;
        }
        break;
      case VAToken.Comment:
        kind = { value: "comment" };
        for (let j = i + 1; j <= lineCount; j++) {
          if (lines[j].token == VAToken.Comment) k = j; else break;
        }
        break;
      case VAToken.Section:
        kind = { value: "region" };
        for (let j = i + 1; j <= lineCount; j++) {
          if (lines[j].token == VAToken.Section) break; else k = j;
        }
        break;
      case VAToken.Operator:
        for (let j = i + 1; j <= lineCount; j++) {
          let next = lines[j];
          if (next.token == VAToken.Section) break;
          if (next.token == VAToken.Empty) continue;
          if (next.token == VAToken.Comment) { k = j; continue; }
          if (next.token == VAToken.Multiline) { k = j; continue; }
          if (next.token == VAToken.Parameter) { k = j; continue; }
          if (next.indent <= line.indent) break; else k = j;
        } break;
    }
    if (k > i) result.push({ kind: kind, start: i, end: k });
    if (line.token == VAToken.Instruction || line.token == VAToken.Comment) i = k;
  }
  return result;
}
