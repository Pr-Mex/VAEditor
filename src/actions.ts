import { VanessaEditor } from "./vanessa-editor";

export interface IVanessaAction {
  id: string;
  title: string;
}

interface IVanessaCommand {
  eventId: string;
  keyCode: string;
  keyMod: Array<string>;
  title: string;
  errorLink: string;
  script: string;
}

export enum VanessaEditorEvent {
  UPDATE_BREAKPOINTS = "UPDATE_BREAKPOINTS",
  CONTENT_DID_CHANGE = "CONTENT_DID_CHANGE",
  POSITION_DID_CHANGE = "POSITION_DID_CHANGE",
  ON_KEY_DOWN = "ON_KEY_DOWN",
  ON_KEY_UP = "ON_KEY_UP",
}

export interface VanessaEditorMessage {
  type: string;
  data: any;
}

export class ActionManager {

  private editor: monaco.editor.IStandaloneCodeEditor;
  private messages: Array<VanessaEditorMessage> = [];
  public codeActions: Array<IVanessaAction> = [];
  public errorLinks: Array<IVanessaAction> = [];
  public codeLens: Array<IVanessaAction> = [];
  public traceKeyboard: boolean = false;

  constructor(
    editor: monaco.editor.IStandaloneCodeEditor
  ) {
    this.editor = editor;
    this.editor.onKeyDown(e => { if (this.traceKeyboard) this.fireEvent(VanessaEditorEvent.ON_KEY_DOWN, e) });
    this.editor.onKeyUp(e => { if (this.traceKeyboard) this.fireEvent(VanessaEditorEvent.ON_KEY_UP, e) });
    this.editor.onDidChangeModelContent(() => this.fireEvent(VanessaEditorEvent.CONTENT_DID_CHANGE));
    this.editor.onDidChangeCursorPosition(
      (e: monaco.editor.ICursorPositionChangedEvent) => {
        this.fireEvent(VanessaEditorEvent.POSITION_DID_CHANGE, { lineNumber: e.position.lineNumber, column: e.position.column })
      }
    );
  }

  public dispose(): void {
    this.editor = null;
  }

  get actions(): any {
    return this.editor.getSupportedActions().map(e => { return { id: e.id, alias: e.alias, label: e.label } });
  }

  public popMessage = () => this.messages.shift();

  public insertText(text: string, arg: string = undefined) {
    let position = this.editor.getPosition();
    let range = arg ? JSON.parse(arg) : new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
    let operation = { range: range, text: text, forceMoveMarkers: true };
    this.editor.executeEdits("vanessa-editor", [operation]);
  }

  public addCommands(commands: Array<IVanessaCommand>) {
    commands.forEach((e: IVanessaCommand) => {
      if (e.errorLink) {
        this.errorLinks.push({ id: e.eventId, title: e.errorLink });
      } else {
        let keybinding: number = e.keyCode ? Number(monaco.KeyCode[e.keyCode]) : undefined;
        if (e.keyMod) e.keyMod.forEach((id: string) => keybinding |= Number(monaco.KeyMod[id]));
        let id: string = this.editor.addCommand(keybinding, (c, a) => {
          let v: VanessaEditor = window["VanessaEditor"];
          let n = a ? a : v.getPosition().lineNumber;
          v.fireEvent(`${e.eventId}`, n);
          eval.apply(null, [`${e.script}`]);
        });
        if (e.title) { this.codeActions.push({ id: id, title: e.title }); }
      }
    });
  }

  public setSuggestWidgetWidth(arg: any) {
    const id = 'vanessa-suggest-widget-style';
    let style = document.getElementById(id) as HTMLElement;
    if (style == null) {
      style = document.createElement('style');
      style.setAttribute("type", "text/css");
      style.id = id;
      document.head.appendChild(style)
    }
    let width = typeof (arg) == "number" ? String(arg) + 'px' : arg;
    style.innerHTML = `.suggest-widget{width:${width} !important}`;
  }

  public fireEvent(event: any, arg: any = undefined) {
    // tslint:disable-next-line: no-console
    console.debug("fireEvent: ", event, " : ", arg);
    this.messages.push({ type: event, data: arg });
    let fakeButtonFireClickEvent: HTMLButtonElement = document.getElementById("VanessaEditorEventForwarder") as HTMLButtonElement;
    fakeButtonFireClickEvent.click();
  }
}
