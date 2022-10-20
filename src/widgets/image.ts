import { VanessaEditor } from "../vanessa-editor";
import { WidgetBase } from "./base";

export class ImageWidget implements monaco.editor.IViewZone {

  public id: string;
  public domNode: HTMLElement;
  public afterLineNumber: number;
  public heightInLines: number;
  public afterColumn: number = 1;

  constructor(height: number, src: string) {
    this.heightInLines = height;
    this.domNode = document.createElement('div');
    this.domNode.classList.add('vanessa-img-widget');
    let img = document.createElement('img');
    img.src = src;
    this.domNode.appendChild(img);
  }

  public show(editor: monaco.editor.IStandaloneCodeEditor, lineNumber: number): string {
    this.afterLineNumber = lineNumber;
    editor.changeViewZones(changeAccessor => {
      this.id = changeAccessor.addZone(this)
    });
    return this.id;
  }
}
