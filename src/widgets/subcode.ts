export class SubcodeWidget implements monaco.editor.IViewZone {

  public domNode: HTMLElement;
  public afterLineNumber: number;
  public heightInLines: number;
  public marginDomNode: HTMLElement;
  public afterColumn: number = 1;

  public id: number;
  private textNode: HTMLElement;
  private leftNode: HTMLElement;

  constructor(content: string) {
    this.domNode = this.div('vanessa-code-widget');
    this.textNode = this.div('vanessa-code-lines', this.domNode);
    this.leftNode = this.div('vanessa-code-border', this.domNode);
    this.marginDomNode = document.createElement('div');
    this.heightInLines = content.split(/\r\n|\r|\n/).length;
    for (let i = 0; i < this.heightInLines; i++) {
      this.div("", this.leftNode);
    }
    monaco.editor.colorize(content, "turbo-gherkin", {})
      .then((html: string) => this.textNode.innerHTML = html);
  }

  public show(editor: monaco.editor.IStandaloneCodeEditor, lineNumber: number): number {
    this.afterLineNumber = lineNumber;
    editor.changeViewZones(changeAccessor => {
      this.id = changeAccessor.addZone(this)
    });
    this.domNode.dataset.id = String(this.id);
    this.leftNode.dataset.id = String(this.id);
    return this.id;
  }

  private div(className: string, parent: HTMLElement = null): HTMLElement {
    let node = document.createElement('div');
    if (className) node.classList.add(className);
    if (parent) parent.appendChild(node);
    return node;
  }
}
