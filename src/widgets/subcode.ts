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

  public id: string;
  public top: number;
  private textNode: HTMLElement;
  private leftNode: HTMLElement;
  private lineHeight: string;

  constructor(id: string) {
    this.id = id;
    let style = (document.querySelector('div.view-lines') as HTMLElement).style;
    this.domNode = document.createElement('div');
    this.domNode.classList.add('vanessa-code-widget');
    this.domNode.style.fontFamily = style.fontFamily;
    this.domNode.style.lineHeight = style.lineHeight;
    this.domNode.style.fontSize = style.fontSize;
    this.domNode.style.zIndex = "9999";
    this.domNode.dataset.id = id;
    this.lineHeight = style.lineHeight;

    this.leftNode = document.createElement('div');
    this.leftNode.classList.add('vanessa-code-border');
    this.leftNode.style.width = style.lineHeight;
    this.leftNode.dataset.id = id;
    this.domNode.appendChild(this.leftNode);

    this.textNode = document.createElement('div');
    this.textNode.classList.add('vanessa-code-lines');
    this.textNode.style.left = this.lineHeight;
    this.domNode.appendChild(this.textNode);

    this.marginDomNode = document.createElement('div');
  }

  public setContent(content: string, lineNumber: number, then: Function): void {
    monaco.editor.colorize(content, "turbo-gherkin", {}).then((html: string) => {
      this.textNode.innerHTML = html;
      this.afterLineNumber = lineNumber;
      this.heightInLines = this.textNode.querySelectorAll('div>span').length;
      for (let i = 0; i < this.heightInLines; i++) {
        var glyphNode = document.createElement('div');
        this.leftNode.appendChild(glyphNode);
        glyphNode.style.height = this.lineHeight;
      }
      then();
    });
  }

   public setText(html: string, lineNumber: number): void {
    this.textNode.innerHTML = html;
    this.afterLineNumber = lineNumber;
    this.heightInLines = this.textNode.querySelectorAll('div>span').length;
    for (let i = 0; i < this.heightInLines; i++) {
      var glyphNode = document.createElement('div');
      this.leftNode.appendChild(glyphNode);
      glyphNode.style.height = this.lineHeight;
    }
  }
}
