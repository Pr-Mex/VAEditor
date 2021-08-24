import { MessageType } from './common'
import { KeywordMatcher } from './matcher';
import * as folding from './folding'

let matcher: KeywordMatcher;
let steplist = {};

function getCodeFolding(msg: any) {
  const tabSize: number = msg.tabSize;
  const lineCount: number = msg.lines.length;
  const getLineContent = (lineNumber) => msg.lines[lineNumber - 1];
  const result = folding.getCodeFolding(matcher, tabSize, lineCount, getLineContent);
  return { id: msg.id, data: result, success: true };
}

function getCompletionItems(msg: any) {
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

export function process(e: any) {
  const msg = e.data;
  switch (msg.type) {
    case MessageType.SetMatchers:
      matcher = new KeywordMatcher(msg.data);
      return { success: true };
    case MessageType.SetStepList:
      steplist = msg.data;
      return { success: true };
    case MessageType.CompletionItems:
      return getCompletionItems(msg);
    case MessageType.GetCodeFolding:
      return getCodeFolding(msg);
    default:
      return { success: false };
  }
}
