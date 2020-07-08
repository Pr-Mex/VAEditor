import { ProviderBase } from "./provider.base";
import { VanessaEditor } from "../../vanessa-editor";

export class ActionProvider extends ProviderBase {

  private static addQuickFix(model: monaco.editor.ITextModel, list: any, error: monaco.editor.IMarkerData) {
    let range = {
      startLineNumber: error.startLineNumber,
      endLineNumber: error.endLineNumber,
      startColumn: error.startColumn,
      endColumn: error.endColumn,
    };
    let value = model.getValueInRange(range);
    let words = this.key(this.filterWords(this.splitWords(value))).split(' ');
    for (let key in this.steps) {
      let sum = 0; let k = {};
      var step = key.split(' ');
      words.forEach((w: string) => k[w] ? k[w] += 1 : k[w] = 1);
      step.forEach((w: string) => k[w] ? k[w] -= 1 : k[w] = -1);
      for (let i in k) sum = sum + Math.abs(k[i]);
      if (sum < 3) list.push({ key: key, sum: sum, error: error });
    }
  }

  // FIX ERROR !!! https://github.com/microsoft/monaco-editor/issues/1548
  private static getQuickFix(
    model: monaco.editor.ITextModel,
    markers: monaco.editor.IMarkerData[]
  ): monaco.languages.CodeActionList {
    let list = [];
    let actions: Array<monaco.languages.CodeAction> = [];
    let editor: monaco.editor.IStandaloneCodeEditor = window["VanessaEditor"].editor;
    markers.forEach(e => this.addQuickFix(editor.getModel(), list, e));
    list.sort((a, b) => a.sum - b.sum);
    list.forEach((e, i) => {
      if (i > 6) return;
      let step = this.steps[e.key];
      actions.push({
        title: step.label,
        diagnostics: [e.error],
        kind: "quickfix",
        edit: {
          edits: [{
            resource: model.uri,
            edit: { range: e.error, text: step.insertText }
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