import { ProviderBase } from "./provider.base";

export class SuggestProvider extends ProviderBase {
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
      let Q1 = variable[0];
      let Q2 = variable[variable.length - 1];
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
    }
    else {
      let maxColumn = model.getLineMaxColumn(position.lineNumber);
      if (position.column != maxColumn) return undefined;
      let word = model.getWordUntilPosition(position);
      let prev = model.findNextMatch(/[^\s]/.source, { lineNumber: position.lineNumber, column: 0 }, true, false, null, false);
      let minColumn = prev ? Math.min(prev.range.startColumn, word.startColumn) : word.startColumn;
      let range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: minColumn,
        endColumn: maxColumn
      };
      for (let key in this.steps) {
        var e = this.steps[key];
        if (e.documentation) {
          result.push({
            label: e.label,
            kind: e.kind ? e.kind : monaco.languages.CompletionItemKind.Function,
            detail: e.section,
            documentation: e.documentation,
            insertText: e.insertText + "\n",
            sortText: e.sortText,
            filterText: key,
            range: range
          });
        }
      }
    }
    return { suggestions: result };
  }
}