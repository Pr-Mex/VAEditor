import * as distance from 'jaro-winkler';
import { IWorkerContext, IWorkerModel } from './common';
import { VAStepLine } from './stepline';

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
  step: VAStepLine;
  sum: number;
  index: number;
  snippet: string;
  startColumn: number;
  endColumn: number;
}

function addQuickFix(ctx: IWorkerContext, list: VAQuickItem[], line: string, index: number) {
  const step = new VAStepLine(ctx.matcher, line);
  if (step.invalid) return;
  let startColumn = 1;
  let endColumn = line.length + 1;
  const stepSnippet = step.snippet;
  for (let snippet in ctx.steplist) {
    let sum = distance(stepSnippet, snippet);
    if (sum > 0.7) list.push({ step, sum, snippet, index, startColumn, endColumn });
  }
}

export function getCodeActions(ctx: IWorkerContext, model: IWorkerModel, msg: { errors: VACodeError[] }): VAQuickAction[] {
  const result = [];
  const list: VAQuickItem[] = [];
  msg.errors.forEach(e => addQuickFix(ctx, list, e.value, e.index));
  list.sort((a, b) => b.sum - a.sum).forEach((e, i) => {
    if (i > 6) return;
    const label = ctx.steplist[e.snippet].head.inplaceParams(e.step);
    result.push({ label, text: e.step.keyword + label, index: e.index, startColumn: e.startColumn, endColumn: e.endColumn });
  });
  return result;
}
