import { VanessaEditor } from "./vanessa-editor";
import { VanessaEditorEvent } from "./common";
import { IRange, IDisposable } from "monaco-editor";

import { SubcodeWidget } from "./widgets/subcode";
import { ErrorWidget } from "./widgets/error";

export interface IBreakpoint {
  lineNumber: number;
  codeWidget: string;
  enable: boolean;
}

export class Breakpoint implements IBreakpoint {
  lineNumber: number;
  codeWidget: string;
  enable: boolean;
  constructor(
    lineNumber: number | string,
    codeWidget: string,
    enable: boolean = true
  ) {
    this.lineNumber = Number(lineNumber);
    this.codeWidget = codeWidget;
    this.enable = enable;
  }
}

interface IBreakpointDecoration {
  id: string;
  range: IRange;
  enable: boolean;
  verified: boolean;
}

interface IRuntimePosition {
  lineNumber: number;
  codeWidget: string;
}

interface IVanessaPosition {
  lineNumber: number;
  codeWidget: string;
  column: number;
}

class RuntimePosition implements IRuntimePosition {
  public lineNumber: number;
  public codeWidget: string;
  constructor(lineNumber: number, codeWidget: string = "") {
    this.lineNumber = lineNumber;
    this.codeWidget = codeWidget;
  }
}

export class RuntimeManager {

  public owner: VanessaEditor;
  public editor: monaco.editor.IStandaloneCodeEditor;
  private breakpointDecorations: IBreakpointDecoration[] = [];
  private breakpointDecorationIds: string[] = [];
  private breakpointHintDecorationIds: string[] = [];
  private breakpointUnverifiedDecorationIds: string[] = [];
  private checkBreakpointChangeDecorations: boolean = true;
  private handlers: Array<IDisposable> = [];

  constructor(
    owner: VanessaEditor
  ) {
    this.owner = owner;
    this.editor = owner.editor;
    const model: monaco.editor.ITextModel = this.editor.getModel();
    if (VanessaEditor.useDebuggerDefault) this.useDebugger = true;
    this.handlers.push(model.onDidChangeDecorations(() => this.breakpointOnDidChangeDecorations()));
    this.handlers.push(this.editor.onDidScrollChange(() => this.checkOverlayVisible()));
    this.handlers.push(this.editor.onMouseDown(e => { if (this.showBreakpoints) this.breakpointOnMouseDown(e) }));
    this.handlers.push(this.editor.onMouseMove(e => { if (this.showBreakpoints) this.breakpointsOnMouseMove(e) }));
    this.registerOnDidChangeFolding();
  }

  public dispose(): void {
    this.handlers.forEach(h => h.dispose());
    this.owner = null;
    this.editor = null;
  }

  private forEachSubcode(callbackfn: (widget: SubcodeWidget, id: string) => void) {
    for (let id in this.codeWidgets) {
      let widget = this.codeWidgets[id] as SubcodeWidget;
      callbackfn(widget, widget.id);
    }
  }

  private registerOnDidChangeFolding() {
    let foldingContrib = this.editor.getContribution('editor.contrib.folding');
    //@ts-ignore
    foldingContrib.getFoldingModel().then((foldingModel: any) => {
      if (foldingModel) this.handlers.push(
        foldingModel.onDidChange(() => this.checkOverlayVisible())
      );
    });
  };

  private checkOverlayVisible() {
    setTimeout(() => this.forEachSubcode((widget: SubcodeWidget) => widget.updateOverlayVisible()), 200);
  }

  set breakpoints(breakpoints: IBreakpoint[]) {
    const widgetsBreakpoints = {};
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    breakpoints.forEach(breakpoint => {
      if (breakpoint.codeWidget) {
        let ids: Array<IBreakpoint> = widgetsBreakpoints[breakpoint.codeWidget];
        if (ids == undefined) widgetsBreakpoints[breakpoint.codeWidget] = ids = [];
        ids.push(breakpoint);
      }
      else decorations.push({
        range: new monaco.Range(breakpoint.lineNumber, 1, breakpoint.lineNumber, 1),
        options: {
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          glyphMarginClassName: breakpoint.enable ? "debug-breakpoint-glyph" : "debug-breakpoint-disabled-glyph"
        }
      });
    });

    this.checkBreakpointChangeDecorations = false;
    this.breakpointDecorationIds = this.editor.deltaDecorations(this.breakpointDecorationIds, decorations);
    this.breakpointUnverifiedDecorationIds = this.editor.deltaDecorations(this.breakpointUnverifiedDecorationIds, []);
    this.checkBreakpointChangeDecorations = true;

    this.breakpointDecorations = this.breakpointDecorationIds.map((id, index) => ({
      id: id,
      range: decorations[index].range,
      enable: breakpoints[index].enable,
      verified: true
    }));

    this.forEachSubcode((widget: SubcodeWidget, id: string) => {
      let breakpoints = widgetsBreakpoints[id] || [];
      widget.breakpoints = breakpoints;
    });
  }

  public breakpointsOnMouseMove(e: monaco.editor.IEditorMouseEvent): void {
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
      const lineNumber: number = e.target.position.lineNumber;
      if (this.breakpointIndexByLineNumber(lineNumber) === -1) {
        decorations.push({
          range: new monaco.Range(lineNumber, 1, lineNumber, 1),
          options: {
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            glyphMarginClassName: "debug-breakpoint-hint-glyph"
          }
        });
      }
    }
    this.breakpointHintDecorationIds = this.editor.deltaDecorations(this.breakpointHintDecorationIds, decorations);
  }

  private breakpointOnDidChangeDecorations(): void {
    if (!this.checkBreakpointChangeDecorations) {
      return;
    }
    let somethingChanged: boolean = false;
    this.breakpointDecorations.forEach(breakpoint => {
      if (somethingChanged) {
        return;
      }
      if (!breakpoint.verified) {
        return;
      }
      const newBreakpointRange: monaco.Range = this.editor.getModel().getDecorationRange(breakpoint.id);
      if (newBreakpointRange && (!(breakpoint.range as monaco.Range).equalsRange(newBreakpointRange))) {
        somethingChanged = true;
      }
    });
    if (somethingChanged) {
      this.updateBreakpoints();
    }
  }

  private breakpointOnMouseDown(e: monaco.editor.IEditorMouseEvent): void {
    if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
      this.toggleBreakpoint(e.target.position.lineNumber);
    }
  }

  public toggleBreakpoint(lineNumber: number = 0, codeWidget: string = ""): void {
    if (lineNumber == 0) {
      let position = this.position;
      lineNumber = position.lineNumber;
      codeWidget = position.codeWidget;
    }
    if (codeWidget) {
      let widget = this.codeWidgets[codeWidget] as SubcodeWidget;
      if (widget) widget.togleBreakpoint(lineNumber);
    } else {
      const breakpointIndex: number = this.breakpointIndexByLineNumber(lineNumber);
      if (breakpointIndex === -1) {
        this.checkBreakpointChangeDecorations = false;
        this.breakpointHintDecorationIds = this.editor.deltaDecorations(this.breakpointHintDecorationIds, []);
        this.breakpointUnverifiedDecorationIds = this.editor.deltaDecorations(this.breakpointUnverifiedDecorationIds, [{
          range: new monaco.Range(lineNumber, 1, lineNumber, 1),
          options: {
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            glyphMarginClassName: "debug-breakpoint-unverified-glyph"
          }
        }]);
        this.checkBreakpointChangeDecorations = true;
        this.breakpointDecorations.push({
          id: this.breakpointUnverifiedDecorationIds[0],
          range: new monaco.Range(lineNumber, 1, lineNumber, 1),
          enable: true,
          verified: false
        });
      } else {
        this.breakpointDecorations.splice(breakpointIndex, 1);
      }
      this.updateBreakpoints();
    }
  }

  private updateTimer: NodeJS.Timeout;

  get breakpoints(): IBreakpoint[] {
    const breakpoints: IBreakpoint[] = [];
    this.breakpointDecorations.forEach(breakpoint => {
      const range: monaco.Range = this.editor.getModel().getDecorationRange(breakpoint.id);
      if (range !== null) {
        const found: Boolean = breakpoints.some(b => (b.lineNumber === range.startLineNumber));
        if (!found) breakpoints.push(new Breakpoint(range.startLineNumber, "", breakpoint.enable));
      }
    });
    this.forEachSubcode((widget: SubcodeWidget) =>
      widget.breakpoints.forEach((b: IBreakpoint) => breakpoints.push(b))
    );
    return breakpoints;
  }

  public updateBreakpoints(): void {
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => {
      this.owner.fireEvent(VanessaEditorEvent.UPDATE_BREAKPOINTS, JSON.stringify(this.breakpoints));
    }, 100);
  }

  private breakpointIndexByLineNumber(lineNumber: any): number {
    return this.breakpointDecorations.findIndex(breakpoint => (breakpoint.range.startLineNumber === lineNumber));
  }

  private stepDecorationIds: string[] = [];
  private lineDecorationIds: string[] = [];
  private currentDecorationIds: string[] = [];
  private stackDecorationIds: string[] = [];
  private errorViewZoneIds: Array<string> = [];
  private codeWidgets = {};
  private currentCodeWidget: string = "";
  private showBreakpoints: boolean = false;

  public set useDebugger(value: boolean) {
    if (!value) this.breakpoints = [];
    this.showBreakpoints = value;
    this.forEachSubcode(w => w.useDebugger = value);
  }
  public get useDebugger() {
    return this.showBreakpoints;
  }

  public setStatus(status: string, arg: any, codeWidget: string = ""): void {
    let lines = typeof (arg) == "string" ? JSON.parse(arg) : arg;
    if (typeof (lines) == "number") lines = [lines];
    if (codeWidget) {
      let widget: SubcodeWidget = this.codeWidgets[codeWidget];
      if (widget) widget.setStatus(status, lines);
    } else {
      const model: monaco.editor.ITextModel = this.editor.getModel();
      const oldDecorations = [];
      const decorations: monaco.editor.IModelDeltaDecoration[] = [];
      lines.forEach((line: number) => {
        model.getLinesDecorations(line, line).forEach(d => {
          let i = this.stepDecorationIds.indexOf(d.id);
          if (i >= 0) {
            this.stepDecorationIds.slice(i, 1);
            oldDecorations.push(d.id);
          }
        });
        if (status) decorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
            className: `debug-${status}-step`,
            isWholeLine: true,
          }
        });
      });
      const newDecorations = this.editor.deltaDecorations(oldDecorations, decorations);
      newDecorations.forEach(s => this.stepDecorationIds.push(s));
    }
  }

  public setStack(status: boolean, lineNumber: number) {
    const model: monaco.editor.ITextModel = this.editor.getModel();
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    if (status) decorations.push({
      range: new monaco.Range(lineNumber, 1, lineNumber, 1),
      options: {
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        glyphMarginClassName: "debug-stackframe-glyph",
        isWholeLine: true,
      }
    });
    this.stackDecorationIds = this.editor.deltaDecorations(this.stackDecorationIds, decorations);
  }

  public getStack(lineNumber: number) {
    let status = false;
    const model: monaco.editor.ITextModel = this.editor.getModel();
    model.getLinesDecorations(lineNumber, lineNumber).forEach(d => {
      let i = this.stackDecorationIds.indexOf(d.id);
      if (i >= 0) status = true;
    });
    return status;
  }

  public setStyle(arg: any, codeWidget: string, bold: boolean, italic: boolean, underline: boolean): void {
    let lines = typeof (arg) == "string" ? JSON.parse(arg) : arg;
    if (typeof (lines) == "number") lines = [lines];
    if (codeWidget) {
      let widget: SubcodeWidget = this.codeWidgets[codeWidget];
      if (widget) widget.setStyle(lines, bold, italic, underline);
    } else {
      const model: monaco.editor.ITextModel = this.editor.getModel();
      const oldDecorations = [];
      const decorations: monaco.editor.IModelDeltaDecoration[] = [];
      lines.forEach((line: number) => {
        model.getLinesDecorations(line, line).forEach(d => {
          let i = this.lineDecorationIds.indexOf(d.id);
          if (i >= 0) {
            this.lineDecorationIds.slice(i, 1);
            oldDecorations.push(d.id);
          }
        });
        if (bold) decorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
            inlineClassName: "vanessa-style-bold",
            isWholeLine: true,
          }
        });
        if (italic) decorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
            inlineClassName: "vanessa-style-italic",
            isWholeLine: true,
          }
        });
        if (underline) decorations.push({
          range: new monaco.Range(line, model.getLineFirstNonWhitespaceColumn(line), line, model.getLineLastNonWhitespaceColumn(line)),
          options: {
            stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
            inlineClassName: "vanessa-style-underline",
          }
        });
        const newDecorations = this.editor.deltaDecorations(oldDecorations, decorations);
        newDecorations.forEach(s => this.lineDecorationIds.push(s));
      });
    }
  }

  public getStatus(status: string): string {
    const model: monaco.editor.ITextModel = this.editor.getModel();
    const lines = [];
    let lineCount = model.getLineCount();
    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
      if (model.getLinesDecorations(lineNumber, lineNumber).some(d =>
        d.options.className == `debug-${status}-step`
      )) lines.push(lineNumber);
    };
    return JSON.stringify(lines);
  }

  public getContent(codeWidget: string = "") {
    if (codeWidget) {
      let widget = this.codeWidgets[codeWidget] as SubcodeWidget;
      return widget ? widget.getContent() : undefined;
    }
    return this.editor.getValue();
  };

  public getLineContent(lineNumber: number, codeWidget: string = "") {
    if (codeWidget) {
      let widhet = this.codeWidgets[codeWidget] as SubcodeWidget;
      return widhet ? widhet.getLineContent(lineNumber) : undefined;
    }
    return this.editor.getModel().getLineContent(lineNumber);
  };

  public getCurrent(): IRuntimePosition {
    const model = this.editor.getModel();
    let decoration = this.currentDecorationIds[0];
    let range = decoration ? model.getDecorationRange(decoration) : undefined;
    if (range) return new RuntimePosition(range.startLineNumber);
    let widget = this.codeWidgets[this.currentCodeWidget] as SubcodeWidget;
    let lineNumber = widget ? widget.getCurrent() : undefined;
    if (lineNumber) return new RuntimePosition(lineNumber, widget.id);
  }

  public setCurrent(lineNumber: number, codeWidget: string = ""): IRuntimePosition {
    const model = this.editor.getModel();
    this.currentDecorationIds = model.deltaDecorations(this.currentDecorationIds, []);
    let widget = this.codeWidgets[this.currentCodeWidget] as SubcodeWidget;
    if (widget) widget.setCurrent(0);
    this.currentCodeWidget = "";
    if (codeWidget) {
      this.currentDecorationIds = model.deltaDecorations(this.currentDecorationIds, []);
      let widget = this.codeWidgets[codeWidget] as SubcodeWidget;
      if (widget) {
        this.currentCodeWidget = codeWidget;
        widget.setCurrent(lineNumber);
        return new RuntimePosition(lineNumber, codeWidget);
      }
    } else {
      if (lineNumber <= 0 || lineNumber > model.getLineCount()) return undefined;
      const oldDecorations = [];
      model.getLinesDecorations(lineNumber, lineNumber).forEach(d => {
        let i = this.stepDecorationIds.indexOf(d.id);
        if (i >= 0) {
          this.stepDecorationIds.slice(i, 1);
          oldDecorations.push(d.id);
        }
      });
      this.currentDecorationIds = model.deltaDecorations(oldDecorations, [{
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
          glyphMarginClassName: "debug-current-step-glyph",
          className: "debug-current-step",
          isWholeLine: true,
        }
      }]);
      this.editor.revealLine(lineNumber);
      return new RuntimePosition(lineNumber);
    }
  }

  public next(): IRuntimePosition {
    let step = this.getCurrent();
    if (step == undefined) return this.setCurrent(1);
    if (step.codeWidget) {
      let id = step.codeWidget;
      let widget = this.codeWidgets[id] as SubcodeWidget;
      if (widget) {
        let lineNumber = widget.next();
        if (lineNumber) return { lineNumber: lineNumber, codeWidget: id };
        lineNumber = widget.lineNumber(this.editor) + 1;
        return this.setCurrent(lineNumber);
      }
    } else {
      let decorations = this.editor.getLineDecorations(step.lineNumber);
      for (let id in this.codeWidgets) {
        let widget = this.codeWidgets[id] as SubcodeWidget;
        if (decorations.some(d => d.id == widget.decoration)) {
          return this.setCurrent(1, widget.id);
        }
      }
      let lineNumber = step.lineNumber + 1;
      return this.setCurrent(lineNumber);
    }
  }

  public showError(lineNumber: number, codeWidget: string, data: string, text: string) {
    if (codeWidget) {
      let widget = this.codeWidgets[codeWidget] as SubcodeWidget;
      if (widget) widget.showError(lineNumber, data, text);
    } else {
      let widget = new ErrorWidget(this.owner, data, text);
      let id = widget.show(this.editor, lineNumber);
      this.errorViewZoneIds.push(id);
      return id;
    }
  }

  public showCode(lineNumber: number, text: string): string {
    let widget = new SubcodeWidget(this, text);
    let id = widget.show(this.editor, lineNumber);
    this.codeWidgets[id] = widget;
    return id;
  }

  public clearErrors(): void {
    let ids = this.errorViewZoneIds;
    this.editor.changeViewZones(changeAccessor =>
      ids.forEach(id => changeAccessor.removeZone(id))
    );
    ids.length = 0;
    this.forEachSubcode((widget: SubcodeWidget) => widget.clearErrors());
  }

  public clearSubcode(): void {
    let zoneIds = [];
    this.forEachSubcode((widget: SubcodeWidget) => {
      this.editor.deltaDecorations([widget.decoration], []);
      zoneIds.push(widget.id);
      widget.dispose();
    });
    this.editor.changeViewZones(changeAccessor =>
      zoneIds.forEach(id => changeAccessor.removeZone(id))
    );
    this.codeWidgets = {};
    this.updateBreakpoints();
  }

  public clearStack(): void {
    this.stackDecorationIds = this.editor.deltaDecorations(this.stackDecorationIds, []);
  }

  public clearStatus(): void {
    this.currentDecorationIds = this.editor.deltaDecorations(this.currentDecorationIds, []);
    this.stepDecorationIds = this.editor.deltaDecorations(this.stepDecorationIds, []);
    this.forEachSubcode((widget: SubcodeWidget) => widget.clearStatus());
  }

  public clearStyle(): void {
    this.lineDecorationIds = this.editor.deltaDecorations(this.lineDecorationIds, []);
    this.forEachSubcode((widget: SubcodeWidget) => widget.clearStyle());
  }

  public setFolding(lineNumber: number, codeWidget: string, collapsed: boolean) {
    this.forEachSubcode((widget: SubcodeWidget) => {
      if (widget.id = codeWidget) widget.setFolding(lineNumber, collapsed);
    });
  }

  private getSeletedWidget(): SubcodeWidget {
    let node = document.getSelection().focusNode as HTMLElement;
    while (node) {
      if (node.classList && node.classList.contains('vanessa-code-widget')) {
        for (let id in this.codeWidgets) {
          let widget = this.codeWidgets[id] as SubcodeWidget;
          if (widget.domNode == node) return widget;
        }
      };
      node = node.parentElement;
    }
    return undefined;
  }

  get position(): IVanessaPosition {
    let widget = this.getSeletedWidget();
    if (widget) return widget.position;
    let position = this.editor.getPosition();
    position["codeWidget"] = 0;
    return {
      lineNumber: position.lineNumber,
      column: position.column,
      codeWidget: "",
    }
  }

  set position(position: IVanessaPosition) {
    window.getSelection().empty();
    if (position.codeWidget) {
      let widget = this.codeWidgets[position.codeWidget] as SubcodeWidget;
      if (widget) widget.position = position;
    } else {
      this.editor.setPosition(position);
    }
  }

  get selection(): Object {
    let widget = this.getSeletedWidget();
    if (widget) return widget.selection;
    let selection = this.editor.getSelection();
    selection["codeWidget"] = 0;
    return selection;
  }

  public revealLine(lineNumber: number, codeWidget: string = "") {
    if (codeWidget) {
      this.forEachSubcode((widget: SubcodeWidget) => {
        if (widget.id == codeWidget) widget.revealLine(lineNumber);
      });
    } else {
      this.editor.revealLine(lineNumber);
    }
  }

  public revealLineInCenter(lineNumber: number, codeWidget: string = "") {
    if (codeWidget) {
      this.forEachSubcode((widget: SubcodeWidget) => {
        if (widget.id == codeWidget) widget.revealLineInCenter(lineNumber);
      });
    } else {
      this.editor.revealLineInCenter(lineNumber);
    }
  }

  public getLineWidgets(lineNumber: number): string[] {
    let result = [];
    const model: monaco.editor.ITextModel = this.editor.getModel();
    const decor = model.getLinesDecorations(lineNumber, lineNumber);
    this.forEachSubcode(w => { if (decor.find(d => d.id == w.decoration)) result.push(w.id); });
    return result;
  }

  public getWidgetLine(codeWidget: string): number {
    let result = 0;
    this.forEachSubcode(w => {
      if (w.id == codeWidget) {
        result = this.editor.getModel().getDecorationRange(w.decoration).endLineNumber;
      }
    });
    return result;
  }

  public selectSubcodeLine(codeWidget: string, lineNumber: number) {
    let line = undefined;
    this.forEachSubcode(w => {
      if (w.id == codeWidget) {
        line = w.lines[lineNumber];
      }
    })
    if (line) {
      line.select();
      return line.value;
    }
  }

  public clear(): void {
    this.clearStyle();
    this.clearStack();
    this.clearSubcode();
    this.clearErrors();
    this.clearStatus();
  }
}
