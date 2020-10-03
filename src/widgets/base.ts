import { VanessaEditor } from "../vanessa-editor";

export class WidgetBase implements monaco.editor.IViewZone {
  public domNode: HTMLElement;
  public afterLineNumber: number;
  public heightInLines: number;
  public marginDomNode: HTMLElement;
  public afterColumn: number = 1;
  private editor: VanessaEditor;

  constructor(editor: VanessaEditor) {
    this.editor = editor;
  }

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

  public onErrorLink(id: string, data: string) {
    this.editor.fireEvent(id, data);
  }

  public error(data: string, text: string, parent: HTMLElement) {
    var textNode = this.div('vanessa-error-text', parent);
    var linkNode = this.div('vanessa-error-links', parent);
    textNode.innerText = text;
    this.editor.errorLinks.forEach((e: any, i: number) => {
      if (i) this.span('&nbsp;|&nbsp;', linkNode);
      let node = document.createElement('a');
      node.href = "#";
      node.innerText = e.title;
      node.addEventListener("click", this.onErrorLink.bind(this, e.id, data));
      linkNode.appendChild(node);
    });
  }
}
