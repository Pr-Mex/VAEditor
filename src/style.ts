export class StyleManager {
  private lineHeight: number = 0;

  constructor(
    public editor: monaco.editor.IStandaloneCodeEditor
  ) {
    editor.onDidLayoutChange(e => this.setStyle());
    this.setStyle();
  }

  public dispose(): void {
    this.editor = null;
  }

  private setStyle() {
    let conf = this.editor.getConfiguration();
    if (this.lineHeight == conf.lineHeight) return;

    const id = 'vanessa-widget-style';
    let style = document.getElementById(id) as HTMLElement;
    if (style == null) {
      style = document.createElement('style');
      style.setAttribute("type", "text/css");
      style.id = id;
      document.head.appendChild(style)
    }
    style.innerHTML = `\
    .vanessa-code-widget, .vanessa-error-widget {\
      font-family: ${conf.fontInfo.fontFamily};\
      font-size: ${conf.fontInfo.fontSize}px;\
      line-height: ${conf.lineHeight}px;\
    }\
    .vanessa-code-overlays { left: ${3 * conf.lineHeight}px; }\
    .vanessa-code-overlays div { height: ${conf.lineHeight}px; }\
    .vanessa-error-widget { height: ${2 * conf.lineHeight}px; }\
    .vanessa-code-lines { left: ${conf.lineHeight}px; }\
    .vanessa-code-border { width: ${conf.lineHeight}px; }\
    .vanessa-code-border div.cgmr { height: ${conf.lineHeight}px; }\
    .vanessa-code-border div.error { height: ${2 * conf.lineHeight}px; }\
    .vanessa-code-overlays div.error { height: ${2 * conf.lineHeight}px; }\
    `;
  }
}
