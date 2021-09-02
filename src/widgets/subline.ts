import { SubcodeWidget } from "./subcode";
import * as dom from 'monaco-editor/esm/vs/base/browser/dom';
const $ = dom.$;

export enum RuntileGlyphs {
  Breakpoint = "debug-breakpoint-glyph",
  Unverified = "debug-breakpoint-unverified-glyph",
  Current = "debug-current-step-glyph",
}

export enum BreakpointState {
  Unmarked = 0,
  Unverified = 1,
  Breakpoint = 2,
}

export class SubcodeLine {
  private owner: SubcodeWidget;
  private lineNode: HTMLElement;
  private foldingNode: HTMLElement;
  private breakpointNode: HTMLElement;
  private errorNodes: Array<HTMLElement> = [];
  private breakpoint: BreakpointState = BreakpointState.Unmarked;
  private collapsed: boolean = false;
  private visible: boolean = true;
  public lineNumber: number;
  public foldNumber: number;

  constructor(owner: SubcodeWidget, lineNode: HTMLElement) {
    this.owner = owner;
    this.owner.lines.push(this);
    this.lineNode = lineNode;
    this.lineNode.addEventListener("click", this.select.bind(this));
    this.breakpointNode = this.owner.div("cgmr", this.owner.leftNode);
    this.breakpointNode.addEventListener("click", this.togleBreakpoint.bind(this));
    this.foldingNode = this.owner.div(undefined, this.owner.overlayDom);
    this.foldNumber = this.lineNumber = this.owner.lines.length;
    this.patchLineHTML(this.lineNode);
  }

  private patchLineHTML(node: HTMLElement) {
    let first = node.firstElementChild;
    if (first == null) return;
    let space = first.innerHTML.match(/^[&nbsp;]*/)[0];
    first.innerHTML = first.innerHTML.substr(space.length);
    this.lineNode.insertBefore(this.owner.span(space, node), first);
    this.lineNode.firstElementChild.className = "space";
  }

  public initFolding(foldNumber: number) {
    this.foldNumber = foldNumber;
    if (this.foldNumber > this.lineNumber) {
      this.foldingNode.classList.add("codicon");
      this.foldingNode.classList.add("codicon-chevron-down");
      this.foldingNode.addEventListener("click", this.onFolding.bind(this));
    }
  }

  private onFolding() {
    this.setFolding(!(this.collapsed));
  }

  public setFolding(collapsed: boolean) {
    this.collapsed = collapsed;
    if (this.collapsed) {
      this.foldingNode.classList.remove("codicon-chevron-down");
      this.foldingNode.classList.add("codicon-chevron-right");
    } else {
      this.foldingNode.classList.remove("codicon-chevron-right");
      this.foldingNode.classList.add("codicon-chevron-down");
    }
    this.updateFolding();
    this.owner.layoutViewZone();
  }

  private updateFolding() {
    let forEachLine = (handler: (line: SubcodeLine) => void) => {
      for (let i = this.lineNumber; i < this.foldNumber; i++) {
        handler(this.owner.lines[i]);
      }
    };
    if (this.collapsed) {
      forEachLine((line: SubcodeLine) => line.setVisible(false));
    } else {
      forEachLine((line: SubcodeLine) => line.setVisible(true));
      forEachLine((line: SubcodeLine) => line.updateFolding());
    }
  }

  private setVisible(value: boolean) {
    this.visible = value;
    let nodes = [this.lineNode, this.foldingNode, this.breakpointNode].concat(this.errorNodes);
    if (value) nodes.forEach((n: HTMLElement) => n.classList.remove("vanessa-hidden"));
    else nodes.forEach((n: HTMLElement) => n.classList.add("vanessa-hidden"));
  }

  public select() {
    let range = new Range();
    range.selectNode(this.lineNode);
    document.getSelection().empty()
    document.getSelection().addRange(range);
    this.owner.selected = this.lineNumber;
  }

  get selected(): boolean {
    let selection = window.getSelection();
    if (selection.anchorOffset == 0 && selection.focusOffset == 0) {
      return selection.focusNode == this.lineNode;
    } else return selection.containsNode(this.lineNode, true);
  }

  public setCurrent(value: boolean) {
    if (value) {
      this.clearStatus();
      this.breakpointNode.classList.add(RuntileGlyphs.Current);
      this.lineNode.classList.add("debug-current-step");
    } else {
      this.breakpointNode.classList.remove(RuntileGlyphs.Current);
      this.lineNode.classList.remove("debug-current-step");
    }
  }

  public togleBreakpoint() {
    if (!this.owner.useDebugger) return;
    let classList = this.breakpointNode.classList;
    classList.remove(RuntileGlyphs.Breakpoint);
    classList.remove(RuntileGlyphs.Unverified);
    switch (this.breakpoint) {
      case BreakpointState.Breakpoint:
      case BreakpointState.Unverified:
        this.breakpoint = BreakpointState.Unmarked;
        break
      default:
        this.breakpoint = BreakpointState.Breakpoint;
        classList.add(RuntileGlyphs.Breakpoint);
        break;
    }
    this.owner.runtime.updateBreakpoints();
  }

  public setBreakpoint(breakpoint: BreakpointState) {
    this.breakpoint = breakpoint;
    let classList = this.breakpointNode.classList;
    classList.remove(RuntileGlyphs.Breakpoint, RuntileGlyphs.Unverified);
    switch (breakpoint) {
      case BreakpointState.Breakpoint: classList.add(RuntileGlyphs.Breakpoint); break;
      case BreakpointState.Unverified: classList.add(RuntileGlyphs.Unverified); break;
    }
  }

  public getBreakpoint(): BreakpointState {
    return this.breakpoint;
  }

  public setStatus(status: string = undefined, inline: string = undefined) {
    this.clearStatus();
    if (status) this.lineNode.classList.add(`debug-${status}-step`);
    if (inline) {
      const node = $("span", { class: "debug-inline-view" });
      node.textContent = inline;
      this.lineNode.appendChild(node);
    }
  }

  public setStyle(bold: boolean, italic: boolean, underline: boolean) {
    this.clearStyle();
    if (bold) this.lineNode.classList.add("vanessa-subcode-bold");
    if (italic) this.lineNode.classList.add("vanessa-subcode-italic");
    if (underline) this.lineNode.classList.add("vanessa-subcode-underline");
  }

  public clearStatus() {
    this.lineNode.classList.remove(
      "debug-complete-step",
      "debug-error-step",
      "debug-pending-step",
      "debug-disabled-step",
      "debug-current-step",
    );
    const inlineNode = this.lineNode.querySelector('span.debug-inline-view');
    if (inlineNode) inlineNode.remove();
  }

  public clearStyle() {
    this.lineNode.classList.remove(
      "vanessa-subcode-bold",
      "vanessa-subcode-italic",
      "vanessa-subcode-underline",
    );
  }

  private createErrorNode(node: HTMLElement, className: string): HTMLElement {
    let e = this.owner.div(className)
    let n = node.nextSibling;
    if (n) node.parentElement.insertBefore(e, n);
    else node.parentElement.appendChild(e);
    this.errorNodes.push(e);
    return e;
  }

  public showError(data: string, text: string) {
    this.clearErrors();
    let node = this.createErrorNode(this.lineNode, "vanessa-error-widget");
    this.createErrorNode(this.foldingNode, "error");
    this.createErrorNode(this.breakpointNode, "error");
    this.owner.error(data, text, node);
  }

  public clearErrors() {
    this.errorNodes.forEach((e: HTMLElement) => e.remove());
    this.errorNodes = [];
  }

  get heightInLines(): number {
    return this.visible ? (this.errorNodes.length ? 3 : 1) : 0;
  }

  public get value(): string {
    return this.lineNode.innerText;
  }
}
