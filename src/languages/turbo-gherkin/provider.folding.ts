import { ProviderBase } from "./provider.base";

enum VAToken {
  Empty = 0,
  Section,
  Operator,
  Comment,
  Instruction,
  Parameter,
}

interface VAIndent {
  token: VAToken;
  indent: number;
}

export class FoldingProvider extends ProviderBase {

  private static getIndent(text: string, tabSize: number) {
    let indent = 0;
    let length = text.search(/[^\s]/)
    for (let i = 0; i < length; i++) {
      if (text.charAt(i) == "\t") {
        indent = indent + tabSize - (indent % tabSize);
      } else indent++;
    }
    return indent + 1;
  }

  static getModelFolding(
    model: monaco.editor.ITextModel,
    context: monaco.languages.FoldingContext,
    token: monaco.CancellationToken,
  ): Array<monaco.languages.FoldingRange> {
    return this.getCodeFolding(
      model.getOptions().tabSize,
      model.getLineCount(),
      lineNumber => model.getLineContent(lineNumber)
    );
  }

  static getCodeFolding(
    tabSize: number,
    lineCount: number,
    getLineContent: (lineNumber: number) => string
  ): Array<monaco.languages.FoldingRange> {
    let lines: Array<VAIndent> = [{ token: VAToken.Empty, indent: 0 }];
    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
      let regexp = /(?<empty>^\s*$)|(?<instr>^[\s]*@)|(?<param>^[\s]*\|)|(?<comnt>^[\s]*[#|//])/;
      let text = getLineContent(lineNumber);
      let reg = regexp.exec(text);
      if (reg) {
        let token = VAToken.Empty;
        if (reg.groups.empty) token = VAToken.Empty;
        else if (reg.groups.comnt) token = VAToken.Comment;
        else if (reg.groups.param) token = VAToken.Parameter;
        else if (reg.groups.instr) token = VAToken.Instruction;
        lines.push({ token: token, indent: 0 });
      } else {
        let ident = 0;
        let token = VAToken.Operator;
        if (this.isSection(text)) token = VAToken.Section;
        else ident = this.getIndent(text, tabSize);
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
          kind = monaco.languages.FoldingRangeKind.Comment;
          for (let j = i + 1; j <= lineCount; j++) {
            if (lines[j].token == VAToken.Comment) k = j; else break;
          }
          break;
        case VAToken.Section:
          kind = monaco.languages.FoldingRangeKind.Region;
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
            if (next.token == VAToken.Parameter) { k = j; continue; }
            if (next.indent <= line.indent) break; else k = j;
          } break;
      }
      if (k > i) result.push({ kind: kind, start: i, end: k });
      if (line.token == VAToken.Instruction || line.token == VAToken.Comment) i = k;
    }
    return result;
  }
}
