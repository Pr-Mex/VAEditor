import { VanessaEditor } from "./vanessa-editor";
import { VanessaEditorEvent, IVanessaAction } from "./common";
import { VanessaGherkinProvider } from "./languages/turbo-gherkin/provider";

interface IVanessaCommand {
  eventId: string;
  keyCode: string;
  keyMod: Array<string>;
  title: string;
  errorLink: string;
  script: string;
}

export class ActionManager {

  public owner: VanessaEditor;
  public editor: monaco.editor.IStandaloneCodeEditor;
  public codeActions: Array<IVanessaAction> = [];
  public codeLens: Array<IVanessaAction> = [];
  private codiconDecorations: string[] = [];
  public traceKeyboard: boolean = false;

  constructor(
    owner: VanessaEditor
  ) {
    this.owner = owner;
    this.editor = owner.editor;
    this.editor.onKeyDown(e => { if (this.traceKeyboard) this.owner.fireEvent(VanessaEditorEvent.ON_KEY_DOWN, e) });
    this.editor.onKeyUp(e => { if (this.traceKeyboard) this.owner.fireEvent(VanessaEditorEvent.ON_KEY_UP, e) });
    this.editor.onDidChangeModelContent(() => this.owner.fireEvent(VanessaEditorEvent.CONTENT_DID_CHANGE));
    this.editor.onDidChangeCursorPosition(
      (e: monaco.editor.ICursorPositionChangedEvent) => {
        this.owner.fireEvent(VanessaEditorEvent.POSITION_DID_CHANGE, { lineNumber: e.position.lineNumber, column: e.position.column })
      }
    );
    //@ts-ignore
    let service = this.editor.getContribution('editor.contrib.hover')._openerService;
    service._original_open = service.open;
    service.open = (target: any, options: any) => {
      if (typeof (target) == "string") {
        if (/^\s*(https?:\/\/|e1cib\/)/.test(target)) {
          this.owner.fireEvent(VanessaEditorEvent.ON_HREF_CLICK, target);
          return { catch: () => { } };
        }
        if (/^\s*link:/.test(target)) {
          const promise = VanessaGherkinProvider.instance.getLinkData(this.editor.getModel(), target.substr(5));
          promise.then((data) => this.owner.fireEvent(VanessaEditorEvent.ON_LINK_CLICK, JSON.stringify(data)));
          return { catch: () => { } };
        }
      }
      return service._original_open(target, options);
    };
  }

  public dispose(): void {
    this.editor = null;
  }

  get actions(): any {
    return this.editor.getSupportedActions().map(e => { return { id: e.id, alias: e.alias, label: e.label } });
  }

  public insertText(text: string, arg: string = undefined) {
    let position = this.editor.getPosition();
    let range = arg ? JSON.parse(arg) : new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
    let operation = { range: range, text: text, forceMoveMarkers: true };
    this.editor.executeEdits("vanessa-editor", [operation]);
  }

  public addCommands(commands: Array<IVanessaCommand>) {
    commands.forEach((e: IVanessaCommand) => {
      let keybinding: number = e.keyCode ? Number(monaco.KeyCode[e.keyCode]) : undefined;
      if (e.keyMod) e.keyMod.forEach((id: string) => keybinding |= Number(monaco.KeyMod[id]));
      let id: string = this.editor.addCommand(keybinding, (c, a) => {
        let n = a ? a : this.owner.getPosition().lineNumber;
        this.owner.fireEvent(`${e.eventId}`, n);
        eval.apply(null, [`${e.script}`]);
      });
      if (e.title) { this.codeActions.push({ id: id, title: e.title }); }
    });
  }

  public getCodicon(line: number): string[] {
    const codicons = [];
    const model: monaco.editor.ITextModel = this.editor.getModel();
    model.getLinesDecorations(line, line).forEach(d => {
      if (this.codiconDecorations.some(id => id === d.id)) {
        codicons.push(d.options.glyphMarginClassName);
      }
    });
    return codicons;
  }

  public setCodicon(arg: any, codicon: string = undefined) {
    let lines = typeof (arg) == "string" ? JSON.parse(arg) : arg;
    if (typeof (lines) == "number") lines = [lines];
    const oldDecorations = [];
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    const model: monaco.editor.ITextModel = this.editor.getModel();
    lines.forEach((line: number) => {
      model.getLinesDecorations(line, line).forEach(d => {
        let i = this.codiconDecorations.indexOf(d.id);
        if (i >= 0) {
          this.codiconDecorations.splice(i, 1);
          oldDecorations.push(d.id);
        }
      });
      if (codicon) decorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          glyphMarginClassName: codicon,
        }
      });
    });
    const newDecorations = this.editor.deltaDecorations(oldDecorations, decorations);
    newDecorations.forEach(s => this.codiconDecorations.push(s));
  }

  public clearCodicons() {
    this.codiconDecorations = this.editor.deltaDecorations(this.codiconDecorations, []);
  }

  public static setSuggestWidgetWidth(arg: any) {
    const id = 'vanessa-suggest-widget-style';
    let style = document.getElementById(id);
    if (style == null) {
      style = document.createElement('style');
      style.setAttribute("type", "text/css");
      style.id = id;
      document.head.appendChild(style)
    }
    let width = typeof (arg) == "number" ? String(arg) + 'px' : arg;
    style.innerHTML = `.suggest-widget{width:${width} !important}`;
  }
}
