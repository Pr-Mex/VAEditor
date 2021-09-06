import { IWorkerContext } from "./common";
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

export class VAStepLine {
  private _keyword: string;
  private _words: VAStepWord[] = [];

  constructor(matcher: KeywordMatcher, line: string) {
    let match = line.match(matcher.step);
    if (!match) return;
    this._keyword = match[0];
    let steptext = line.substring(match[0].length);
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

  public isSyntaxError(ctx: IWorkerContext): boolean {
    if (this.invalid) return false;
    let snippet = this.snippet;
    if (!snippet || ctx.steplist[snippet]) return false;
    let keypair = this.keypair(ctx);
    if (!keypair) return true;
    let steptext = this._words.join("");
    let index = steptext.search(new RegExp(keypair + "\s*$", "i"));
    if (index < 0) return true;
    let shortstep = steptext.substring(0, index);
    snippet = ctx.matcher.getStepKey(shortstep);
    return snippet && ctx.steplist[snippet] == undefined;
  }
}
