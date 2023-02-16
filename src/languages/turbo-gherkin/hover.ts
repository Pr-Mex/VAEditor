import { getLineMaxColumn, getLineMinColumn, IWorkerContext, IWorkerModel } from "./common";

function escapeMarkdown(text: string): string {
  // escape markdown syntax tokens: http://daringfireball.net/projects/markdown/syntax#backslash
  return text.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
}

export function getLineHover(
  ctx: IWorkerContext,
  model: IWorkerModel,
  msg: any,
): monaco.languages.Hover {
  const line = model.getLineContent(msg.lineNumber);
  const contents = [];
  let match = line.match(/^\s*\*/);
  if (match) {
    let head = ctx.messages.soundHint;
    let char = String.fromCharCode(60277);
    let href = "#sound:" + msg.lineNumber;
    let text = line.substr(match[0].length);
    contents.push({ value: `**${head}** [${char}](${href})` });
    contents.push({ value: escapeMarkdown(text) });
  } else if (match = line.match(ctx.matcher.step)) {
    const steptext = line.substring(match[0].length);
    const snippet = ctx.matcher.getSnippet(steptext);
    let step = ctx.steplist[snippet];
    if (step) {
      let i = String.fromCharCode(60020);
      let c = String.fromCharCode(60373);
      let s = String.fromCharCode(60277);
      let t = escapeMarkdown(step.section);
      let ih = "#info:" + snippet.replace(/ /g, "-");
      let ch = "#compass:" + msg.lineNumber;
      let sh = "#sound:" + msg.lineNumber;
      contents.push({ value: `**${t}** [${i}](${ih}) [${c}](${ch}) [${s}](${sh})` });
      contents.push({ value: escapeMarkdown(step.documentation) });
      let regexp = new RegExp(ctx.matcher.tokens.param, "gu");
      let vars = line.match(regexp) || [];
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
    startColumn: getLineMinColumn(line),
    endColumn: getLineMaxColumn(line),
  };
  return { range, contents };
}
