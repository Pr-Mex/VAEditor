import { IWorkerModel, VAIndent, VAToken } from "./common";
import { IDirectExp, KeywordMatcher } from "./matcher";

function getIndent(text: string, tabSize: number) {
  let indent = 0;
  let length = text.search(/\S/)
  for (let i = 0; i < length; i++) {
    if (text.charAt(i) == "\t") {
      indent = indent + tabSize - (indent % tabSize);
    } else indent++;
  }
  return indent + 1;
}

function getToken(text: string, sppr: boolean, direct: IDirectExp) {
  if (sppr) {
    if (/^\s*\/\*.*$/.test(text)) return VAToken.StartComment;
    if (/^.*\*\/\s*/.test(text)) return VAToken.EndComment;
  }
  if (/^\s*$/.test(text)) return VAToken.Empty;
  if (/^[\s]*@/.test(text)) return VAToken.Instruction;
  if (/^[\s]*\|/.test(text)) return VAToken.Parameter;
  if (/^[\s]*[#|//]/.test(text)) return VAToken.Comment;
  if (/^[\s]*"""/.test(text)) return VAToken.Multiline;
  if (/^[\s]*\*/.test(text)) return VAToken.Asterisk;
  return VAToken.Operator;
}

export function getModelTokens(
  matcher: KeywordMatcher,
  model: IWorkerModel,
  tabSize: number,
): Array<VAIndent> {
  const tokens: Array<VAIndent> = [];
  let multilineParam = false;
  let multilineComment = false;
  const lineCount = model.getLineCount();
  for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
    let text = model.getLineContent(lineNumber);
    let token = getToken(text, matcher.sppr, matcher.directives);
    if (multilineParam) {
      if (token == VAToken.Multiline) {
        multilineParam = false;
      }
      token = VAToken.Multiline;
    } else if (multilineComment) {
      if (token == VAToken.EndComment) {
        console.log("EndComment", lineNumber)
        multilineComment = false;
      }
      token = VAToken.Comment;
    } else {
      if (token == VAToken.Multiline) {
        multilineParam = true;
      } else if (token == VAToken.StartComment) {
        multilineComment = true;
        token = VAToken.Comment;
      }
    }
    if (token != VAToken.Operator && token != VAToken.Asterisk) {
      const indent = getIndent(text, tabSize);
      tokens.push({ token, indent });
    } else {
      let indent = 0;
      if (matcher.isSection(text)) token = VAToken.Section;
      else indent = getIndent(text, tabSize);
      tokens.push({ token, indent });
    }
  }
  return tokens;
}

export class WorkerModel implements IWorkerModel {
  private tokens: Array<VAIndent> = [];
  private content: string[];
  private versionId: number;

  constructor(matcher: KeywordMatcher, msg: any) {
    this.content = msg.content;
    this.versionId = msg.versionId;
    this.tokens = getModelTokens(matcher, this, msg.tabSize);
  }

  getLineContent(lineNumber: number): string {
    return this.content[lineNumber - 1];
  }

  getLineCount(): number {
    return this.content.length;
  }

  getLineToken(lineNumber: number): VAIndent {
    return this.tokens[lineNumber - 1];
  }
}
