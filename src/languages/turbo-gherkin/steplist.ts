import { IWorkerContext, VanessaStep } from "./common";

export function updateStepLabels(ctx: IWorkerContext) {
  for (let key in ctx.steplist) {
    let e = ctx.steplist[key];
    let words = e.head.map((word: string) => {
      let regexp = /^"[^"]*"$|^'[^']*'$|^<[^<]*>$/g;
      if (!regexp.test(word)) return word;
      let name = word.substring(1, word.length - 1).toLowerCase();
      let elem = ctx.elements[name];
      if (!elem) return word;
      let Q1 = word.charAt(0);
      let Q2 = word.charAt(word.length - 1);
      return `${Q1}${elem}${Q2}`;
    });
    let keyword = ctx.matcher.findKeyword(words);
    e.label = words.filter((w, i) => !(keyword && i < keyword.length)).join(' ');
    e.keyword = words.filter((w, i) => (keyword && i < keyword.length)).join(' ');
    e.insertText = e.label + (e.body.length ? '\n' + e.body.join('\n') : '');
  }
}

export function setStepList(ctx: IWorkerContext, msg: { list: string, clear: boolean }) {
  if (msg.clear) ctx.steplist = { };
  JSON.parse(msg.list).forEach((e: VanessaStep) => {
    const body = e.insertText.split('\n');
    const text = body.shift();
    const head = ctx.matcher.splitWords(text);
    const words = ctx.matcher.filterWords(head);
    const key = ctx.matcher.key(words);
    ctx.steplist[key] = {
      head: head,
      body: body,
      documentation: e.documentation,
      insertText: e.insertText,
      sortText: e.sortText,
      section: e.section,
      kind: e.kind,
    };
  });
  updateStepLabels(ctx);
}
