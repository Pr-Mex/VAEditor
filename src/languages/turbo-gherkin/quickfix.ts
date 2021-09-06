import * as distance from 'jaro-winkler';
import { IWorkerContext, IWorkerModel } from './common';
import { KeywordMatcher } from './matcher';
import { splitStepWords, VAStepData, VAStepWord, VAWordType } from './steplist';

export interface VACodeError {
  index: number;
  value: string;
}

export interface VAQuickAction {
  label: string;
  text: string;
  index: number;
  startColumn: number;
  endColumn: number;
}

interface VAQuickItem {
  index: number;
  key: string;
  sum: number;
  keyword: string;
  params: string[];
  startColumn: number;
  endColumn: number;
}

function addQuickFix(ctx: IWorkerContext, list: VAQuickItem[], value: string, index: number) {
  const match = value.match(ctx.matcher.step);
  if (match) {
    const keyword = match[0];
    const steptext = value.substring(keyword.length);
    const lineKey = ctx.matcher.getStepKey(steptext);
    const params = splitStepWords(ctx.matcher, steptext).filter(
      w => w.type === VAWordType.Numerical || w.type === VAWordType.Parameter
    ).map(w => w.text);
    let regexp = "^[\\s]*";
    let startColumn = 1;
    let endColumn = value.length + 1;
    for (let key in ctx.steplist) {
      let sum = distance(lineKey, key);
      if (sum > 0.7) list.push({ key, sum, keyword, params, index, startColumn, endColumn });
    }
  }
}

function replaceParams(words: VAStepWord[], params: string[]): string {
  let index = 0;
  return words.map(w => {
    if (w.type === VAWordType.Numerical || w.type === VAWordType.Parameter) {
      const p = params[index++];
      if (p != undefined) return p;
    }
    return w.text
  }).join("");
}

export function getCodeActions(ctx: IWorkerContext, model: IWorkerModel, msg: { errors: VACodeError[] }): VAQuickAction[] {
  const result = [];
  const list: VAQuickItem[] = [];
  msg.errors.forEach(e => addQuickFix(ctx, list, e.value, e.index));
  list.sort((a, b) => b.sum - a.sum).forEach((e, i) => {
    if (i > 6) return;
    const step = ctx.steplist[e.key] as VAStepData;
    const label = replaceParams(step.head, e.params);
    const text = e.keyword + label;
    result.push({ label, text, index: e.index, startColumn: e.startColumn, endColumn: e.endColumn });
  });
  return result;
}
