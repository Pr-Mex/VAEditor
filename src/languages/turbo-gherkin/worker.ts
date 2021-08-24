import { MessageType } from './common'
import { KeywordMatcher } from './matcher';
import * as folding from './folding'

let matcher: KeywordMatcher;
let metatags: string[] = ["try", "except", "попытка", "исключение"];
let steplist = {};

function getCodeFolding(msg: any) {
  const tabSize: number = msg.tabSize;
  const lineCount: number = msg.lines.length;
  const getLineContent = (lineNumber) => msg.lines[lineNumber - 1];
  const result = folding.getCodeFolding(matcher, tabSize, lineCount, getLineContent);
  return { id: msg.id, data: result, success: true };
}

function getCompletionItems(msg: any) {
  let result: Array<monaco.languages.CompletionItem> = [];
  if (msg.keyword) {
    let keytext = msg.keyword.join(' ');
    keytext = keytext.charAt(0).toUpperCase() + keytext.slice(1);
    for (let key in steplist) {
      let e = steplist[key];
      if (e.documentation) {
        result.push({
          label: e.label,
          kind: e.kind ? e.kind : 1,
          detail: e.section,
          documentation: e.documentation,
          sortText: e.sortText,
          insertText: keytext + ' ' + e.insertText + '\n',
          filterText: keytext + ' ' + key,
          range: msg.range
        });
      }
    }
  } else {
    metatags.forEach(word => {
      result.push({
        label: word,
        kind: 17,
        insertText: word + '\n',
        range: msg.range
      });
    });
    for (let key in steplist) {
      let e = steplist[key];
      if (e.documentation) {
        result.push({
          label: e.label,
          kind: e.kind ? e.kind : 1,
          detail: e.section,
          documentation: e.documentation,
          sortText: e.sortText,
          insertText: e.keyword + ' ' + e.insertText + '\n',
          filterText: key,
          range: msg.range
        });
      }
    }
  }
  return { id: msg.id, data: { suggestions: result }, success: true };
}

export function process(e: any) {
  const msg = e.data;
  switch (msg.type) {
    case MessageType.SetMatchers:
      matcher = new KeywordMatcher(msg.data);
      return { success: true };
    case MessageType.SetMetatags:
      metatags = msg.data;
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
