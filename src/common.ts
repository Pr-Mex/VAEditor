import * as dom from "monaco-editor/esm/vs/base/browser/dom";
import { VanessaEditor } from "./vanessa-editor";
import { VanessaDiffEditor } from "./vanessa-diff-editor";
import { IVanessaModel } from "./languages/turbo-gherkin/common";
import { clearWorkerCache } from "./languages/turbo-gherkin/provider";

const $ = dom.$;

export enum VAEditorType {
  CodeEditor,
  DiffEditor,
  MarkdownViwer,
}

export type WhitespaceType = "none" | "boundary" | "selection" | "all";
export interface IVanessaEditor {
  domNode(): HTMLElement;
  dispose(): void;
  focus(): void;
  trigger: Function;
  resetModel: Function;
  getModel: Function;
  editor: any;
  type: VAEditorType;
  filepath?: string;
}

export interface IVanessaAction {
  id: string;
  title: string;
}

export enum VanessaEditorEvent {
  UPDATE_BREAKPOINTS = "UPDATE_BREAKPOINTS",
  ON_TAB_CLOSING = "ON_TAB_CLOSING",
  ON_TAB_SELECT = "ON_TAB_SELECT",
  ON_HREF_CLICK = "ON_HREF_CLICK",
  ON_LINK_CLICK = "ON_LINK_CLICK",
  ON_MARK_CLICK = "ON_MARK_CLICK",
  REQUEST_IMAGE = "REQUEST_IMAGE",
  PRESS_CTRL_S = "PRESS_CTRL_S",
  PRESS_ESCAPE = "PRESS_ESCAPE",
}

export interface VanessaEditorMessage {
  editor: IVanessaEditor;
  type: string;
  data: any;
}

export function initPage() {
  const domMain = $(
    "div",
    { id: "VanessaContainer" },
    $("div.vanessa-hidden", { id: "VanessaTabsContainer" }),
    $("div", { id: "VanessaEditorContainer" }),
    $("button", { id: "VanessaEditorEventForwarder" })
  );
  document.body.appendChild(domMain);
}

function getLanguage(filename: string): string {
  let ext = "." + filename.split(".").pop().toLowerCase();
  let languages = monaco.languages.getLanguages();
  for (let key in languages) {
    let lang = languages[key];
    if (lang.extensions == undefined) continue;
    if (lang.extensions.some((e) => e == ext)) return lang.id;
  }
}

export function createModel(
  value: string,
  filename: string,
  uri?: monaco.Uri
): monaco.editor.ITextModel {
  const model = monaco.editor.createModel(
    value,
    getLanguage(filename),
    uri
  ) as IVanessaModel;
  Object.defineProperties(model, {
    savedVersionId: { value: model.getAlternativeVersionId(), writable: true },
  });
  model.isModified = () =>
    model.getAlternativeVersionId() != model.savedVersionId;
  model.resetModified = () =>
    (model.savedVersionId = model.getAlternativeVersionId());
  model.onWillDispose(() => clearWorkerCache(model.uri));
  return model;
}

export function disposeModel(model: monaco.editor.ITextModel): void {
  if (!model) return;
  if (VanessaEditor.findModel(model)) return;
  if (VanessaDiffEditor.findModel(model)) return;
  if (model) model.dispose();
}

function emitEventTo1C(
  name: string,
  data: any,
  editor: IVanessaEditor,
  event: Event | undefined
) {
  //отключаем стандартную обработку события
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  let eventData = data || "";
  if (typeof eventData === "object") {
    eventData = JSON.stringify(eventData);
  }
  let lastEvent = new CustomEvent("click", {
    bubbles: true,
    cancelable: true,
    composed: false,
    detail: {
      name: name,
      data: eventData,
      editor,
    },
  });
  lastEvent.preventDefault();

  const fakeButtonFireClickEvent: HTMLButtonElement = document.getElementById(
    "VanessaEditorEventForwarder"
  ) as HTMLButtonElement;
  fakeButtonFireClickEvent.dispatchEvent(lastEvent);
}

export class EventsManager {
  private static messages: Array<VanessaEditorMessage> = [];
  private owner: IVanessaEditor;

  constructor(owner: IVanessaEditor) {
    this.owner = owner;
  }

  public dispose(): void {
    this.owner = null;
  }

  get actions(): any {
    return this.owner.editor.getSupportedActions().map((e) => {
      return { id: e.id, alias: e.alias, label: e.label };
    });
  }

  public static popMessage = () => EventsManager.messages.shift();

  public fireEvent(event: string, arg: any = undefined) {
    // tslint:disable-next-line: no-console
    console.debug("fireEvent:", event, arg);

    emitEventTo1C(event, arg, this.owner, undefined);
  }

  public static fireEvent(
    editor: IVanessaEditor,
    event: string,
    arg: any = undefined
  ) {
    // tslint:disable-next-line: no-console
    console.debug("fireEvent:", event, arg);
    emitEventTo1C(event, arg, editor, undefined);
  }
}
