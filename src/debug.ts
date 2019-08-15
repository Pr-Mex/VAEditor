import { VanessaEditor, VanessaEditorEvent } from "./vanessa-editor";
import { IRange } from "monaco-editor";

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

  public DecorateBreakpoints (breakpoints: IBreakpoint[]): void {
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

  public breakpointsOnMouseMove (e: monaco.editor.IEditorMouseEvent): void {
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

  public breakpointOnDidChangeDecorations (): void {
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

  public breakpointOnMouseDown (e: monaco.editor.IEditorMouseEvent): void {
    if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
      this.toggleBreakpoint(e.target.position.lineNumber);
    }
  }

  public toggleBreakpoint (lineNumber: number): void {
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

  private updateBreakpoints (): void {
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

  private breakpointIndexByLineNumber (lineNumber: any): number {
    return this.breakpointDecorations.findIndex(breakpoint => (breakpoint.range.startLineNumber === lineNumber));
  }
}