import { IWorkerContext, IWorkerModel } from "./common";

function escapeMarkdown(text: string): string {
  // escape markdown syntax tokens: http://daringfireball.net/projects/markdown/syntax#backslash
  return text.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
}

export function getLineHover(ctx: IWorkerContext, model: IWorkerModel, msg: any) {
  let contents = [];
  let match = msg.line.match(/^\s*\*/);
  if (match) {
    let head = ctx.messages.soundHint;
    let char = String.fromCharCode(60277);
    let href = "#sound:" + msg.lineNumber;
    let text = msg.line.substr(match[0].length);
    contents.push({ value: `**${head}** [${char}](${href})` });
    contents.push({ value: escapeMarkdown(text) });
  } else {
    let words = ctx.matcher.splitWords(msg.line);
    let key = ctx.matcher.key(ctx.matcher.filterWords(words));
    let step = ctx.steplist[key];
    if (step) {
      let i = String.fromCharCode(60020);
      let s = String.fromCharCode(60277);
      let t = escapeMarkdown(step.section);
      let ih = "#info:" + key.replace(/ /g, "-");
      let sh = "#sound:" + msg.lineNumber;
      contents.push({ value: `**${t}** [${i}](${ih}) [${s}](${sh})` });
      contents.push({ value: escapeMarkdown(step.documentation) });
      let regexp = new RegExp(ctx.matcher.tokens.param, "gu");
      let vars = msg.line.match(regexp) || [];
      let used = {};
      vars.forEach((part: string) => {
        let d = /^.\$.+\$.$/.test(part) ? 2 : 1;
        let key = part.substring(d, part.length - d).toLowerCase();
        let data = ctx.variables[key];
        if (data && used[key] === undefined) {
          contents.push({ value: "**" + data.name + "** = " + data.value });
          used[key] = true;
        }
      });
    }
  }
  let range = {
    startLineNumber: msg.lineNumber,
    endLineNumber: msg.lineNumber,
    startColumn: msg.MinColumn,
    endColumn: msg.MaxColumn,
  };
  return { range: range, contents: contents };
}
