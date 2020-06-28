export class BaseWidget implements monaco.editor.IViewZone {
  public domNode: HTMLElement;
  public afterLineNumber: number;
  public heightInLines: number;
  public marginDomNode: HTMLElement;
  public afterColumn: number = 1;

  protected div(className: string, parent: HTMLElement = null): HTMLElement {
    let node = document.createElement('div');
    if (className) node.classList.add(className);
    if (parent) parent.appendChild(node);
    return node;
  }

  protected span(html: string, parent: HTMLElement): HTMLElement {
    let node = document.createElement('span');
    if (parent) parent.appendChild(node);
    node.innerHTML = html;
    return node;
  }

  protected showError(data: string, text: string, parent: HTMLElement) {
    var textNode = this.div('vanessa-error-text', this.domNode);
    var linkNode = this.div('vanessa-error-links', this.domNode);
    textNode.innerText = text;
    linkNode.dataset.value = data;
    window["VanessaEditor"].errorLinks.forEach((e: any, i: number) => {
      if (i) this.span('&nbsp;|&nbsp;', linkNode);
      let node = document.createElement('a');
      node.href = "#";
      node.dataset.id = e.id;
      node.innerText = e.title;
      node.setAttribute("onclick", "VanessaEditor.onErrorLink(this)");
      linkNode.appendChild(node);
    });
  }
}
