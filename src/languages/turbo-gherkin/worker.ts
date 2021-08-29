import { MessageType } from './common'
import { KeywordMatcher } from './matcher';
import * as folding from './folding'

let matcher: KeywordMatcher;
let metatags: string[] = ["try", "except", "попытка", "исключение"];
let steplist = { };

class ModelData {
  content: string[];
  versionId: number;
}

const contentMap = new Map<string, ModelData>();

function setModelContent(msg: any) {
  contentMap.set(msg.uri, {
    content: msg.content,
    versionId: msg.versionId
  });
}

function getModelContent(msg: any) {
  const data = contentMap.get(msg.uri);
  return data && data.content;
}

function getCodeFolding(msg: any) {
  const content = getModelContent(msg);
  if (!content) return undefined;
  const tabSize: number = msg.tabSize;
  const lineCount: number = content.length;
  const getLineContent = (lineNumber: number) => content[lineNumber - 1];
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
      break;
    case MessageType.SetMetatags:
      metatags = msg.data;
      break;
    case MessageType.SetStepList:
      steplist = msg.data;
      break;
    case MessageType.UpdateModelCache:
      setModelContent(msg);
      break;
    case MessageType.DeleteModelCache:
      contentMap.delete(msg.uri);
      break;
    case MessageType.CompletionItems:
      return getCompletionItems(msg);
    case MessageType.GetCodeFolding:
      return getCodeFolding(msg);
    default:
      return { success: false };
  }
}
