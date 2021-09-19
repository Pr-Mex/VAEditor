import { IWorkerContext } from "./common";
import { KeywordMatcher } from "./matcher";
import { VAStepData } from "./steplist";

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

function stepDecoration(
  step: VAStepData,
  lineNumber: number,
): monaco.editor.IModelDeltaDecoration {
  let glyph = undefined;
  let style = undefined;
  switch (step.kind) {
    case 5: glyph = "codicon-symbol-class"; break; // if..else
    case 8: glyph = "codicon-git-compare"; break;  // do..while
    case 17: style = "vanessa-style-underline"; break; // scenario
  }
  if (glyph || style) return {
    range: { startLineNumber: lineNumber, startColumn: 1, endLineNumber: lineNumber, endColumn: 1 },
    options: {
      stickiness: 1, // monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges = 1
      glyphMarginClassName: glyph,
      inlineClassName: style,
    }
  };
}

function conditionDecoration(
  lineNumber: number,
): monaco.editor.IModelDeltaDecoration {
  return {
    range: { startLineNumber: lineNumber, startColumn: 1, endLineNumber: lineNumber, endColumn: 1 },
    options: {
      stickiness: 1, // monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges = 1
      glyphMarginClassName: "codicon-symbol-class",
    }
  }
}

function getSnuppet(matcher: KeywordMatcher, steptext: string) {
  let words = [];
  let match = undefined;
  const tokens = [matcher.tokens.word, matcher.tokens.param, matcher.tokens.number, /./];
  const source = tokens.map((reg: RegExp) => "(" + reg.source + ")").join("|");
  const regexp = new RegExp(source, "gui");
  while ((match = regexp.exec(steptext)) != undefined) {
    if (match[1]) words.push(match[1].toLowerCase());
  }
  return words.join(" ");
}

export class VAStepLine {
  private _keyword: string;
  private _words: VAStepWord[] = [];

  constructor(matcher: KeywordMatcher, line: string) {
    let match = line.match(matcher.step);
    if (!match) return;
    this._keyword = match[0];
    const steptext = line.substring(match[0].length);
    const tokens = [matcher.tokens.word, matcher.tokens.param, matcher.tokens.number, /./];
    const source = tokens.map((reg: RegExp) => "(" + reg.source + ")").join("|");
    const regexp = new RegExp(source, "gui");
    while ((match = regexp.exec(steptext)) != undefined) {
      let type: VAWordType = undefined;
      for (let i = 1; i <= 4; ++i)
        if (match[i]) { type = i; break }
      this._words.push({ type, text: match[0] });
    }
  }

  public get invalid(): boolean {
    return this._keyword === undefined;
  }

  public get snippet(): string {
    return this._words.filter(
      w => w.type == VAWordType.Identifier
    ).map(
      w => w.text.toLowerCase()
    ).join(" ");
  }

  public get keyword(): string {
    return this._keyword;
  }

  public inplaceElements(ctx: IWorkerContext): string {
    return this._words.map((w: VAStepWord): string => {
      if (w.type !== VAWordType.Parameter) return w.text;
      let name = w.text.substring(1, w.text.length - 1).toLowerCase();
      let elem = ctx.elements[name];
      if (!elem) return w.text;
      let Q1 = w.text.charAt(0);
      let Q2 = w.text.charAt(w.text.length - 1);
      return `${Q1}${elem}${Q2}`;
    }).join("");
  }

  public inplaceParams(src: VAStepLine) {
    let index = 0;
    const params = src.params;
    return this._words.map(w => {
      if (w.type === VAWordType.Numerical || w.type === VAWordType.Parameter) {
        const p = params[index++];
        if (p != undefined) return p;
      }
      return w.text
    }).join("");
  }

  private get params(): string[] {
    return this._words.filter(
      w => w.type === VAWordType.Numerical || w.type === VAWordType.Parameter
    ).map(w => w.text);
  }

  private keypair(ctx: IWorkerContext): string {
    let keyword = this.keyword.trim().replace(/\s+/, " ").toLowerCase();
    return ctx.keypairs[keyword];
  }

  public checkSyntax(
    ctx: IWorkerContext,
    lineNumber: number,
    line: string,
  ): {
    decoration?: monaco.editor.IModelDeltaDecoration,
    error: boolean,
  } {
    if (this.invalid) return { error: false };
    const snippet = this.snippet;
    if (!snippet) return { error: false };
    const step = ctx.steplist[snippet];
    if (step) return { error: false, decoration: stepDecoration(step, lineNumber) };

    const BreakException = {};
    let result = { error: true, decoration: undefined };
    try {
      ctx.matcher.keypairs.forEach(regexp => {
        const match = line.match(regexp);
        if (match === null) return;
        const snippet = getSnuppet(ctx.matcher, match[2]);
        const step = ctx.steplist[snippet];
        if (step) result = { error: false, decoration: conditionDecoration(lineNumber) };
        throw BreakException;
      })
    } catch (e) {
      if (e !== BreakException) throw e;
    }
    return result;
  }
}
