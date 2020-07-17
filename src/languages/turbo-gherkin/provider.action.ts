import { ProviderBase } from "./provider.base";
import { VanessaEditor } from "../../vanessa-editor";

export class ActionProvider extends ProviderBase {

  private static addQuickFix(model: monaco.editor.ITextModel, list: any, error: monaco.editor.IMarkerData) {
    let range = {
      startLineNumber: error.startLineNumber,
      endLineNumber: error.endLineNumber,
      startColumn: 1,
      endColumn: error.endColumn,
    };
    let value = model.getValueInRange(range);
    let words = this.splitWords(value);
    let keyword = this.findKeyword(words);
    if (keyword == undefined) return;
    let regexp = "^[\\s]*";
    keyword.forEach(w => regexp += w + "[\\s]+");
    let match = value.toLowerCase().match(new RegExp(regexp));
    if (match) range.startColumn = match[0].length + 1;
    let line = this.key(this.filterWords(words)).split("-");
    for (let key in this.steps) {
      let sum = 0; let k = {};
      var step = key.split('-');
      line.forEach((w: string) => k[w] ? k[w] += 1 : k[w] = 1);
      step.forEach((w: string) => k[w] ? k[w] -= 1 : k[w] = -1);
      for (let i in k) sum = sum + Math.abs(k[i]);
      if (sum < 4) list.push({ key: key, sum: sum, error: error, range: range, words: words });
    }
  }

  private static replaceParams(step: string[], line: string[]): string {
    let index = 0;
    step = this.filterWords(step);
    let regexp = /^"[^"]*"$|^'[^']*'$|^<[^<]*>$/g;
    let test = (w: string) => (new RegExp(regexp.source)).test(w);
    let params = line.filter(w => test(w));
    return step.map(w => (test(w) && index < params.length) ? params[index++] : w ).join(' ');
  }

  private static getQuickFix(
    model: monaco.editor.ITextModel,
    markers: monaco.editor.IMarkerData[]
  ): monaco.languages.CodeActionList {
    let list = [];
    let actions: Array<monaco.languages.CodeAction> = [];
    markers.forEach(e => this.addQuickFix(model, list, e));
    list.sort((a, b) => a.sum - b.sum);
    list.forEach((e, i) => {
      if (i > 6) return;
      let step = this.steps[e.key];
      let text = this.replaceParams(step.head, e.words);
      actions.push({
        title: text,
        diagnostics: [e.error],
        kind: "quickfix",
        edit: {
          edits: [{
            resource: model.uri,
            edit: { range: e.range, text: text }
          }]
        },
        isPreferred: true
      });
    });
    return { actions: actions, dispose: () => { } };
  }

  public static getCodeAction(model: monaco.editor.ITextModel
    , range: monaco.Range
    , context: monaco.languages.CodeActionContext
    , token: monaco.CancellationToken
  ): monaco.languages.CodeActionList {
    if (context.markers.length == 0) return undefined;
    if (context.markers.every(e => e.severity != monaco.MarkerSeverity.Error)) return undefined;
    if (context.only == "quickfix") return this.getQuickFix(model, context.markers);
    let actions = [];
    let ve = window["VanessaEditor"] as VanessaEditor;
    if (ve) ve.actionManager.codeActions.forEach((e: any) => {
      actions.push({ command: { id: e.id }, title: e.title });
    });
    return { actions: actions, dispose: () => { } };
  }
}