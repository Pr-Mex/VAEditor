import { ProviderBase } from "./provider.base";

export class HoverProvider extends ProviderBase {
  public static getHoverContents(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ): monaco.languages.Hover {
    let contents = [];
    let line = model.getLineContent(position.lineNumber)
    let words = this.splitWords(line);
    let key = this.key(this.filterWords(words));
    let char = String.fromCharCode(60020);
    let step = this.steps[key];
    if (step) {
      let href = "#info:" + key.replace(/ /g, "-");
      contents.push({ value: `**${step.section}** [${char}](${href})`});
      contents.push({ value: step.documentation });
      let values = this.variables;
      let vars = line.match(/"[^"]+"|'[^']+'/g) || [];
      vars.forEach(function (part: string) {
        let d = /^.\$.+\$.$/.test(part) ? 2 : 1;
        let v = values[part.substring(d, part.length - d).toLowerCase()];
        if (v) contents.push({ value: "**" + v.name + "** = " + v.value });
      });
    }
    let range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: model.getLineMinColumn(position.lineNumber),
      endColumn: model.getLineMaxColumn(position.lineNumber),
    };
    return { range: range, contents: contents }
  }
}
