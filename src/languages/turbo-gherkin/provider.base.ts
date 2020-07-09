export class ProviderBase {

  protected static keywords = [];
  protected static steps = {};
  protected static elements = {};
  protected static variables = {};

  protected static isSection(text: string) {
    let regexp = /[^:\s]+(?=.*:)/g;
    let words = text.match(regexp);
    if (words == null) return false;
    return this.keywords.some((item: string[]) =>
      item.length == words.length && item.every((w: string, i: number) => words[i] && w == words[i].toLowerCase())
    );
  };

  protected static splitWords(line: string): Array<string> {
    let regexp = /([^\s"'\.:;,?!-]+|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/g;
    return line.match(regexp) || [];
  }

  protected static findKeyword(words: Array<string>): Array<string> {
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
    return result.join(' ');
  }
}
