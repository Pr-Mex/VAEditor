import { VanessaGherkinProvider } from "./languages/turbo-gherkin/provider";
import { IVanessaModel, VAImage } from "./languages/turbo-gherkin/common";
import { ImageWidget } from "./widgets/image";

export class SyntaxManager {

  private editor: monaco.editor.IStandaloneCodeEditor;
  private onChangeModelContent: monaco.IDisposable;
  private timer: NodeJS.Timeout;

  constructor(
    editor: monaco.editor.IStandaloneCodeEditor
  ) {
    this.editor = editor;
    this.checkSyntax();
    this.onChangeModelContent = this.editor.onDidChangeModelContent(() => this.checkSyntax());
  }

  public dispose(): void {
    this.onChangeModelContent.dispose();
    clearTimeout(this.timer);
    this.editor = null;
  }

  public getModel(): IVanessaModel {
    return this.editor.getModel() as IVanessaModel;
  }

  public checkSyntax() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() =>
      VanessaGherkinProvider.instance.checkSyntax(this)
      , 1000);
  }

  public normalizeIndentation() {
    const model = this.editor.getModel();
    const lines = model.getLinesContent();
    const value = lines.map(line =>
      model.normalizeIndentation(line)
    ).join(model.getEOL());
    model.setValue(value);
  }

  private imageViewZoneIds: Array<string> = [];

  public setImages(images: VAImage[]) {
    let ids = this.imageViewZoneIds;
    this.editor.changeViewZones(changeAccessor =>
      ids.forEach(id => changeAccessor.removeZone(id))
    );
    ids.length = 0;
    images.forEach(image =>{
      let widget = new ImageWidget(image.height, image.src);
      let id = widget.show(this.editor, image.lineNumber);
      ids.push(id);
    });
  }

  get errors(): number[] {
    return monaco.editor.getModelMarkers({owner: "syntax"}).map( m => m.startLineNumber );
  }
}
