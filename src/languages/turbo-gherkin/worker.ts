import { MessageType, VAIndent, VAToken } from './common'
import { KeywordMatcher } from './matcher';
import * as folding from './folding'

class GherkinWorker {

  protected _matcher: KeywordMatcher;
  protected _steps = {};

  public get matcher() { return this._matcher; }

  constructor() { }

  public process(e: any) {
    const msg = e.data;
    switch (msg.type) {
      case MessageType.SetStepList:
        return this.setStepList(msg);
      case MessageType.SetMatchers:
        return this.setMatchers(msg);
      case MessageType.CompletionItems:
        return this.getCompletionItems(msg);
      case MessageType.GetCodeFolding:
        return this.getCodeFolding(msg);
      default:
        return { success: false };
    }
  }

  private setMatchers(msg: any) {
    this._matcher = new KeywordMatcher(msg.data);
    return { success: true };
  }

  private setStepList(msg: any) {
    this._steps = msg;
    return { success: true };
  }

  public getCodeFolding(msg: any) {
    const tabSize: number = msg.tabSize;
    const lineCount: number = msg.lines.length;
    const getLineContent = (lineNumber) => msg.lines[lineNumber - 1];
    const result = folding.getCodeFolding(this.matcher, tabSize, lineCount, getLineContent);
    return { id: msg.id, data: result, success: true };
  }

  private getCompletionItems(msg: any) {
    const data = {
      suggestions: [
        {
          label: "Foobar",
          kind: 25,
          detail: "Details for completion",
          insertText: "Message from webworker"
        }
      ]
    };
    return { id: msg.id, data: data, success: true };
  }
}

export const w = new GherkinWorker;
