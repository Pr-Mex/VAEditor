export class SubcodeWidget implements monaco.editor.IViewZone {

  public domNode: HTMLElement;
  public afterLineNumber: number;
  public heightInLines: number;
  public marginDomNode: HTMLElement;
  public afterColumn: number = 1;
  public suppressMouseDown: boolean = true;
  public onDomNodeTop(top: number): void {
    this.top = top;
  }

  public id: number;
  public top: number;
  private textNode: HTMLElement;
  private leftNode: HTMLElement;
  private lineHeight: string;

  constructor(content: string) {
    let style = (document.querySelector('div.view-lines') as HTMLElement).style;
    this.domNode = document.createElement('div');
    this.domNode.classList.add('vanessa-code-widget');
    this.domNode.style.fontFamily = style.fontFamily;
    this.domNode.style.lineHeight = style.lineHeight;
    this.domNode.style.fontSize = style.fontSize;
    this.domNode.style.zIndex = "9999";
    this.lineHeight = style.lineHeight;

    this.leftNode = document.createElement('div');
    this.leftNode.classList.add('vanessa-code-border');
    this.leftNode.style.width = style.lineHeight;
    this.domNode.appendChild(this.leftNode);

    this.textNode = document.createElement('div');
    this.textNode.classList.add('vanessa-code-lines');
    this.textNode.style.left = this.lineHeight;
    this.domNode.appendChild(this.textNode);

    this.marginDomNode = document.createElement('div');

    this.heightInLines = content.split(/\r\n|\r|\n/).length;
    for (let i = 0; i < this.heightInLines; i++) {
      var glyphNode = document.createElement('div');
      this.leftNode.appendChild(glyphNode);
      glyphNode.style.height = this.lineHeight;
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
}
