import { IWorkerContext, VanessaStep } from "./common";
import { KeywordMatcher } from "./matcher";

export enum VAWordType {
  Identifier = 1,
  Parameter = 2,
  Numerical = 3,
  Character = 4,
}

export interface VAStepWord {
  type: VAWordType,
  text: string,
}

export interface VAStepData {
  head: VAStepWord[],
  body: string[],
  keyword: string,
  documentation: string,
  insertText: string,
  sortText: string,
  section: string,
  kind: number,
}

export function splitStepWords(matcher: KeywordMatcher, text: string): VAStepWord[] {
  const tokens = [matcher.tokens.word, matcher.tokens.param, matcher.tokens.number, /./];
  const source = tokens.map((reg: RegExp) => "(" + reg.source + ")").join("|");
  const regexp = new RegExp(source, "gui");
  const result: VAStepWord[] = [];
  let match = undefined;
  while ((match = regexp.exec(text)) != undefined) {
    let type: VAWordType = undefined;
    for (let i = 1; i <= 4; ++i) if (match[i]) type = i;
    result.push({ type, text: match[0] });
  }
  return result;
}

export function updateStepLabels(ctx: IWorkerContext) {
  for (let key in ctx.steplist) {
    let e = ctx.steplist[key];
    e.label = e.head.map((w: VAStepWord): string => {
      if (w.type !== VAWordType.Parameter) return w.text;
      let name = w.text.substring(1, w.text.length - 1).toLowerCase();
      let elem = ctx.elements[name];
      if (!elem) return w.text;
      let Q1 = w.text.charAt(0);
      let Q2 = w.text.charAt(w.text.length - 1);
      return `${Q1}${elem}${Q2}`;
    }).join("");
    e.insertText = e.label + (e.body.length ? '\n' + e.body.join('\n') : '');
  }
}

export function setStepList(ctx: IWorkerContext, msg: { list: string, clear: boolean }) {
  if (msg.clear) ctx.steplist = {};
  JSON.parse(msg.list).forEach((e: VanessaStep) => {
    const body = e.insertText.split('\n');
    const text = body.shift();
    const match = text.match(ctx.matcher.step);
    if (match) {
      const keyword = match[0];
      const steptext = text.substring(keyword.length);
      const key = ctx.matcher.getStepKey(steptext);
      const head = splitStepWords(ctx.matcher, steptext);
      const data: VAStepData = {
        head: head,
        body: body,
        keyword: keyword,
        documentation: e.documentation,
        insertText: e.insertText,
        sortText: e.sortText,
        section: e.section,
        kind: e.kind,
      };
      ctx.steplist[key] = data;
    }
  });
  updateStepLabels(ctx);
}
