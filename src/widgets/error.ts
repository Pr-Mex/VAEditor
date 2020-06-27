export class ErrorWidget implements monaco.editor.IViewZone {
  public domNode: HTMLElement;
  public afterLineNumber: number;
  public afterColumn: number;
  public heightInLines: number;
  public marginDomNode: HTMLElement;

  public id: number;

  constructor(data: string, text: string) {
    let style = (document.querySelector('div.view-lines') as HTMLElement).style;
    this.domNode = document.createElement('div');
    this.domNode.classList.add('vanessa-error-widget');
    this.domNode.style.fontFamily = style.fontFamily;
    this.domNode.style.lineHeight = style.lineHeight;
    this.domNode.style.fontSize = style.fontSize;
    this.domNode.style.zIndex = "9999";
    var textNode = document.createElement('span');
    textNode.innerText = text;
    this.domNode.appendChild(textNode);
    var linkNode = document.createElement('div');
    linkNode.classList.add('vanessa-error-links');
    linkNode.dataset.value = data;
    window["VanessaEditor"].errorLinks.forEach((e, i) => {
      if (i) {
        let sNode = document.createElement('span');
        sNode.innerHTML = '&nbsp;|&nbsp;';
        linkNode.appendChild(sNode);
      }
      let aNode = document.createElement('a');
      aNode.href = "#";
      aNode.dataset.id = e.id;
      aNode.innerText = e.title;
      aNode.setAttribute("onclick", "VanessaEditor.onErrorLink(this)");
      linkNode.appendChild(aNode);
    });
    this.domNode.appendChild(linkNode);
    this.afterColumn = 1;
    this.heightInLines = 2;
  }

  public show(editor: monaco.editor.IStandaloneCodeEditor, lineNumber: number): number {
    this.afterLineNumber = lineNumber;
    editor.changeViewZones(changeAccessor => {
      this.id = changeAccessor.addZone(this)
    });
    return this.id;
  }
}
