export enum VanessaEditorEvent {
  UPDATE_BREAKPOINTS = "UPDATE_BREAKPOINTS",
  CONTENT_DID_CHANGE = "CONTENT_DID_CHANGE",
  POSITION_DID_CHANGE = "POSITION_DID_CHANGE",
  ON_HREF_CLICK = "ON_HREF_CLICK",
  PRESS_CTRL_S = "PRESS_CTRL_S",
  ON_KEY_DOWN = "ON_KEY_DOWN",
  ON_KEY_UP = "ON_KEY_UP",
}

export interface VanessaEditorMessage {
  type: string;
  data: any;
}

export class EventsManager {

  private editor: monaco.editor.IEditor;
  private messages: Array<VanessaEditorMessage> = [];

  constructor(
    editor: monaco.editor.IEditor
  ) {
    this.editor = editor;
  }

  public dispose(): void {
    this.editor = null;
  }

  get actions(): any {
    return this.editor.getSupportedActions().map(e => { return { id: e.id, alias: e.alias, label: e.label } });
  }

  public popMessage = () => this.messages.shift();

  public fireEvent(event: any, arg: any = undefined) {
    // tslint:disable-next-line: no-console
    console.debug("fireEvent: ", event, " : ", arg);
    this.messages.push({ type: event, data: arg });
    let fakeButtonFireClickEvent: HTMLButtonElement = document.getElementById("VanessaEditorEventForwarder") as HTMLButtonElement;
    fakeButtonFireClickEvent.click();
  }

  public show(selector: string, visible: boolean) {
    document.querySelectorAll("#VanessaEditorContainer>div").forEach((e: HTMLElement) => e.classList.add("vanessa-hidden"));
    if (visible) document.querySelector("#VanessaEditorContainer>div." + selector).classList.remove("vanessa-hidden");
  }

  public getLanguage = (filename: string): string => {
    let ext = "." + filename.split('.').pop().toLowerCase();
    let languages = monaco.languages.getLanguages();
    for (let key in languages) {
      let lang = languages[key];
      if (lang.extensions == undefined) continue;
      if (lang.extensions.find(e => e == ext)) return lang.id;
    }
  }

  public createModel(value: string, filename: string): monaco.editor.ITextModel {
    return monaco.editor.createModel(value, this.getLanguage(filename));
  }
}