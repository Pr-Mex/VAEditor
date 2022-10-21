import { VanessaGherkinProvider } from "./languages/turbo-gherkin/provider";
import { IVanessaModel, VAImage } from "./languages/turbo-gherkin/common";
import { ImageWidget } from "./widgets/image";
import { EventsManager, IVanessaEditor, VanessaEditorEvent } from "./common";

export class SyntaxManager {

  private editor: monaco.editor.IStandaloneCodeEditor;
  private onChangeModelContent: monaco.IDisposable;
  private timer: NodeJS.Timeout;
  private owner: IVanessaEditor;

  constructor(owner: IVanessaEditor) {
    this.owner = owner;
    this.editor = owner.editor;
    this.checkSyntax();
    this.onChangeModelContent = this.editor.onDidChangeModelContent(() => this.checkSyntax());
  }

  public dispose(): void {
    this.onChangeModelContent.dispose();
    clearTimeout(this.timer);
    this.editor = null;
    this.owner = null;
  }

  public getModel(): IVanessaModel {
    return this.editor.getModel() as IVanessaModel;
  }

  public checkSyntax() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() =>
      VanessaGherkinProvider.instance.checkSyntax(this.getModel(), this)
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

  private addImage(image: VAImage) {
    let widget = new ImageWidget(image.height, image.src);
    let id = widget.show(this.editor, image.lineNumber, image.column);
    this.imageViewZoneIds.push(id);
  }

  public setImages(images: VAImage[]) {
    let ids = this.imageViewZoneIds;
    this.editor.changeViewZones(changeAccessor =>
      ids.forEach(id => changeAccessor.removeZone(id))
    );
    ids.length = 0;
    images.forEach(image => {
      const regexp = /^https?:\/\//;
      if (regexp.test(image.src)) {
        this.addImage(image);
      } else {
        const eventData = {
          src: image.src,
          path: this.owner.getModel().uri.path,
          show: (src: string) => { image.src = src; this.addImage(image); },
        };
        EventsManager.fireEvent(this.owner, VanessaEditorEvent.REQUEST_IMAGE, eventData);
      }
    });
  }

  get errors(): number[] {
    return monaco.editor.getModelMarkers({owner: "syntax"}).map( m => m.startLineNumber );
  }
}
