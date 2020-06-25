class SubcodeZone implements monaco.editor.IViewZone {
  top: number;
  afterLineNumber: number;
  heightInLines: number;
  domNode: HTMLElement;
  marginDomNode: HTMLElement;
  afterColumn: number = 1;
  suppressMouseDown: boolean = true;
  onDomNodeTop(top: number): void {
    this.top = top;
  }
  constructor(domNode: HTMLElement, marginDomNode: HTMLElement, afterLineNumber: number, heightInLines: number) {
    this.domNode = domNode;
    this.marginDomNode = marginDomNode;
    this.afterLineNumber = afterLineNumber;
    this.heightInLines = heightInLines;
  }
}

export class SubcodeWidget {

  private domNode: HTMLElement;
  private textNode: HTMLElement;
  private leftNode: HTMLElement;
  private marginNode: HTMLElement;
  private lineHeight: string;

  constructor(id: string) {
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

    let marginNode = document.createElement('div');
    marginNode.classList.add('vanessa-code-margin');
    marginNode.style.background = '#CCDDDD80';
  }

   public create(html: string, lineNumber: number): SubcodeZone {
    this.textNode.innerHTML = html;
    let linesCount = this.textNode.querySelectorAll('div>span').length;
    for (let i = 0; i < linesCount; i++) {
      var glyphNode = document.createElement('div');
      this.leftNode.appendChild(glyphNode);
      glyphNode.style.height = this.lineHeight;
    }
    return new SubcodeZone(this.domNode, this.marginNode, lineNumber, linesCount);
  }
}
