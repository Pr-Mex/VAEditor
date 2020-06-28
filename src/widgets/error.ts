import { BaseWidget } from "./base";

export class ErrorWidget  extends BaseWidget {

  public id: number;

  constructor(data: string, text: string) {
    super();
    this.domNode = this.div('vanessa-error-widget');
    this.showError(data, text, this.domNode);
  }

  public show(editor: monaco.editor.IStandaloneCodeEditor, lineNumber: number): number {
    this.afterColumn = 1;
    this.heightInLines = 2;
    this.afterLineNumber = lineNumber;
    editor.changeViewZones(changeAccessor => {
      this.id = changeAccessor.addZone(this)
    });
    return this.id;
  }
}
