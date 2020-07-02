import { RuntimeManager, IBreakpoint, Breakpoint } from "../runtime";
import { BaseWidget } from "./base";
import { editor } from "monaco-editor";

const glyphClassBreakpoint: string = "debug-breakpoint-glyph";
const glyphClassUnverified: string = "debug-breakpoint-unverified-glyph";
const glyphClassCurrent: string = "debug-current-step-glyph";

export class SubcodeWidget extends BaseWidget {

  public id: number;
  public content: string[];
  public decoration: string;
  private textNode: HTMLElement;
  private leftNode: HTMLElement;
  private current: number = 0;
  private selected: number;

  private runtime: RuntimeManager;
  private _breakpoints = {};

  private onBreakpointClick(e: MouseEvent) {
    let lineNumber = 0;
    this.leftNode.querySelectorAll('div.cgmr').forEach((node: HTMLElement, i: number) => {
      if (e.target == node) lineNumber = i + 1;
    });
    let node = e.target as HTMLElement;
    if (node.classList.contains(glyphClassBreakpoint)) {
      node.classList.remove(glyphClassBreakpoint);
      delete this._breakpoints[lineNumber];
    } else if (node.classList.contains(glyphClassUnverified)) {
      node.classList.remove(glyphClassUnverified);
      delete this._breakpoints[lineNumber];
    } else {
      node.classList.add(glyphClassUnverified);
      this._breakpoints[lineNumber] = true;
    }
    this.runtime.updateBreakpoints();
  }

  private onLineClick(e: MouseEvent) {
    let node = e.target as HTMLElement;
    while (true) {
      if (node.parentElement == this.textNode) break;
      node = node.parentElement;
      if (node == null) return;
    }
    let range = new Range();
    range.selectNode(node);
    document.getSelection().empty()
    document.getSelection().addRange(range);
    this.selected = parseInt(node.dataset.line);
  }

  constructor(runtime: RuntimeManager, content: string) {
    super();
    this.runtime = runtime;
    this.content = content.split(/\r\n|\r|\n/);
    this.domNode = this.div('vanessa-code-widget');
    this.textNode = this.div('vanessa-code-lines', this.domNode);
    this.leftNode = this.div('vanessa-code-border', this.domNode);
    this.marginDomNode = this.div('vanessa-code-margin', this.domNode);
    this.heightInLines = this.content.length;
    for (let i = 0; i < this.heightInLines; i++) {
      let node = this.div("cgmr", this.leftNode);
      node.addEventListener("click", this.onBreakpointClick.bind(this));
    }
    monaco.editor.colorize(content, "turbo-gherkin", {}).then((html: string) => {
      this.textNode.innerHTML = html;
      this.domNode.querySelectorAll('.vanessa-code-lines > span').forEach((node: HTMLElement, i: number) => {
        node.addEventListener("click", this.onLineClick.bind(this));
        node.dataset.line = String(i + 1);
        let first = node.firstElementChild;
        if (first) {
          let space = first.innerHTML.match(/^[&nbsp;]*/)[0];
          first.innerHTML = first.innerHTML.substr(space.length);
          node.insertBefore(this.span(space, node), first);
          node.firstElementChild.className = "space";
        }
      });
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
    for (let lineNumber in this._breakpoints) breakpoints.push(
      new Breakpoint(lineNumber, this.id, this._breakpoints[lineNumber])
    );
    return breakpoints;
  }

  set breakpoints(breakpoints: Array<IBreakpoint>) {
    this._breakpoints = {};
    this.leftNode.querySelectorAll("." + glyphClassBreakpoint).forEach((e: HTMLElement) => e.classList.remove(glyphClassBreakpoint));
    this.leftNode.querySelectorAll("." + glyphClassUnverified).forEach((e: HTMLElement) => e.classList.remove(glyphClassUnverified));
    if (breakpoints.length == 0) return;
    this.leftNode.querySelectorAll('div.cgmr').forEach((e: HTMLElement, i: number) => {
      let b = breakpoints.find(b => b.lineNumber == i + 1 && b.codeWidget == this.id);
      if (b) {
        e.classList.add(b.enable ? glyphClassBreakpoint : glyphClassUnverified);
        this._breakpoints[b.lineNumber] = b.enable;
      }
    });
  }

  public setCurrent(lineNumber: number): number {
    this.leftNode.querySelectorAll('div.cgmr').forEach((e: HTMLElement, i: number) => {
      if (i + 1 == lineNumber) e.classList.add(glyphClassCurrent);
      else e.classList.remove(glyphClassCurrent);
    });
    this.domNode.querySelectorAll('.vanessa-code-lines > span').forEach((e, i) => {
      if (i + 1 == lineNumber) e.className = "debug-current-step";
      else e.classList.remove("debug-current-step");
    });
    return this.current = 0 < lineNumber && lineNumber <= this.leftNode.childNodes.length ? lineNumber : 0;
  }

  private clearNodeStatus(node: HTMLElement): DOMTokenList {
    node.classList.remove("debug-complete-step", "debug-error-step", "debug-pending-step", "debug-disabled-step", "debug-current-step");
    return node.classList;
  }

  private clearNodeUnderline(node: HTMLElement): DOMTokenList {
    node.classList.remove("subcode-single-underline", "subcode-double-underline", "subcode-wavy-underline", "subcode-dotted-underline", "subcode-dashed-underline");
    return node.classList;
  }

  public setStatus(status: string, lines: Array<number>) {
    this.domNode.querySelectorAll('.vanessa-code-lines > span').forEach((e: HTMLElement, i) => {
      if (lines.indexOf(i + 1) != -1) this.clearNodeStatus(e).add(`debug-${status}-step`);
    });
  }

  public setUnderline(status: string, lines: Array<number>) {
    this.domNode.querySelectorAll('.vanessa-code-lines > span').forEach((e: HTMLElement, i) => {
      if (lines.indexOf(i + 1) != -1) this.clearNodeUnderline(e).add(`subcode-${status}-underline`);
    });
  }

  public clearStatus() {
    this.current = 0;
    this.leftNode.querySelectorAll('div.cgmr').forEach(e => e.classList.remove(glyphClassCurrent));
    this.domNode.querySelectorAll('.vanessa-code-lines > span').forEach((e: HTMLElement) => this.clearNodeStatus(e));
  }

  public clearUnderline() {
    this.domNode.querySelectorAll('.vanessa-code-lines > span').forEach((e: HTMLElement) => this.clearNodeUnderline(e));
  }

  public showError(lineNumber: number, data: string, text: string) {
    let line = undefined;
    this.leftNode.querySelectorAll('div.cgmr').forEach((e: HTMLElement, i: number) => {
      if (i == lineNumber) this.leftNode.insertBefore(this.div("error"), e);
    });
    this.domNode.querySelectorAll('.vanessa-code-lines > span').forEach((e, i) => {
      if (i == lineNumber) line = e;
    });
    let node = this.div('vanessa-error-widget');
    this.error(data, text, node);
    if (line) this.textNode.insertBefore(node, line); else this.textNode.append(node);
    this.heightInLines = this.heightInLines + 2;
    this.afterLineNumber = this.runtime.editor.getModel().getDecorationRange(this.decoration).endLineNumber;
    this.runtime.editor.changeViewZones(changeAccessor => changeAccessor.layoutZone(this.id));
  }

  public clearErrors() {
    this.leftNode.querySelectorAll('div.error').forEach((e: HTMLElement) => e.remove());
    this.textNode.querySelectorAll('div.vanessa-error-widget').forEach((e: HTMLElement) => e.remove());
    this.heightInLines = this.content.length;
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
    this.domNode.querySelectorAll('.vanessa-code-lines > span').forEach((node: HTMLElement, i: number) => {
      if (i + 1 == position.lineNumber) {
        let range = new Range();
        range.selectNode(node);
        document.getSelection().empty()
        document.getSelection().addRange(range);
        this.selected = parseInt(node.dataset.line);
      };
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
}
