import { VanessaEditor, VanessaEditorEvent } from "./vanessa-editor";
import { IRange } from "monaco-editor";

import * as monaco from "monaco-editor"
import { renderMarkdown } from "monaco-editor/esm/vs/base/browser/htmlContentRenderer.js"

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
  codeWidget: string;
}

export class RuntimeProcessManager {

  private VanessaEditor: VanessaEditor;
  private editor: monaco.editor.IStandaloneCodeEditor;
  private stepDecorationIds: string[] = [];
  private currentStepDecorationIds: string[] = [];
  private errorViewZoneIds: Array<number> = [];
  private codeViewZoneIds: Array<number> = [];

  constructor(VanessaEditor: VanessaEditor) {
    this.VanessaEditor = VanessaEditor;
    this.editor = VanessaEditor.editor;
  }

  public set(status: string, arg: any): void {
    let lines = typeof (arg) == "string" ? JSON.parse(arg) : arg;
    if (typeof (lines) == "number") lines = [lines];
    let position = this.editor.getPosition();
    this.editor.setSelection(new monaco.Range(1, 1, 1, 1));
    const model: monaco.editor.ITextModel = this.editor.getModel();
    const oldDecorations = status == "current" ? this.currentStepDecorationIds : [];
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    lines.forEach((line: number) => {
      model.getLinesDecorations(line, line).forEach(d => {
        if (d.options.className) oldDecorations.push(d.id);
      });
      if (status) decorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
          glyphMarginClassName: status == "current" ? "debug-current-step-glyph" : undefined,
          className: `debug-${status}-step`,
          isWholeLine: true,
        }
      });
    });
    oldDecorations.forEach(s => {
      if (status != "current") {
        let i = this.currentStepDecorationIds.indexOf(s);
        if (i >= 0) this.stepDecorationIds.splice(i, 1);
      }
      let i = this.stepDecorationIds.indexOf(s);
      if (i >= 0) this.stepDecorationIds.splice(i, 1);
    });
    const newDecorations = this.editor.deltaDecorations(oldDecorations, decorations)
    if (status == "current") {
      this.currentStepDecorationIds = newDecorations;
    } else {
      newDecorations.forEach(s => this.stepDecorationIds.push(s));
    }
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

  public getCurrent(): IRuntimePosition {
    const model: monaco.editor.ITextModel = this.editor.getModel();
    let lineCount = model.getLineCount();
    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
      if (model.getLinesDecorations(lineNumber, lineNumber).some(d =>
        d.options.className == `debug-current-step`
      )) return { lineNumber: lineNumber, codeWidget: undefined };
    };
    let lineNumber = undefined;
    let glyphNode = document.querySelector(".vanessa-code-border > div.debug-current-step-glyph");
    if (glyphNode) glyphNode.parentNode.querySelectorAll('div').forEach((e, i) => { if (e == glyphNode) lineNumber = i + 1; });
    if (lineNumber) return { lineNumber: lineNumber, codeWidget: glyphNode.parentElement.dataset.id };
  }

  public next(): IRuntimePosition {
    let next: IRuntimePosition;
    let step = this.getCurrent();
    if (step) {
      if (step.codeWidget == undefined) {
        let codeWidget = undefined;
        let lineNumber = step.lineNumber;
        let prev = this.editor.getTopForLineNumber(lineNumber);
        let next = this.editor.getTopForLineNumber(++lineNumber);
        document.querySelectorAll('.vanessa-code-border').forEach((node: HTMLElement) => {
          let top = node.getBoundingClientRect().top;
          if (prev < top && top < next) codeWidget = node.dataset.id;
        })
        if (codeWidget) {
          this.setSubcodeProgress("current", codeWidget, 1);
          return { lineNumber: 1, codeWidget: codeWidget };
        } else {
          this.set("current", lineNumber);
          this.editor.revealLine(lineNumber);
          return { lineNumber: lineNumber, codeWidget: undefined };
        }
      } else {
        let code = step.codeWidget;
        let line = step.lineNumber;
        let node = document.querySelector(`.vanessa-code-border[data-id="${code}"]`) as HTMLElement;
        if (step.lineNumber < node.querySelectorAll('div').length) {
           this.setSubcodeProgress("current", code, ++line);
          return { lineNumber: line, codeWidget: code };
        } else {
          this.clearCurrentSubcode();
          let top = node.getBoundingClientRect().top;
          let lineCount = this.editor.getModel().getLineCount();
          for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
            if (this.editor.getTopForLineNumber(lineNumber) > top) {
              this.set("current", lineNumber);
              return { lineNumber: lineNumber, codeWidget: undefined };
            }
          }
        }
      }
    }
    this.set("current", 1);
    this.editor.revealLine(1);
    return { lineNumber: 1, codeWidget: undefined };
  }

  public clearCurrentSubcode() {
    this.currentStepDecorationIds = this.editor.deltaDecorations(this.currentStepDecorationIds, []);
    document.querySelectorAll(".vanessa-code-border > div.debug-current-step-glyph").forEach(e => e.classList.remove("debug-current-step-glyph"));
    document.querySelectorAll(".vanessa-code-lines > span.debug-current-step").forEach(e => e.classList.remove("debug-current-step"));
  }

  public setSubcodeProgress(status: string, id: string, arg: any): void {
    if (status == "current") this.clearCurrentSubcode();
    let lines = typeof (arg) == "string" ? JSON.parse(arg) : arg;
    if (typeof (lines) == "number") lines = [lines];
    var domNode = document.querySelector(`.vanessa-code-border[data-id="${id}"]`);
    if (domNode == undefined) return;
    domNode.querySelectorAll('div').forEach((e, i) => {
      if (lines.indexOf(i + 1) >= 0) {
        e.className = status == "current" ? "debug-current-step-glyph" : "";
      }
    });
    domNode.parentElement.querySelectorAll('.vanessa-code-lines > span').forEach((e, i) => {
      if (lines.indexOf(i + 1) >= 0) {
        e.className = `debug-${status}-step`;
      }
    });
  }

  public showError(lineNumber: number, data: string, text: string) {
    let ids = this.errorViewZoneIds;
    let style = (document.querySelector('div.view-lines') as HTMLElement).style;
    var domNode = document.createElement('div');
    domNode.classList.add('vanessa-error-widget');
    domNode.style.fontFamily = style.fontFamily;
    domNode.style.lineHeight = style.lineHeight;
    domNode.style.fontSize = style.fontSize;
    domNode.style.zIndex = "9999";
    var textNode = document.createElement('span');
    textNode.innerText = text;
    domNode.appendChild(textNode);
    var linkNode = document.createElement('div');
    linkNode.classList.add('vanessa-error-links');
    linkNode.dataset.value = data;
    this.VanessaEditor.errorLinks.forEach((e, i) => {
      if (i) {
        let sNode = document.createElement('span');
        sNode.innerHTML = '&nbsp;|&nbsp;';
        linkNode.appendChild(sNode);
      }
      let aNode = document.createElement('a');
      aNode.href = "#";
      aNode.dataset.id = e.id;
      aNode.innerText = e.title;
      aNode.setAttribute("onclick", "VanessaEditor.onErrorLink(this)");
      linkNode.appendChild(aNode);
    });
    domNode.appendChild(linkNode);
    this.editor.changeViewZones(changeAccessor =>
      ids.push(changeAccessor.addZone({
        afterLineNumber: lineNumber,
        afterColumn: 1,
        heightInLines: 2,
        domNode: domNode,
      }))
    );
  }

  public showCode(lineNumber: number, id: string, text: string) {
    let ids = this.codeViewZoneIds;
    let style = (document.querySelector('div.view-lines') as HTMLElement).style;
    var domNode = document.createElement('div');
    domNode.classList.add('vanessa-code-widget');
    domNode.style.fontFamily = style.fontFamily;
    domNode.style.lineHeight = style.lineHeight;
    domNode.style.fontSize = style.fontSize;
    domNode.style.zIndex = "9999";
    var leftNode = document.createElement('div');
    leftNode.classList.add('vanessa-code-border');
    leftNode.style.width = style.lineHeight;
    leftNode.dataset.id = id;
    domNode.appendChild(leftNode);
    var textNode = document.createElement('div');
    textNode.classList.add('vanessa-code-lines');
    textNode.style.left = style.lineHeight;
    domNode.appendChild(textNode);
    monaco.editor.colorize(text, "turbo-gherkin", {}).then((html: string) => {
      textNode.innerHTML = html;
      let linesCount = textNode.querySelectorAll('div>span').length;
      for (let i = 0; i < linesCount; i++) {
        var glyphNode = document.createElement('div');
        leftNode.appendChild(glyphNode);
        glyphNode.style.height = style.lineHeight;
      }
      this.editor.changeViewZones(changeAccessor =>
        ids.push(changeAccessor.addZone({
          heightInLines: linesCount,
          afterLineNumber: lineNumber,
          afterColumn: 1,
          domNode: domNode,
        })));
    });
  }

  public clearErrors(): void {
    let ids = this.errorViewZoneIds;
    this.editor.changeViewZones(changeAccessor =>
      ids.forEach(id => changeAccessor.removeZone(id)
      ));
    ids.length = 0;
  }

  public clearSubcode(): void {
    let ids = this.codeViewZoneIds;
    this.editor.changeViewZones(changeAccessor =>
      ids.forEach(id => changeAccessor.removeZone(id)
      ));
    ids.length = 0;
  }

  public clear(): void {
    this.currentStepDecorationIds = this.editor.deltaDecorations(this.currentStepDecorationIds, []);
    this.stepDecorationIds = this.editor.deltaDecorations(this.stepDecorationIds, []);
    this.clearErrors();
    this.clearSubcode();
  }
}
