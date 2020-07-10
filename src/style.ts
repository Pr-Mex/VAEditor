export class StyleManager {
  private lineHeight: number = 0;

  constructor(
    public editor: monaco.editor.IStandaloneCodeEditor
  ) {
    editor.onDidLayoutChange(e => this.updateLineHeight());
    this.updateLineHeight();
  }

  private updateLineHeight() {
    let lineHeight = this.editor.getOption(monaco.editor.EditorOption.lineHeight);
    let fontFamily = this.editor.getOption(monaco.editor.EditorOption.fontFamily);
    let fontSize = this.editor.getOption(monaco.editor.EditorOption.fontSize);
    if (this.lineHeight == lineHeight) return;

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
      font-family: ${fontFamily};\
      font-size: ${fontSize}px;\
      line-height: ${lineHeight}px;\
    }\
    .vanessa-code-overlays { left: ${3 * lineHeight}px; }\
    .vanessa-code-overlays div { height: ${lineHeight}px; }\
    .vanessa-error-widget { height: ${2 * lineHeight}px; }\
    .vanessa-code-lines { left: ${lineHeight}px; }\
    .vanessa-code-border { width: ${lineHeight}px; }\
    .vanessa-code-lines > span { height: ${lineHeight}px; }\
    .vanessa-code-border div.cgmr { height: ${lineHeight}px; }\
    .vanessa-code-border div.error { height: ${2 * lineHeight}px; }\
    .vanessa-code-overlays div.error { height: ${2 * lineHeight}px; }\
    `;
  }
}
