export class ProviderBase {

  protected static syntaxMsg = "Syntax error";
  protected static keywords: string[][] = [];
  protected static steps = {};
  protected static elements = {};
  protected static variables = {};

  public static get singleWords(): string[] {
    return this.keywords.filter(w => w.length == 1).map(w => w[0]);
  }

  protected static isSection(text: string) {
    let regexp = /^[^:]+/;
    let line = text.match(regexp);
    if (line == null) return false;
    let words = line[0].split(/\s+/);
    if (words == undefined) return false;
    return this.keywords.some((item: string[]) =>
      item.length == words.length && item.every(
        (w, i) => words[i] && w == words[i].toLowerCase()
      )
    );
  };

  protected static splitWords(line: string): Array<string> {
    let regexp = /([^\s"'\.:;,?!-]+|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/g;
    return line.match(regexp) || [];
  }

  protected static findKeyword(words: Array<string>): Array<string> {
    if (words.length == 0) return undefined;
    return this.keywords.find((item: string[]) => item.every((w: string, i: number) => words[i] && w == words[i].toLowerCase()));
  }

  protected static filterWords(words: Array<string>): Array<string> {
    let s = true;
    let keyword = this.findKeyword(words);
    let notComment = (w: string) => s && !(/^[\s]*[#|//]/.test(w));
    return words.filter((w, i) => (keyword && i < keyword.length) ? false : (notComment(w) ? true : s = false));
  }

  protected static key(words: Array<string>): string {
    let result = [];
    words.forEach((w: string) => {
      if (/^[A-zА-я]+$/.test(w)) result.push(w.toLowerCase());
    });
    return result.join('-');
  }
}
