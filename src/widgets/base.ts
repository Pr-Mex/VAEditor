import { VanessaEditor } from "../vanessa-editor";

export class WidgetBase implements monaco.editor.IViewZone {
  public domNode: HTMLElement;
  public afterLineNumber: number;
  public heightInLines: number;
  public marginDomNode: HTMLElement;
  public afterColumn: number = 1;

  public div(className: string, parent: HTMLElement = null): HTMLElement {
    let node = document.createElement('div');
    if (className) node.classList.add(className);
    if (parent) parent.appendChild(node);
    return node;
  }

  public span(html: string, parent: HTMLElement): HTMLElement {
    let node = document.createElement('span');
    if (parent) parent.appendChild(node);
    node.innerHTML = html;
    return node;
  }

  public error(data: string, text: string, parent: HTMLElement) {
    var textNode = this.div('vanessa-error-text', parent);
    var linkNode = this.div('vanessa-error-links', parent);
    textNode.innerText = text;
    linkNode.dataset.value = data;
    VanessaEditor.get().errorLinks.forEach((e: any, i: number) => {
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
