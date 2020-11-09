import { WidgetBase } from "./base";
import { RuntimeManager, IBreakpoint, Breakpoint } from "../runtime";
import { SubcodeLine, RuntileGlyphs, BreakpointState } from "./subline";

import * as dom from 'monaco-editor/esm/vs/base/browser/dom';
import { VanessaGherkinProvider } from "../languages/turbo-gherkin/provider";

const $ = dom.$;

export class SubcodeWidget extends WidgetBase {

  public id: string;
  public content: string[];
  public decoration: string;
  public textNode: HTMLElement;
  public leftNode: HTMLElement;
  public overlayDom: HTMLElement;
  public current: number = 0;
  public selected: number = 0;
  public lines: Array<SubcodeLine> = [];
  public runtime: RuntimeManager;

  public togleBreakpoint(lineNumber: number) {
    this.lines.forEach((line: SubcodeLine) => {
      if (line.lineNumber == lineNumber) line.togleBreakpoint();
    });
  }

  public onDomNodeTop(top: number) {
    this.overlayDom.style.top = top + "px";
  }

  public onComputedHeight(height: number) {
    this.overlayDom.style.height = height + "px";
  }

  private overlayWidget: monaco.editor.IOverlayWidget;
  private showBreakpoints: boolean = false;

  constructor(runtime: RuntimeManager, content: string) {
    super(runtime.owner);
    this.runtime = runtime;
    this.content = content.split(/\r\n|\r|\n/);
    this.heightInLines = this.content.length;
    this.domNode = $(".vanessa-code-widget", {},
      this.textNode = $(".vanessa-code-lines"),
      this.leftNode = $('.vanessa-code-border'),
    );
    this.overlayDom = this.div('vanessa-code-overlays');
    this.overlayDom.classList.add('margin-view-overlays');
    this.overlayWidget = {
      getId: () => 'overlay.zone.widget',
      getDomNode: () => this.overlayDom,
      getPosition: () => null
    };
    this.runtime.editor.addOverlayWidget(this.overlayWidget);
    monaco.editor.colorize(content, "turbo-gherkin", {}).then((html: string) => {
      this.textNode.innerHTML = html;
      const model = this.runtime.editor ? this.runtime.editor.getModel() : null;
      let lineNode = this.textNode.firstElementChild;
      while (lineNode) {
        if (lineNode.nodeName.toUpperCase() == "SPAN") {
          new SubcodeLine(this, lineNode as HTMLElement);
        }
        lineNode = lineNode.nextElementSibling;
      }
      if (model) VanessaGherkinProvider.instance.getCodeFolding(
        model.getOptions().tabSize,
        this.lines.length,
        lineNumber => this.getLineContent(lineNumber)
      ).forEach(e => this.lines[e.start - 1].initFolding(e.end));
    });
    this.useDebugger = runtime.useDebugger;
  }

  public dispose(): void {
    this.runtime.editor.removeOverlayWidget(this.overlayWidget);
    this.overlayDom.remove();
  }

  public set useDebugger(value: boolean) {
    if (value) {
      this.leftNode.classList.add("vanessa-use-breakpoints");
    } else {
      this.leftNode.classList.remove("vanessa-use-breakpoints");
      this.breakpoints = [];
    }
    this.showBreakpoints = value;
  }

  public get useDebugger() {
    return this.showBreakpoints;
  }

  public show(editor: monaco.editor.IStandaloneCodeEditor, lineNumber: number): string {
    this.afterLineNumber = lineNumber;
    editor.changeViewZones(changeAccessor => {
      this.id = changeAccessor.addZone(this)
    });
    this.domNode.dataset.id = String(this.id);
    this.leftNode.dataset.id = String(this.id);
    this.decoration = editor.deltaDecorations([], [{
      range: new monaco.Range(lineNumber, 1, lineNumber, 1),
      options: { stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges },
    }])[0];
    setTimeout(() => this.layoutViewZone, 200);
    return this.id;
  }

  public updateOverlayVisible() {
    if (this.domNode.offsetHeight) this.overlayDom.classList.remove("vanessa-hidden");
    else this.overlayDom.classList.add("vanessa-hidden");
  }

  public lineNumber(editor: monaco.editor.IStandaloneCodeEditor): number {
    return editor.getModel().getDecorationRange(this.decoration).endLineNumber;
  }

  public getContent(): string {
    return this.content.join("\r\n");
  }

  public getLineContent(lineNumber: number): string {
    return this.content[lineNumber - 1];
  }

  public getCurrent(): number {
    return this.current;
  }

  public next(): number {
    return this.setCurrent(this.getCurrent() + 1);
  }

  get breakpoints(): Array<IBreakpoint> {
    let breakpoints = [];
    this.lines.forEach((line: SubcodeLine) => {
      switch (line.getBreakpoint()) {
        case BreakpointState.Breakpoint: breakpoints.push(new Breakpoint(line.lineNumber, this.id, true)); break;
        case BreakpointState.Unverified: breakpoints.push(new Breakpoint(line.lineNumber, this.id, false)); break;
      }
    });
    return breakpoints;
  }

  set breakpoints(breakpoints: Array<IBreakpoint>) {
    let State = BreakpointState;
    this.lines.forEach((line: SubcodeLine) => {
      let breakpoint = undefined;
      breakpoints.forEach(b => { if (b.lineNumber == line.lineNumber && b.codeWidget == this.id) breakpoint = b; });
      line.setBreakpoint(breakpoint ? (breakpoint.enable ? State.Breakpoint : State.Unverified) : State.Unmarked);
    });
  }

  public setCurrent(lineNumber: number): number {
    this.current = 0;
    this.lines.forEach((line: SubcodeLine) => {
      line.setCurrent(line.lineNumber == lineNumber);
      if (line.lineNumber == lineNumber) {
        this.revealLine(lineNumber);
        this.current = line.lineNumber;
      }
    });
    return this.current;
  }

  public setStatus(status: string, lines: Array<number>) {
    this.lines.forEach((line: SubcodeLine) => { if (lines.some(n => n == line.lineNumber)) line.setStatus(status); });
  }

  public setStyle(lines: Array<number>, bold: boolean, italic: boolean, underline: boolean) {
    this.lines.forEach((line: SubcodeLine) => { if (lines.some(n => n == line.lineNumber)) line.setStyle(bold, italic, underline); });
  }

  public clearStatus() {
    this.current = 0;
    this.lines.forEach((line: SubcodeLine) => line.clearStatus());
  }

  public clearStyle() {
    this.lines.forEach((line: SubcodeLine) => line.clearStyle());
  }

  public showError(lineNumber: number, data: string, text: string) {
    this.lines.forEach((line: SubcodeLine) => {
      if (line.lineNumber == lineNumber) {
        line.showError(data, text);
      }
    });
    this.layoutViewZone();
  }

  public clearErrors() {
    this.lines.forEach((line: SubcodeLine) => line.clearErrors());
    this.layoutViewZone();
  }

  public layoutViewZone() {
    this.heightInLines = 0;
    this.lines.forEach((line: SubcodeLine) => this.heightInLines += line.heightInLines);
    this.afterLineNumber = this.runtime.editor.getModel().getDecorationRange(this.decoration).endLineNumber;
    this.runtime.editor.changeViewZones(changeAccessor => changeAccessor.layoutZone(this.id));
  }

  get position(): any {
    return {
      lineNumber: this.selected,
      codeWidget: this.id,
      column: 1,
    };
  }

  set position(position: any) {
    this.lines.forEach((line: SubcodeLine) => {
      if (line.lineNumber == position.lineNumber) line.select();
    });
  }

  get selection(): Object {
    let startLineNumber = 0;
    let endLineNumber = 0;
    this.lines.forEach((line: SubcodeLine) => {
      if (line.selected) {
        if (startLineNumber == 0) startLineNumber = line.lineNumber;
        endLineNumber = line.lineNumber;
      }
    });
    if (startLineNumber) return {
      codeWidget: this.id,
      startLineNumber: startLineNumber,
      endLineNumber: endLineNumber,
      startColumn: 1,
      endColumn: 1,
    }
    return undefined;
  }

  public setFolding(lineNumber: number, collapsed: boolean) {
    this.lines.forEach((line: SubcodeLine) => {
      if (line.lineNumber == lineNumber) line.setFolding(collapsed);
    });
  }

  public revealLine(lineNumber: number) {
    let size = { top: 0, bottom: 2 };
    let lineHeight = this.runtime.editor.getOption(monaco.editor.EditorOption.lineHeight);
    this.lines.forEach((line: SubcodeLine) => {
      if (line.lineNumber <= lineNumber) {
        size.top = size.bottom;
        size.bottom += line.heightInLines;
      }
    });
    let editor = this.runtime.editor;
    let afterLine = editor.getModel().getDecorationRange(this.decoration).endLineNumber;
    let top = editor.getTopForLineNumber(afterLine);
    size.top = top + size.top * lineHeight;
    size.bottom = top + size.bottom * lineHeight;
    let scrollTop = editor.getScrollTop();
    let clientHeight = editor.getDomNode().clientHeight;
    let scrollBottom = scrollTop + clientHeight;
    if (size.bottom > scrollBottom) editor.setScrollTop(size.bottom - clientHeight);
    else if (size.top < scrollTop) editor.setScrollTop(size.top);
  }

  public revealLineInCenter(lineNumber: number) {
    let size = { top: 0, bottom: 2, center: 0 };
    let lineHeight = this.runtime.editor.getOption(monaco.editor.EditorOption.lineHeight);
    this.lines.forEach((line: SubcodeLine) => {
      if (line.lineNumber <= lineNumber) {
        size.top = size.bottom;
        size.bottom += line.heightInLines;
      }
    });
    let editor = this.runtime.editor;
    let afterLine = editor.getModel().getDecorationRange(this.decoration).endLineNumber;
    let top = editor.getTopForLineNumber(afterLine);
    size.top = top + size.top * lineHeight;
    size.bottom = top + size.bottom * lineHeight;
    size.center = (size.top + size.bottom) / 2;
    let clientHeight = editor.getDomNode().clientHeight;
    editor.setScrollTop(size.center - clientHeight / 2);
  }
}
