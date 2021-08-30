import * as distance from 'jaro-winkler';
import { IWorkerContext } from './common';
import { KeywordMatcher } from './matcher';

function addQuickFix(ctx: IWorkerContext, list: any, value: string, index: number) {
  let words = ctx.matcher.splitWords(value);
  let keyword = ctx.matcher.findKeyword(words);
  if (keyword == undefined) return;
  let regexp = "^[\\s]*";
  keyword.forEach(w => regexp += w + "[\\s]+");
  let startColumn = 1;
  let endColumn = value.length + 1;
  let match = value.toLowerCase().match(new RegExp(regexp));
  if (match) startColumn = match[0].length + 1;
  let line = ctx.matcher.key(ctx.matcher.filterWords(words));
  for (let key in ctx.steplist) {
    let sum = distance(line, key);
    if (sum > 0.7) list.push({ key, sum, words, index, startColumn, endColumn });
  }
}

function replaceParams(matcher: KeywordMatcher, step: string[], line: string[]): string {
  let index = 0;
  step = matcher.filterWords(step);
  let regexp = /^"[^"]*"$|^'[^']*'$|^<[^<]*>$/g;
  let test = (w: string) => (new RegExp(regexp.source)).test(w);
  let params = line.filter(w => test(w));
  return step.map(w => (test(w) && index < params.length) ? params[index++] : w).join(' ');
}

export function getCodeActions(ctx: IWorkerContext, msg: { errors: any }): any {
  const list = [];
  const result = [];
  msg.errors.forEach(e => addQuickFix(ctx, list, e.value, e.index));
  list.sort((a, b) => b.sum - a.sum).forEach((e, i) => {
    if (i > 6) return;
    const step = ctx.steplist[e.key];
    const text = replaceParams(ctx.matcher, step.head, e.words);
    result.push({ text, index: e.index, startColumn: e.startColumn, endColumn: e.endColumn });
  });
  return result;
}
