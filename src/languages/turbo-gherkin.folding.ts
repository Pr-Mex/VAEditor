enum VanessaToken {
  Empty = 0,
  Section,
  Operator,
  Comment,
  Instruction,
  Parameter,
}

interface VanessaIndent {
  token: VanessaToken;
  indent: number;
}

export class VanessaFoldingProvider {

  private static getIndent(text: string, tabSize: number) {
    let length = text.search(/[^\s]/)
    if (length == -1) return 0;
    let indent = 0;
    for (let i = 0; i < length; i++) {
      if (text.charAt(i) == "\t")
        indent = indent + tabSize - (indent % tabSize);
      else indent++;
    }
    return indent + 1;
  }

  private static isSection(text: string) {
    let regexp = /[^:\s]+(?=.*:)/g;
    let line = text.match(regexp);
    if (line == null) return false;
    let keywords = window["VanessaGherkinProvider"].keywords;
    return keywords.some((item: string[]) =>
      item.length == line.length && item.every((w: string, i: number) => line[i] && w == line[i].toLowerCase())
    );
  };

  private static isInstruction(text: string) {
    return /^[\s]*@/.test(text);
  }

  private static isParameter(text: string) {
    return /^[\s]*\|/.test(text);
  }

  private static isComment(text: string) {
    return /^[\s]*[#|//]/.test(text);
  }

  static getModelFolding(
    model: monaco.editor.ITextModel
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
    let lines: Array<VanessaIndent> = [{ token: VanessaToken.Empty, indent: 0 }];
    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
      let text = getLineContent(lineNumber);
      let indent = this.getIndent(text, tabSize);
      let token = VanessaToken.Empty;
      if (indent) {
        if (this.isInstruction(text)) token = VanessaToken.Instruction;
        else if (this.isParameter(text)) token = VanessaToken.Parameter;
        else if (this.isComment(text)) token = VanessaToken.Comment;
        else if (this.isSection(text)) token = VanessaToken.Section;
        else token = VanessaToken.Operator;
      }
      lines.push({ indent: indent, token: token });
    }
    let result = [];
    for (let i = 1; i <= lineCount; i++) {
      let k = i;
      let line = lines[i];
      let kind = undefined;
      switch (line.token) {
        case VanessaToken.Instruction:
          for (let j = i + 1; j <= lineCount; j++) {
            if (lines[j].token == VanessaToken.Instruction) k = j; else break;
          }
          break;
        case VanessaToken.Comment:
          kind = monaco.languages.FoldingRangeKind.Comment;
          for (let j = i + 1; j <= lineCount; j++) {
            if (lines[j].token == VanessaToken.Comment) k = j; else break;
          }
          break;
        case VanessaToken.Section:
          kind = monaco.languages.FoldingRangeKind.Region;
          for (let j = i + 1; j <= lineCount; j++) {
            if (lines[j].token == VanessaToken.Section) break; else k = j;
          }
          break;
        case VanessaToken.Operator:
          for (let j = i + 1; j <= lineCount; j++) {
            let next = lines[j];
            if (next.token == VanessaToken.Section) break;
            if (next.token == VanessaToken.Empty) continue;
            if (next.token == VanessaToken.Comment) { k = j; continue; }
            if (next.token == VanessaToken.Parameter) { k = j; continue; }
            if (next.indent <= line.indent) break; else k = j;
          } break;
      }
      if (k > i) result.push({ kind: kind, start: i, end: k });
      if (line.token == VanessaToken.Instruction || line.token == VanessaToken.Comment) i = k;
    }
    return result;
  }
}
