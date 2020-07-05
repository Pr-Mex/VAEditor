import { RuntimeManager, IBreakpoint, Breakpoint } from "../runtime";
import { SubcodeLine, RuntileGlyphs, BreakpointState } from "./subline";
import { BaseWidget } from "./base";

export class SubcodeWidget extends BaseWidget {

  public id: number;
  public content: string[];
  public decoration: string;
  public textNode: HTMLElement;
  public leftNode: HTMLElement;
  public overlayDom: HTMLElement;
  public current: number = 0;
  public selected: number;
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

  constructor(runtime: RuntimeManager, content: string) {
    super();
    this.runtime = runtime;
    this.content = content.split(/\r\n|\r|\n/);
    this.heightInLines = this.content.length;
    this.domNode = this.div('vanessa-code-widget');
    this.textNode = this.div('vanessa-code-lines', this.domNode);
    this.leftNode = this.div('vanessa-code-border', this.domNode);
    this.overlayDom = this.div('vanessa-code-overlays');
    this.overlayDom.classList.add('margin-view-overlays')
    let overlayWidget = {
      getId: () => 'overlay.zone.widget',
      getDomNode: () => this.overlayDom,
      getPosition: () => null
    };
    this.runtime.editor.addOverlayWidget(overlayWidget);
    monaco.editor.colorize(content, "turbo-gherkin", {}).then((html: string) => {
      this.textNode.innerHTML = html;
      this.domNode.querySelectorAll('.vanessa-code-lines > span').forEach((n: HTMLElement) => new SubcodeLine(this, n));
      this.lines.forEach((line: SubcodeLine) => line.initFolding(this.lines));
    });
  }

  public show(editor: monaco.editor.IStandaloneCodeEditor, lineNumber: number): number {
    this.afterLineNumber = lineNumber;
    editor.changeViewZones(changeAccessor => {
      this.id = changeAccessor.addZone(this)
    });
    this.domNode.dataset.id = String(this.id);
    this.leftNode.dataset.id = String(this.id);
    this.decoration = editor.deltaDecorations([], [{
      range: new monaco.Range(lineNumber, 1, lineNumber, 1),
      options: {},
    }])[0];
    return this.id;
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
      let b = breakpoints.find(b => b.lineNumber == line.lineNumber && b.codeWidget == this.id);
      line.setBreakpoint(b ? (b.enable ? State.Breakpoint : State.Unverified) : State.Unmarked);
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

  public setUnderline(status: string, lines: Array<number>) {
    this.lines.forEach((line: SubcodeLine) => { if (lines.some(n => n == line.lineNumber)) line.setUnderline(status); });
  }

  public clearStatus() {
    this.current = 0;
    this.lines.forEach((line: SubcodeLine) => line.setStatus());
  }

  public clearUnderline() {
    this.lines.forEach((line: SubcodeLine) => line.setUnderline());
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
    }
  }

  set position(position: any) {
    this.lines.forEach((line: SubcodeLine) => {
      if (line.lineNumber == position.lineNumber) line.select();
    });
  }

  get selection(): any {
    let selection = window.getSelection();
    let startLineNumber = 0;
    let endLineNumber = 0;
    this.domNode.querySelectorAll('.vanessa-code-lines > span').forEach((e, i) => {
      if (selection.containsNode(e, true)) {
        if (startLineNumber == 0) startLineNumber = i + 1;
        endLineNumber = i + 1;
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
    let lineHeight = this.runtime.editor.getConfiguration().lineHeight;
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
}
