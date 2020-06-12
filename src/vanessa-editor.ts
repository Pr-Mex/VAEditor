import * as monaco from "monaco-editor";

import "./languages/turbo-gherkin.contribution";

import { BreakpointManager, RuntimeProcessManager } from "./debug";
import { ProblemManager } from "./problems";
import { Entry } from "webpack";

export enum VanessaEditorEvent {
  UPDATE_BREAKPOINTS = "UPDATE_BREAKPOINTS",
  CONTENT_DID_CHANGE = "CONTENT_DID_CHANGE",
  POSITION_DID_CHANGE = "POSITION_DID_CHANGE",
  CHANGE_UNDO_REDO = "CHANGE_UNDO_REDO",
  ON_KEY_DOWN = "ON_KEY_DOWN",
  ON_KEY_UP = "ON_KEY_UP",
}

export interface VanessaEditorMessage {
  type: VanessaEditorEvent;
  data: any;
}

export interface VanessaCommandItem {
  eventId: string;
  keyCode: string;
  keyMod: Array<string>;
  script: string;
}

export interface VanessaCodeAction {
  id: string;
  title: string;
}

export class VanessaEditor {

  // 1C:Enterprise interaction call.
  public undo: Function;
  public redo: Function;
  public addCommands: Function;
  public checkSyntax: Function;
  public popMessage: Function;
  public getActions: Function;
  public getContent: Function;
  public getLineContent: Function;
  public getSelectedContent: Function;
  public getPosition: Function;
  public getSelection: Function;
  public insertText: Function;
  public setContent: Function;
  public setPosition: Function;
  public setReadOnly: Function;
  public setTheme: Function;
  public revealLine: Function;
  public setRuntimeProgress: Function;
  public getRuntimeProgress: Function;
  public clearRuntimeProgress: Function;
  public showRuntimeError: Function;
  public clearRuntimeErrors: Function;
  public setSuggestWidgetWidth: Function;
  public decorateBreakpoints: Function;
  public decorateProblems: Function;
  public toggleBreakpoint: Function;
  public showMessage: Function;
  public fireEvent: Function;
  public refresh: Function;

  public editor: monaco.editor.IStandaloneCodeEditor;
  public useKeyboardTracer: boolean;

  private breakpointManager: BreakpointManager;
  private runtimeProcessManager: RuntimeProcessManager;
  private problemManager: ProblemManager;
  private syntaxTimer: any = 0;

  public codeActions: Array<VanessaCodeAction>;
  public codeLens: Array<VanessaCodeAction>;
  private messages: Array<VanessaEditorMessage>;
  private initialVersion: number;
  private currentVersion: number;
  private lastVersion: number;

  constructor(content: string, language: string) {
    this.editor = monaco.editor.create(document.getElementById("VanessaEditor"), {
      language: language,
      scrollBeyondLastLine: false,
      glyphMargin: true,
      automaticLayout: true,
      lightbulb: { enabled: true }
    });
    this.messages = [];
    this.codeActions = [];
    this.codeLens = [];
    this.editor.setValue(content);
    this.resetHistory();

    this.breakpointManager = new BreakpointManager(this);
    this.runtimeProcessManager = new RuntimeProcessManager(this);
    this.problemManager = new ProblemManager(this);
    this.subscribeEditorEvents();

    this.undo = () => this.editor.trigger('undo…', 'undo', undefined);
    this.redo = () => this.editor.trigger('undo…', 'redo', undefined);
    this.popMessage = () => this.messages.shift();
    this.getContent = () => this.editor.getValue();
    this.getLineContent = (num: number) => this.editor.getModel().getLineContent(num);
    this.getSelectedContent = () => this.editor.getModel().getValueInRange(this.editor.getSelection());
    this.getPosition = () => this.editor.getPosition();
    this.getSelection = () => this.editor.getSelection();
    this.setPosition = (lineNumber: number, column: number) => this.editor.setPosition({ lineNumber: lineNumber, column: column });
    this.setReadOnly = (arg: boolean) => this.editor.updateOptions({ readOnly: arg });
    this.setTheme = (arg: string) => monaco.editor.setTheme(arg);
    this.revealLine = (arg: number) => this.editor.revealLine(arg);
    this.setRuntimeProgress = (status: string, arg: string) => this.runtimeProcessManager.set(status, JSON.parse(arg));
    this.getRuntimeProgress = (status: string) => this.runtimeProcessManager.get(status);
    this.showRuntimeError = (lineNumber: number, height: number, text: string) => this.runtimeProcessManager.showError(lineNumber, height, text);
    this.clearRuntimeErrors = () => this.runtimeProcessManager.clearErrors();
    this.clearRuntimeProgress = () => this.runtimeProcessManager.clear();
    this.decorateBreakpoints = (arg: string) => this.breakpointManager.DecorateBreakpoints(JSON.parse(arg));
    this.decorateProblems = (arg: string) => this.problemManager.DecorateProblems(JSON.parse(arg));
    this.toggleBreakpoint = () => this.breakpointManager.toggleBreakpoint(this.editor.getPosition().lineNumber);
    this.showMessage = (arg: string) => this.editor.getContribution('editor.contrib.messageController')["showMessage"](arg, this.getPosition());
    this.getActions = () => {
      let result = [];
      let actions: Object = this.editor["_actions"];
      for (let key in actions) {
        let e = actions[key];
        result.push({ id: e.id, label: e.label })
      };
      return JSON.stringify(result);
    }
    this.insertText = (text: string, arg: string = undefined) => {
      let position = this.editor.getPosition();
      let range = arg ? JSON.parse(arg) : new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
      let op = { range: range, text: text, forceMoveMarkers: true };
      this.editor.executeEdits("vanessa-editor", [op]);
    }
    this.setContent = (arg: string) => {
      this.editor.setValue(arg);
      this.resetHistory();
      this.fireEvent(VanessaEditorEvent.CHANGE_UNDO_REDO, { undo: false, redo: false })
    }
    this.fireEvent = (event: VanessaEditorEvent, arg: any = undefined) => {
      // tslint:disable-next-line: no-console
      console.debug("fireEvent: " + event + " : " + arg);
      this.messages.push({ type: event, data: arg });
      let fakeButtonFireClickEvent: HTMLButtonElement = document.getElementById("VanessaEditorEventForwarder") as HTMLButtonElement;
      fakeButtonFireClickEvent.click();
    }
    this.addCommands = (arg: string) => {
      let list: Array<VanessaCommandItem> = JSON.parse(arg);
      list.forEach((e: any) => {
        let keybinding: number = e.keyCode ? Number(monaco.KeyCode[e.keyCode]) : undefined;
        if (e.keyMod) e.keyMod.forEach((id: string) => keybinding |= Number(monaco.KeyMod[id]));
        let id: string = this.editor.addCommand(keybinding, (c, a) => {
          let v: VanessaEditor = window["VanessaEditor"];
          let n = a ? a : v.getPosition().lineNumber;
          v.fireEvent(`${e.eventId}`, n);
          eval.apply(null, [`${e.script}`]);
        });
        if (e.title) { this.codeActions.push({ id: id, title: e.title }); }
        if (e.codeLens) { this.codeLens.push({ id: id, title: e.codeLens }); }
      });
    }
    this.setSuggestWidgetWidth = (arg: any) => {
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
    this.refresh = () => {
      let model = this.editor.getModel();
      let range = new monaco.Range(1, 1, 2, 1);
      let value = model.getValueInRange(range);
      model.applyEdits([{ range: range, text: value }]);
    }
  }

  public dispose(): void {
    this.editor.dispose();
  }

  private resetHistory() {
    this.initialVersion = this.editor.getModel().getAlternativeVersionId();
    this.currentVersion = this.initialVersion;
    this.lastVersion = this.initialVersion;
  }

  private subscribeEditorEvents(): void {

    this.editor.onDidChangeModelContent(
      () => this.fireEvent(VanessaEditorEvent.CONTENT_DID_CHANGE)
    );

    this.editor.onDidChangeCursorPosition(
      (e: monaco.editor.ICursorPositionChangedEvent) => {
        this.fireEvent(VanessaEditorEvent.POSITION_DID_CHANGE, { lineNumber: e.position.lineNumber, column: e.position.column })
      }
    );

    this.editor.onMouseDown(e => this.breakpointManager.breakpointOnMouseDown(e));
    this.editor.onMouseMove(e => this.breakpointManager.breakpointsOnMouseMove(e));
    this.editor.onKeyDown(e => { if (this.useKeyboardTracer) this.fireEvent(VanessaEditorEvent.ON_KEY_DOWN, e) });
    this.editor.onKeyUp(e => { if (this.useKeyboardTracer) this.fireEvent(VanessaEditorEvent.ON_KEY_UP, e) });

    const model: monaco.editor.ITextModel = this.editor.getModel();

    model.onDidChangeDecorations(() => this.breakpointManager.breakpointOnDidChangeDecorations());

    this.checkSyntax = () => {
      clearTimeout(this.syntaxTimer);
      this.syntaxTimer = setTimeout(() => {
        window["VanessaGherkinProvider"].checkSyntax();
      }, 1000);
    }

    this.checkSyntax();

    this.editor.onDidChangeModelContent(() => {
      this.checkSyntax();
      const versionId = this.editor.getModel().getAlternativeVersionId();
      let buttons = { undo: true, redo: true, version: versionId };
      if (versionId < this.currentVersion) {
        if (versionId === this.initialVersion) buttons.undo = false;
      } else {
        // redoing
        if (versionId <= this.lastVersion) {
          // redoing the last change
          if (versionId == this.lastVersion) buttons.redo = false;
        } else { // adding new change, disable redo when adding new changes
          buttons.redo = false;
          if (this.currentVersion > this.lastVersion) this.lastVersion = this.currentVersion;
        }
      }
      this.currentVersion = versionId;
      this.fireEvent(VanessaEditorEvent.CHANGE_UNDO_REDO, buttons)
    });
  }
}
