import { VanessaEditor, VanessaEditorEvent } from "./vanessa-editor";
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

interface IBreakpoint {
  lineNumber: number;
  enable: boolean;
}

interface IBreakpointDecoration {
  id: string;
  range: IRange;
  enable: boolean;
  verified: boolean;
}

export class BreakpointManager {

  private VanessaEditor: VanessaEditor;

  private breakpointDecorations: IBreakpointDecoration[] = [];
  private breakpointDecorationIds: string[] = [];
  private breakpointHintDecorationIds: string[] = [];
  private breakpointUnverifiedDecorationIds: string[] = [];
  private checkBreakpointChangeDecorations: boolean = true;

  constructor(
    VanessaEditor: VanessaEditor
  ) {
    this.VanessaEditor = VanessaEditor;
  }

  public DecorateBreakpoints(breakpoints: IBreakpoint[]): void {
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    breakpoints.forEach(breakpoint => {
      decorations.push({
        range: new monaco.Range(breakpoint.lineNumber, 1, breakpoint.lineNumber, 1),
        options: {
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          glyphMarginClassName: breakpoint.enable ? "debug-breakpoint-glyph" : "debug-breakpoint-disabled-glyph"
        }
      });
    });

    this.checkBreakpointChangeDecorations = false;
    this.breakpointDecorationIds = this.VanessaEditor.editor.deltaDecorations(this.breakpointDecorationIds, decorations);
    this.breakpointUnverifiedDecorationIds = this.VanessaEditor.editor.deltaDecorations(this.breakpointUnverifiedDecorationIds, []);
    this.checkBreakpointChangeDecorations = true;

    this.breakpointDecorations = this.breakpointDecorationIds.map((id, index) => ({
      id: id,
      range: decorations[index].range,
      enable: breakpoints[index].enable,
      verified: true
    }));
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
    this.breakpointHintDecorationIds = this.VanessaEditor.editor.deltaDecorations(this.breakpointHintDecorationIds, decorations);
  }

  public breakpointOnDidChangeDecorations(): void {
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
      const newBreakpointRange: monaco.Range = this.VanessaEditor.editor.getModel().getDecorationRange(breakpoint.id);
      if (newBreakpointRange && (!(breakpoint.range as monaco.Range).equalsRange(newBreakpointRange))) {
        somethingChanged = true;
      }
    });
    if (somethingChanged) {
      this.updateBreakpoints();
    }
  }

  public breakpointOnMouseDown(e: monaco.editor.IEditorMouseEvent): void {
    if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
      this.toggleBreakpoint(e.target.position.lineNumber);
    }
  }

  public toggleBreakpoint(lineNumber: number): void {
    const breakpointIndex: number = this.breakpointIndexByLineNumber(lineNumber);
    if (breakpointIndex === -1) {
      this.checkBreakpointChangeDecorations = false;
      this.breakpointHintDecorationIds = this.VanessaEditor.editor.deltaDecorations(this.breakpointHintDecorationIds, []);
      this.breakpointUnverifiedDecorationIds = this.VanessaEditor.editor.deltaDecorations(this.breakpointUnverifiedDecorationIds, [{
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
    setTimeout(() => this.updateBreakpoints(), 100);
  }

  private updateBreakpoints(): void {
    const breakpointPacket: IBreakpoint[] = [];
    this.breakpointDecorations.forEach(breakpoint => {
      const range: monaco.Range = this.VanessaEditor.editor.getModel().getDecorationRange(breakpoint.id);
      if (range !== null) {
        const breakpointFound: Boolean = breakpointPacket.find(breakpointChunk =>
          (breakpointChunk.lineNumber === range.startLineNumber)) !== undefined;
        if (!breakpointFound) {
          breakpointPacket.push({
            lineNumber: range.startLineNumber,
            enable: breakpoint.enable
          });
        }
      }
    });
    this.VanessaEditor.fireEvent(VanessaEditorEvent.UPDATE_BREAKPOINTS, JSON.stringify(breakpointPacket));
  }

  private breakpointIndexByLineNumber(lineNumber: any): number {
    return this.breakpointDecorations.findIndex(breakpoint => (breakpoint.range.startLineNumber === lineNumber));
  }
}

interface IRuntimePosition {
  lineNumber: number;
  codeWidget: number;
}

class RuntimePosition implements IRuntimePosition {
  public lineNumber: number;
  public codeWidget: number;
  constructor(lineNumber: number, codeWidget: number = 0) {
    this.lineNumber = lineNumber;
    this.codeWidget = codeWidget;
  }
}

export class RuntimeProcessManager {

  private editor: monaco.editor.IStandaloneCodeEditor;
  private stepDecorationIds: string[] = [];
  private currentDecorationIds: string[] = [];
  private errorViewZoneIds: Array<number> = [];
  private lineHeight: number = 0;
  private codeWidgets = {};
  private currentCodeWidget: number = 0;

  constructor(VanessaEditor: VanessaEditor) {
    this.editor = VanessaEditor.editor;
    this.editor.onDidChangeConfiguration(e => this.setStyle());
    this.editor.onDidLayoutChange(e => this.setStyle());
    this.setStyle();
  }

  private setStyle() {
    let conf = this.editor.getConfiguration();
    if (this.lineHeight == conf.lineHeight) return;

    const id = 'vanessa-widget-style';
    let style = document.getElementById(id) as HTMLElement;
    if (style == null) {
      style = document.createElement('style');
      style.setAttribute("type", "text/css");
      style.id = id;
      document.head.appendChild(style)
    }
    style.innerHTML = `\
    .vanessa-code-widget, .vanessa-error-widget {\
      font-family: ${conf.fontInfo.fontFamily};\
      font-size: ${conf.fontInfo.fontSize}px;\
      line-height: ${conf.lineHeight}px;\
    }\
    .vanessa-code-lines { left: ${conf.lineHeight}px; }\
    .vanessa-code-border { width: ${conf.lineHeight}px; }\
    .vanessa-code-border div { height: ${conf.lineHeight}px; }\
    `;
  }

  public set(status: string, arg: any): void {
    let lines = typeof (arg) == "string" ? JSON.parse(arg) : arg;
    if (typeof (lines) == "number") lines = [lines];
    let position = this.editor.getPosition();
    this.editor.setSelection(new monaco.Range(1, 1, 1, 1));
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
    this.editor.setPosition(position);
  }

  public get(status: string): string {
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
      if (lineNumber > model.getLineCount()) return undefined;
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

  public showError(lineNumber: number, data: string, text: string) {
    let widget = new ErrorWidget(data, text);
    let id = widget.show(this.editor, lineNumber);
    this.errorViewZoneIds.push(id);
    return id;
  }

  public showCode(lineNumber: number, text: string): number {
    let widget = new SubcodeWidget(text);
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
  }

  public clear(): void {
    this.currentDecorationIds = this.editor.deltaDecorations(this.currentDecorationIds, []);
    this.stepDecorationIds = this.editor.deltaDecorations(this.stepDecorationIds, []);
    this.clearErrors();
    this.clearSubcode();
  }
}
