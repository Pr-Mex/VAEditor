import { IWorkerContext } from "./common";
import { VAStepLine } from "./stepline";

export interface VAStepInfo {
  filterText: string;
  insertText: string;
  sortText: string;
  documentation: string;
  kind: number;
  section: string;
}

export interface VAStepData {
  label: string;
  head: VAStepLine,
  body: string[],
  documentation: string,
  insertText: string,
  sortText: string,
  section: string,
  kind: number,
}

export function updateStepLabels(ctx: IWorkerContext) {
  for (let snippet in ctx.steplist) {
    let e = ctx.steplist[snippet] as VAStepData;
    e.label = e.head.inplaceElements(ctx);
    e.insertText = e.label + (e.body.length ? '\n' + e.body.join('\n') : '');
  }
}

export function setStepList(ctx: IWorkerContext, msg: { list: string, clear: boolean }) {
  if (msg.clear) ctx.steplist = {};
  JSON.parse(msg.list).forEach((e: VAStepInfo) => {
    const body = e.insertText.split('\n');
    const line = body.shift();
    let step = new VAStepLine(ctx.matcher, line);
    if (step.invalid) {
      step = new VAStepLine(ctx.matcher, "И " + line);
      if (step.invalid) return;
    }
    const data: VAStepData = {
      head: step,
      body: body,
      label: undefined,
      documentation: e.documentation,
      insertText: e.insertText,
      sortText: e.sortText,
      section: e.section,
      kind: e.kind,
    };
    ctx.steplist[step.snippet] = data;
  });
  updateStepLabels(ctx);
}
