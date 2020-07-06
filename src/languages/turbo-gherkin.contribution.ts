interface ILangImpl {
  conf: monaco.languages.LanguageConfiguration;
  language: monaco.languages.IMonarchLanguage;
}

const language: monaco.languages.ILanguageExtensionPoint = { id: "turbo-gherkin" };

monaco.languages.register(language);
monaco.languages.onLanguage(language.id, () => {
  import("./turbo-gherkin").then((module: ILangImpl) => {
    monaco.languages.setLanguageConfiguration(language.id, module.conf);
    monaco.languages.setMonarchTokensProvider(language.id, module.language);
  });
});

monaco.languages.registerCompletionItemProvider(language.id, {
  provideCompletionItems: (model, position) =>
    window["VanessaGherkinProvider"].getSuggestions(model, position)
});

monaco.languages.registerHoverProvider(language.id, {
  provideHover: (model, position) =>
    window["VanessaGherkinProvider"].getHoverContents(model, position)
});

monaco.languages.registerCodeActionProvider(language.id, {
  provideCodeActions: (model, range, context, token) =>
    window["VanessaGherkinProvider"].getCodeAction(model, range, context, token)
});

enum VanessaToken {
  Empty = 0,
  Section = 1,
  Operator = 2,
  Comment = 3,
  Parameter = 4
}

interface VanessaIndent {
  token: VanessaToken;
  indent: number;
}

monaco.languages.registerFoldingRangeProvider(language.id, {
  provideFoldingRanges: (model: monaco.editor.ITextModel, context, token) => {
    let getIndent = (text: string, tabSize: number) => {
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
    let isSection = (text: string) => {
      let pos = text.indexOf(":");
      if (pos == -1) return false;
      text = text.substring(0, pos);
      let regexp = /([^\s"']+|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/g;
      let line = text.match(regexp) || [];
      let keywords = window["VanessaGherkinProvider"].keywords;
      return keywords.some((item: Array<string>) =>
        item.length == line.length && item.every((w: string, i: number) => line[i] && w == line[i].toLowerCase())
      );
    };
    let isParameter = (text: string) => /^[\s]*\|/.test(text);
    let isComment = (text: string) => /^[\s]*[#|//]/.test(text);
    let lines: Array<VanessaIndent> = [{ token: VanessaToken.Empty, indent: 0 }];
    let lineCount = model.getLineCount();
    let tabSize = model.getOptions().tabSize;
    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
      let text = model.getLineContent(lineNumber);
      let indent = getIndent(text, tabSize);
      let token = VanessaToken.Empty;
      if (indent) {
        if (isParameter(text)) token = VanessaToken.Parameter;
        else if (isComment(text)) token = VanessaToken.Comment;
        else if (isSection(text)) token = VanessaToken.Section;
        else token = VanessaToken.Operator;
      }
      lines.push({ indent: indent, token: token });
    }
    let result = [];
    for (let i = 1; i <= lineCount; i++) {
      let line = lines[i];
      if (line.indent == 0) continue;
      let k = i;
      let kind = new monaco.languages.FoldingRangeKind("Operator");
      switch (line.token) {
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
      if (line.token == VanessaToken.Comment) i = k;
    }
    return result;
  }
});
