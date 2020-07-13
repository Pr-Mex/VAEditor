import { ProviderBase } from "./provider.base";

export class SuggestProvider extends ProviderBase {

  private static empty(position: monaco.Position
  ): monaco.languages.CompletionList {
    return {
      suggestions: [{
        label: '',
        insertText: '',
        kind: monaco.languages.CompletionItemKind.Function,
        range: {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: position.column - 1,
          endColumn: position.column,
        },
      }]
    };
  }

  public static getSuggestions(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ): monaco.languages.CompletionList {
    let line = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: model.getLineMinColumn(position.lineNumber),
      endColumn: model.getLineMaxColumn(position.lineNumber),
    };
    let wordRange = undefined;
    let regexp = /"[^"]*"|'[^']*'|<[^\s"']*>/g;
    let words = model.findMatches(regexp.source, line, true, false, null, false) || [];
    words.forEach(e => {
      if (e.range.startColumn <= position.column && position.column <= e.range.endColumn) {
        wordRange = e.range;
      }
    });
    let result = [];
    if (wordRange) {
      let variable = model.getValueInRange(wordRange);
      let Q1 = variable.charAt(0);
      let Q2 = variable.charAt(variable.length - 1);
      let S = /^.\$.+\$.$/.test(variable) ? "$" : "";
      for (let name in this.variables) {
        let item = this.variables[name];
        result.push({
          label: `"${S}${item.name}${S}" = ${item.value}`,
          filterText: variable + `${S}${item.name}${S}`,
          insertText: `${Q1}${S}${item.name}${S}${Q2}`,
          kind: monaco.languages.CompletionItemKind.Variable,
          range: wordRange
        })
      }
    } else {
      let maxColumn = model.getLineLastNonWhitespaceColumn(position.lineNumber);
      if (maxColumn && position.column < maxColumn) return this.empty(position);
      let minColumn = model.getLineFirstNonWhitespaceColumn(position.lineNumber);
      let line = model.getLineContent(position.lineNumber);
      let words = line.match(/[^\s]+/g) || [];
      let keyword = this.findKeyword(words);
      let range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: minColumn ? minColumn : position.column,
        endColumn: maxColumn ? maxColumn : position.column,
      };
      if (keyword) {
        let keytext = keyword.join(' ');
        keytext = keytext.charAt(0).toUpperCase() + keytext.slice(1);
        for (let key in this.steps) {
          var e = this.steps[key];
          if (e.documentation) {
            result.push({
              label: e.label,
              kind: e.kind ? e.kind : monaco.languages.CompletionItemKind.Function,
              detail: e.section,
              documentation: e.documentation,
              sortText: e.sortText,
              insertText: keytext + ' ' + e.insertText + '\n',
              filterText: keytext + ' ' + key,
              range: range
            });
          }
        }
      } else {
        for (let key in this.steps) {
          var e = this.steps[key];
          if (e.documentation) {
            result.push({
              label: e.label,
              kind: e.kind ? e.kind : monaco.languages.CompletionItemKind.Function,
              detail: e.section,
              documentation: e.documentation,
              sortText: e.sortText,
              insertText: e.keyword + ' ' + e.insertText + '\n',
              filterText: key,
              range: range
            });
          }
        }
      }
    }
    return { suggestions: result };
  }
}