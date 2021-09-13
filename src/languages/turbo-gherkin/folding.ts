import { IWorkerModel, VAToken } from "./common";

export function getCodeFolding(
  model: IWorkerModel,
): Array<monaco.languages.FoldingRange> {
  const lineCount = model.getLineCount();
  let result = [];
  for (let i = 1; i <= lineCount; i++) {
    let k = i;
    let kind = undefined;
    const line = model.getLineToken(i);
    switch (model.getLineToken(i).token) {
      case VAToken.Instruction:
        for (let j = i + 1; j <= lineCount; j++) {
          const next = model.getLineToken(j);
          if (next.token == VAToken.Instruction) k = j; else break;
        }
        break;
      case VAToken.Comment:
        kind = { value: "comment" };
        for (let j = i + 1; j <= lineCount; j++) {
          const next = model.getLineToken(j);
          if (next.token == VAToken.Comment) k = j; else break;
        }
        break;
      case VAToken.Section:
        kind = { value: "region" };
        for (let j = i + 1; j <= lineCount; j++) {
          const next = model.getLineToken(j);
          if (next.token == VAToken.Section) break; else k = j;
        }
        break;
      case VAToken.Asterisk:
      case VAToken.Operator:
        for (let j = i + 1; j <= lineCount; j++) {
          const next = model.getLineToken(j);
          if (next.token == VAToken.Section) break;
          if (next.token == VAToken.Empty) continue;
          if (next.token == VAToken.Comment) { k = j; continue; }
          if (next.token == VAToken.Multiline) { k = j; continue; }
          if (next.token == VAToken.Parameter) { k = j; continue; }
          if (next.indent <= line.indent) break; else k = j;
        } break;
    }
    if (k > i) { result.push({ kind: kind, start: i, end: k }); line.folding = k; }
    if (line.token == VAToken.Instruction || line.token == VAToken.Comment) i = k;
  }
  return result;
}
