import { VanessaEditor } from "./vanessa-editor";
import { VanessaEditorEvent } from "./actions";
import { IRange } from "monaco-editor";

import * as monaco from "monaco-editor"
import { renderMarkdown } from "monaco-editor/esm/vs/base/browser/htmlContentRenderer.js"
import { SubcodeWidget } from "./widgets/subcode";
import { ErrorWidget } from "./widgets/error";

const markdownToHTML = (value) => {
  const result = renderMarkdown({
    value
  }, {
    inline: false,
    codeBlockRenderer: async function (languageAlias, value) {
      return await monaco.editor.colorize(value, "markdown", {});
    }
  })
  return result
}

export interface IBreakpoint {
  lineNumber: number;
  codeWidget: number;
  enable: boolean;
}

export class Breakpoint implements IBreakpoint {
  lineNumber: number;
  codeWidget: number;
  enable: boolean;
  constructor(
    lineNumber: number | string,
    codeWidget: number = 0,
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
  codeWidget: number;
}

interface IVanessaPosition {
  lineNumber: number;
  codeWidget: number;
  column: number;
}

class RuntimePosition implements IRuntimePosition {
  public lineNumber: number;
  public codeWidget: number;
  constructor(lineNumber: number, codeWidget: number = 0) {
    this.lineNumber = lineNumber;
    this.codeWidget = codeWidget;
  }
}

export class RuntimeManager {

  public VanessaEditor: VanessaEditor;
  public editor: monaco.editor.IStandaloneCodeEditor;
  private breakpointDecorations: IBreakpointDecoration[] = [];
  private breakpointDecorationIds: string[] = [];
  private breakpointHintDecorationIds: string[] = [];
  private breakpointUnverifiedDecorationIds: string[] = [];
  private checkBreakpointChangeDecorations: boolean = true;

  constructor(
    VanessaEditor: VanessaEditor
  ) {
    this.VanessaEditor = VanessaEditor;
    this.editor = VanessaEditor.editor;
    const model: monaco.editor.ITextModel = this.editor.getModel();
    model.onDidChangeDecorations(() => this.breakpointOnDidChangeDecorations());
    this.editor.onMouseDown(e => this.breakpointOnMouseDown(e));
    this.editor.onMouseMove(e => this.breakpointsOnMouseMove(e));
    this.registerOnDidChangeFolding();
  }

  private registerOnDidChangeFolding() {
    let foldingContrib = this.editor.getContribution('editor.contrib.folding');
    //@ts-ignore
    foldingContrib.getFoldingModel().then((foldingModel: any) => {
      foldingModel.onDidChange(() => setTimeout(() => {
        for (let id in this.codeWidgets) {
          let widget = (this.codeWidgets[id] as SubcodeWidget);
          if (widget.domNode.offsetHeight) widget.overlayDom.classList.remove("vanessa-hidden");
          else widget.overlayDom.classList.add("vanessa-hidden");
        }
      }, 200));
    });
  };

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

    for (let id in this.codeWidgets) {
      let widget: SubcodeWidget = this.codeWidgets[id];
      let breakpoints = widgetsBreakpoints[id] || [];
      widget.breakpoints = breakpoints;
    }
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

  public toggleBreakpoint(lineNumber: number = 0, codeWidget: number = 0): void {
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
        if (!found) breakpoints.push(new Breakpoint(range.startLineNumber, 0, breakpoint.enable));
      }
    });
    for (let id in this.codeWidgets) {
      this.codeWidgets[id].breakpoints.forEach((b: IBreakpoint) => breakpoints.push(b));
    }
    return breakpoints;
  }

  public updateBreakpoints(): void {
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => {
      this.VanessaEditor.fireEvent(VanessaEditorEvent.UPDATE_BREAKPOINTS, JSON.stringify(this.breakpoints));
    }, 100);
  }

  private breakpointIndexByLineNumber(lineNumber: any): number {
    return this.breakpointDecorations.findIndex(breakpoint => (breakpoint.range.startLineNumber === lineNumber));
  }

  private stepDecorationIds: string[] = [];
  private underlineDecorationIds: string[] = [];
  private currentDecorationIds: string[] = [];
  private errorViewZoneIds: Array<number> = [];
  private codeWidgets = {};
  private currentCodeWidget: number = 0;

  public setStatus(status: string, arg: any, codeWidget: number): void {
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

  public setUnderline(status: string, arg: any, codeWidget: number = 0): void {
    let lines = typeof (arg) == "string" ? JSON.parse(arg) : arg;
    if (typeof (lines) == "number") lines = [lines];
    if (codeWidget) {
      let widget: SubcodeWidget = this.codeWidgets[codeWidget];
      if (widget) widget.setUnderline(status, lines);
    } else {
      const model: monaco.editor.ITextModel = this.editor.getModel();
      const oldDecorations = [];
      const decorations: monaco.editor.IModelDeltaDecoration[] = [];
      lines.forEach((line: number) => {
        model.getLinesDecorations(line, line).forEach(d => {
          let i = this.underlineDecorationIds.indexOf(d.id);
          if (i >= 0) {
            this.underlineDecorationIds.slice(i, 1);
            oldDecorations.push(d.id);
          }
        });
        if (status) decorations.push({
          range: new monaco.Range(line, model.getLineFirstNonWhitespaceColumn(line), line, model.getLineLastNonWhitespaceColumn(line)),
          options: {
            stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
            inlineClassName: `runtime-${status}-underline`,
          }
        });
        const newDecorations = this.editor.deltaDecorations(oldDecorations, decorations);
        newDecorations.forEach(s => this.underlineDecorationIds.push(s));
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

  public getContent(codeWidget: number = 0) {
    if (codeWidget) {
      let widget = this.codeWidgets[codeWidget] as SubcodeWidget;
      return widget ? widget.getContent() : undefined;
    }
    return this.editor.getValue();
  };

  public getLineContent(lineNumber: number, codeWidget: number = 0) {
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

  public setCurrent(lineNumber: number, codeWidget: number = 0): IRuntimePosition {
    const model = this.editor.getModel();
    this.currentDecorationIds = model.deltaDecorations(this.currentDecorationIds, []);
    let widget = this.codeWidgets[this.currentCodeWidget] as SubcodeWidget;
    if (widget) widget.setCurrent(0);
    this.currentCodeWidget = 0;
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

  public showError(lineNumber: number, codeWidget: number, data: string, text: string) {
    if (codeWidget) {
      let widget = this.codeWidgets[codeWidget] as SubcodeWidget;
      if (widget) widget.showError(lineNumber, data, text);
    } else {
      let widget = new ErrorWidget(data, text);
      let id = widget.show(this.editor, lineNumber);
      this.errorViewZoneIds.push(id);
      return id;
    }
  }

  public showCode(lineNumber: number, text: string): number {
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
    for (let id in this.codeWidgets) (this.codeWidgets[id] as SubcodeWidget).clearErrors();
  }

  public clearSubcode(): void {
    let ids = [];
    for (let id in this.codeWidgets) {
      let widget = this.codeWidgets[id] as SubcodeWidget;
      this.editor.deltaDecorations([widget.decoration], []);
      ids.push(id);
    }
    this.editor.changeViewZones(changeAccessor =>
      ids.forEach(id => changeAccessor.removeZone(id))
    );
    this.codeWidgets = {};
    this.updateBreakpoints();
  }

  public clearStatus(): void {
    this.currentDecorationIds = this.editor.deltaDecorations(this.currentDecorationIds, []);
    this.stepDecorationIds = this.editor.deltaDecorations(this.stepDecorationIds, []);
    for (let id in this.codeWidgets) (this.codeWidgets[id] as SubcodeWidget).clearStatus();
  }

  public clearUnderline(): void {
    this.underlineDecorationIds = this.editor.deltaDecorations(this.underlineDecorationIds, []);
    for (let id in this.codeWidgets) (this.codeWidgets[id] as SubcodeWidget).clearUnderline();
  }

  get position(): IVanessaPosition {
    let node = document.getSelection().focusNode as HTMLElement;
    while (node) {
      if (node.classList && node.classList.contains('vanessa-code-widget')) {
        for (let id in this.codeWidgets) {
          let widget = this.codeWidgets[id] as SubcodeWidget;
          if (widget.domNode == node) return widget.position;
        }
      };
      node = node.parentElement;
    }
    let position = this.editor.getPosition();
    return {
      lineNumber: position.lineNumber,
      column: position.column,
      codeWidget: 0,
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

  get selection(): any {
    let node = document.getSelection().focusNode as HTMLElement;
    while (node) {
      if (node.classList && node.classList.contains('vanessa-code-widget')) {
        for (let id in this.codeWidgets) {
          let widget = this.codeWidgets[id] as SubcodeWidget;
          if (widget.domNode == node) return widget.selection;
        }
      };
      node = node.parentElement;
    }
    let selection = this.editor.getSelection();
    return {
      startLineNumber: selection.startLineNumber,
      endLineNumber: selection.endLineNumber,
      startColumn: selection.startColumn,
      endColumn: selection.endColumn,
      codeWidget: 0,
    }
  }

  public clear(): void {
    this.clearSubcode();
    this.clearUnderline();
    this.clearErrors();
    this.clearStatus();
  }
}
