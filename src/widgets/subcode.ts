export class SubcodeWidget implements monaco.editor.IViewZone {

  public domNode: HTMLElement;
  public afterLineNumber: number;
  public heightInLines: number;
  public marginDomNode: HTMLElement;
  public afterColumn: number = 1;

  public id: number;
  public content: string[];
  public decoration: string;
  private textNode: HTMLElement;
  private leftNode: HTMLElement;

  constructor(content: string) {
    this.content = content.split(/\r\n|\r|\n/);
    this.domNode = this.div('vanessa-code-widget');
    this.textNode = this.div('vanessa-code-lines', this.domNode);
    this.leftNode = this.div('vanessa-code-border', this.domNode);
    this.marginDomNode = this.div('vanessa-code-margin', this.domNode);
    this.heightInLines = this.content.length;
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
    this.decoration = editor.deltaDecorations([], [{
      range: new monaco.Range(lineNumber, 1, lineNumber, 1),
      options: {},
    }])[0];
    return this.id;
  }

  private div(className: string, parent: HTMLElement = null): HTMLElement {
    let node = document.createElement('div');
    if (className) node.classList.add(className);
    if (parent) parent.appendChild(node);
    return node;
  }

  public lineNumber(editor: monaco.editor.IStandaloneCodeEditor): number {
    return editor.getModel().getDecorationRange(this.decoration).startLineNumber;
  }

  public getContent(): string {
    return this.content.join("\r\n");
  }

  public getLineContent(lineNumber: number): string {
    return this.content[lineNumber - 1];
  }

  public getCurrent(): number {
    let lineNumber = 0;
    let glyphNode = this.leftNode.querySelector("div.debug-current-step-glyph");
    this.leftNode.childNodes.forEach((e, i) => { if (e == glyphNode) lineNumber = i + 1; });
    return lineNumber;
  }

  public next(): number {
    let lineNumber = this.getCurrent() + 1;
    if (lineNumber > this.leftNode.childNodes.length) lineNumber = 0;
    this.setCurrent(lineNumber);
    return lineNumber;
  }

  public setCurrent(lineNumber: number) {
    this.leftNode.childNodes.forEach((e: HTMLElement, i) => {
      if (i + 1 == lineNumber) {
        e.classList.add("debug-current-step-glyph");
      } else {
        e.classList.remove("debug-current-step-glyph");
      }
    });
    this.domNode.querySelectorAll('.vanessa-code-lines > span').forEach((e, i) => {
      if (i + 1 == lineNumber) {
        e.classList.add("debug-current-step");
      } else {
        e.classList.remove("debug-current-step");
      }
    });
  }
}
