import { SubcodeWidget } from "./subcode";

export enum RuntileGlyphs {
  Breakpoint = "debug-breakpoint-glyph",
  Unverified = "debug-breakpoint-unverified-glyph",
  Current = "debug-current-step-glyph",
}

export class SubcodeLine {
  private owner: SubcodeWidget;
  private lineNode: HTMLElement;
  private foldingNode: HTMLElement;
  private breakpointNode: HTMLElement;
  private errorNodes: Array<HTMLElement> = [];
  public lineNumber: number;

  constructor(owner: SubcodeWidget, lineNode: HTMLElement) {
    this.owner = owner;
    this.owner.lines.push(this);
    this.lineNode = lineNode;
    this.lineNode.addEventListener("click", this.select.bind(this));
    this.breakpointNode = this.owner.div("cgmr", this.owner.leftNode);
    this.breakpointNode.addEventListener("click", this.onBreakpointClick.bind(this));
    this.foldingNode = this.owner.div("folding", this.owner.overlayDom);
    this.lineNumber = this.owner.lines.length;
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

  private onBreakpointClick(e: MouseEvent) {
    console.log("onBreakpointClick");
    let value = false;
    let classList = this.breakpointNode.classList;
    if (classList.contains(RuntileGlyphs.Breakpoint)) {
      classList.remove(RuntileGlyphs.Breakpoint);
    } else if (classList.contains(RuntileGlyphs.Unverified)) {
      classList.remove(RuntileGlyphs.Unverified);
    } else {
      classList.add(RuntileGlyphs.Unverified);
      value = true;
    }
    this.owner.togleBreakpoint(this.lineNumber, value);
  }

  public select() {
    let range = new Range();
    range.selectNode(this.lineNode);
    document.getSelection().empty()
    document.getSelection().addRange(range);
    this.owner.selected = this.lineNumber;
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

  public setBreakpoint(status: boolean | undefined) {
    let classList = this.breakpointNode.classList;
    classList.remove(RuntileGlyphs.Breakpoint);
    classList.remove(RuntileGlyphs.Unverified);
    switch (status) {
      case false: classList.add(RuntileGlyphs.Unverified); break;
      case true: classList.add(RuntileGlyphs.Breakpoint); break;
    }
  }

  public setStatus(status: string = undefined) {
    this.clearStatus();
    if (status) this.lineNode.classList.add(`debug-${status}-step`);
  }

  public setUnderline(status: string = undefined) {
    this.clearUnderline();
    if (status) this.lineNode.classList.add(`subcode-${status}-underline`);
  }

  private clearStatus() {
    this.lineNode.classList.remove(
      "debug-complete-step",
      "debug-error-step",
      "debug-pending-step",
      "debug-disabled-step",
      "debug-current-step",
    );
  }

  private clearUnderline() {
    this.lineNode.classList.remove(
      "subcode-single-underline",
      "subcode-double-underline",
      "subcode-wavy-underline",
      "subcode-dotted-underline",
      "subcode-dashed-underline",
    );
  }

  private createErrorNode(node: HTMLElement, className: string): HTMLElement {
    let e = this.owner.div(className)
    let n = node.nextSibling;
    if (n) node.parentElement.insertBefore(e, n);
    else node.parentElement.append(e);
    this.errorNodes.push(e);
    return e;
  }

  public showError(data: string, text: string) {
    this.createErrorNode(this.foldingNode, "error");
    this.createErrorNode(this.breakpointNode, "error");
    let error = this.createErrorNode(this.lineNode, "vanessa-error-widget");
    this.owner.error(data, text, error);
  }

  public clearErrors() {
    this.errorNodes.forEach((e: HTMLElement) => e.remove());
    this.errorNodes = [];
  }
}
