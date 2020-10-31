import * as dom from 'monaco-editor/esm/vs/base/browser/dom';
import { VanessaEditor } from './vanessa-editor';
import { VanessaDiffEditor } from './vanessa-diff-editor';

const $ = dom.$;

export interface IVanessaEditor  {
  domNode(): HTMLElement;
  dispose(): void;
  resetModel: Function;
  getModel: Function;
  editor: any;
}

export interface IVanessaAction {
  id: string;
  title: string;
}

export enum VanessaEditorEvent {
  UPDATE_BREAKPOINTS = "UPDATE_BREAKPOINTS",
  CONTENT_DID_CHANGE = "CONTENT_DID_CHANGE",
  POSITION_DID_CHANGE = "POSITION_DID_CHANGE",
  ON_TAB_CLOSING = "ON_TAB_CLOSING",
  ON_TAB_SELECT = "ON_TAB_SELECT",
  ON_HREF_CLICK = "ON_HREF_CLICK",
  PRESS_CTRL_S = "PRESS_CTRL_S",
  ON_KEY_DOWN = "ON_KEY_DOWN",
  ON_KEY_UP = "ON_KEY_UP",
}

export interface VanessaEditorMessage {
  editor: IVanessaEditor;
  type: string;
  data: any;
}

export function initPage() {
  const domMain = $("div", { id: "VanessaContainer" },
    $("div.vanessa-hidden", { id: "VanessaTabsContainer" }),
    $("div", { id: "VanessaEditorContainer" }),
    $("botton", { id: "VanessaEditorEventForwarder" }),
  );
  document.body.appendChild(domMain);
}

function getLanguage(filename: string): string {
  let ext = "." + filename.split('.').pop().toLowerCase();
  let languages = monaco.languages.getLanguages();
  for (let key in languages) {
    let lang = languages[key];
    if (lang.extensions == undefined) continue;
    if (lang.extensions.some(e => e == ext)) return lang.id;
  }
}

export function createModel(value: string, filename: string, uri?: monaco.Uri): monaco.editor.ITextModel {
  const model = monaco.editor.createModel(value, getLanguage(filename), uri);
  Object.defineProperties(model, {
    savedVersionId: { value: model.getAlternativeVersionId(), writable: true },
  });
  //@ts-ignore
  model["isModified"] = () => model.getAlternativeVersionId() != model.savedVersionId;
  //@ts-ignore
  model["resetModified"] = () => model.savedVersionId = model.getAlternativeVersionId();
  return model;
}

export function disposeModel(model : monaco.editor.ITextModel): void {
  if (!model) return;
  if (VanessaEditor.findModel(model)) return;
  if (VanessaDiffEditor.findModel(model)) return;
  if (model) model.dispose();
}

export class EventsManager {

  private static messages: Array<VanessaEditorMessage> = [];
  private owner: IVanessaEditor;

  constructor(
    owner: IVanessaEditor
  ) {
    this.owner = owner;
  }

  public dispose(): void {
    this.owner = null;
  }

  get actions(): any {
    return this.owner.editor.getSupportedActions().map(e => { return { id: e.id, alias: e.alias, label: e.label } });
  }

  public static popMessage = () => EventsManager.messages.shift();

  public fireEvent(event: any, arg: any = undefined) {
    // tslint:disable-next-line: no-console
    console.debug("fireEvent: ", event, " : ", arg);
    EventsManager.messages.push({ editor: this.owner, type: event, data: arg });
    let fakeButtonFireClickEvent: HTMLButtonElement = document.getElementById("VanessaEditorEventForwarder") as HTMLButtonElement;
    fakeButtonFireClickEvent.click();
  }

  public static fireEvent(editor: IVanessaEditor, event: any, arg: any = undefined) {
    // tslint:disable-next-line: no-console
    console.debug("fireEvent: ", event, " : ", arg);
    EventsManager.messages.push({ editor: editor, type: event, data: arg });
    let fakeButtonFireClickEvent: HTMLButtonElement = document.getElementById("VanessaEditorEventForwarder") as HTMLButtonElement;
    fakeButtonFireClickEvent.click();
  }
}
