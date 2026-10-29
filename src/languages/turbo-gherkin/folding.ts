import { IWorkerModel, VAToken } from "./common";

// Последняя строка блока, который открывается в строке i. Если строка блок не
// открывает, возвращается i.
//
// Вынесено отдельной функцией, потому что этим же диапазоном пользуется
// проверка синтаксиса при отрисовке иконки группы шагов. Раньше syntax.ts читал
// line.folding, а заполнял его только getCodeFolding, поэтому иконка группы
// зависела от того, успел ли редактор запросить свёртку для текущей версии
// модели (issues #147, #152).
export function getFoldingEnd(model: IWorkerModel, i: number): number {
  const line = model.getLineToken(i);
  const lineCount = model.getLineCount();
  let k = i;
  switch (line.token) {
    case VAToken.DirectIf:
    case VAToken.DirectElse:
      for (let j = i + 1; j <= lineCount; j++) {
        const next = model.getLineToken(j);
        if (next.indent <= line.indent) break; else k = j;
      }
      break;
    case VAToken.Instruction:
      for (let j = i + 1; j <= lineCount; j++) {
        const next = model.getLineToken(j);
        if (next.token == VAToken.Instruction) k = j; else break;
      }
      break;
    case VAToken.Comment:
      for (let j = i + 1; j <= lineCount; j++) {
        const next = model.getLineToken(j);
        if (next.token == VAToken.Comment) k = j; else break;
      }
      break;
    case VAToken.Section:
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
        if (next.token == VAToken.DirectIf) break;
        if (next.token == VAToken.DirectElse) break;
        if (next.token == VAToken.DirectEndif) break;
        if (next.token == VAToken.Empty) continue;
        if (next.token == VAToken.Comment) { k = j; continue; }
        if (next.token == VAToken.Multiline) { k = j; continue; }
        if (next.token == VAToken.Parameter) { k = j; continue; }
        if (next.indent <= line.indent) break; else k = j;
      } break;
  }
  return k;
}

export function getCodeFolding(
  model: IWorkerModel,
): Array<monaco.languages.FoldingRange> {
  const lineCount = model.getLineCount();
  const result = [];
  for (let i = 1; i <= lineCount; i++) {
    const token = model.getLineToken(i).token;
    const k = getFoldingEnd(model, i);
    if (k > i) {
      let kind = undefined;
      if (token == VAToken.Comment) kind = { value: "comment" };
      else if (token == VAToken.Section) kind = { value: "region" };
      result.push({ kind, start: i, end: k });
    }
    if (token == VAToken.Instruction || token == VAToken.Comment) i = k;
  }
  return result;
}
