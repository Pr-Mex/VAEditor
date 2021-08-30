import { IWorkerModel, MessageType } from './common'
import { KeywordMatcher } from './matcher';
import * as hiperlinks from './hiperlinks'
import * as folding from './folding'
import * as quickfix from './quickfix'
import * as syntax from './syntax';

let matcher: KeywordMatcher;
let metatags: string[] = ["try", "except", "попытка", "исключение"];
let steplist = { };
let keypairs = { };
let variables = { };

const messages = {
  syntaxMsg: "Syntax error",
  soundHint: "Sound",
}

class WorkerModel implements IWorkerModel {
  constructor(msg: any) {
    this.versionId = msg.versionId;
    this.content = msg.content;
  }
  getLineContent(lineNumber: number): string {
    return this.content[lineNumber - 1];
  }
  getLineCount(): number {
    return this.content.length;
  }
  private content: string[];
  versionId: number;
}

const contentMap = new Map<string, WorkerModel>();

function setModelContent(msg: any) {
  contentMap.set(msg.uri, new WorkerModel(msg));
}

function getWorkerModel(msg: any) {
  return contentMap.get(msg.uri);
}

function escapeMarkdown(text: string): string {
  // escape markdown syntax tokens: http://daringfireball.net/projects/markdown/syntax#backslash
  return text.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
}

function getLineHover(msg: any) {
  let contents = [];
  let match = msg.line.match(/^\s*\*/);
  if (match) {
    let head = messages.soundHint;
    let char = String.fromCharCode(60277);
    let href = "#sound:" + msg.lineNumber;
    let text = msg.line.substr(match[0].length);
    contents.push({ value: `**${head}** [${char}](${href})` });
    contents.push({ value: escapeMarkdown(text) });
  } else {
    let words = matcher.splitWords(msg.line);
    let key = matcher.key(matcher.filterWords(words));
    let step = steplist[key];
    if (step) {
      let i = String.fromCharCode(60020);
      let s = String.fromCharCode(60277);
      let t = escapeMarkdown(step.section);
      let ih = "#info:" + key.replace(/ /g, "-");
      let sh = "#sound:" + msg.lineNumber;
      contents.push({ value: `**${t}** [${i}](${ih}) [${s}](${sh})` });
      contents.push({ value: escapeMarkdown(step.documentation) });
      let values = variables;
      let vars = msg.line.match(/"[^"]+"|'[^']+'/g) || [];
      vars.forEach(function (part: string) {
        let d = /^.\$.+\$.$/.test(part) ? 2 : 1;
        let v = values[part.substring(d, part.length - d).toLowerCase()];
        if (v) contents.push({ value: "**" + v.name + "** = " + v.value });
      });
    }
  }
  let range = {
    startLineNumber: msg.lineNumber,
    endLineNumber: msg.lineNumber,
    startColumn: msg.MinColumn,
    endColumn: msg.MaxColumn,
  };
  const result = { range: range, contents: contents };
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

function provide(msg: any) {
  const model = getWorkerModel(msg);
  if (!model) return undefined;
  switch (msg.type) {
    case MessageType.GetCodeActions:
      return quickfix.getCodeActions(msg.data, matcher, steplist);
    case MessageType.GetCodeFolding:
      return folding.getCodeFolding(matcher, msg.tabSize, model);
    case MessageType.GetCompletions:
      return getCompletionItems(msg);
    case MessageType.GetHiperlinks:
      return hiperlinks.getHiperlinks(matcher, model);
    case MessageType.GetLineHover:
      return getLineHover(msg);
    case MessageType.GetLinkData:
      return hiperlinks.getLinkData(msg, matcher, model);
    case MessageType.CheckSyntax:
      return syntax.checkSyntax(matcher, steplist, keypairs, messages.syntaxMsg, model);
  }
}

export function process(msg: any) {
  switch (msg.type) {
    case MessageType.SetMatchers:
      matcher = new KeywordMatcher(msg.data);
      break;
    case MessageType.SetMetatags:
      metatags = msg.data;
      break;
    case MessageType.SetSteplist:
      steplist = msg.data;
      break;
    case MessageType.SetVariables:
      variables = msg.data;
      break;
    case MessageType.SetImports:
      hiperlinks.setImports(msg.data);
      break;
    case MessageType.UpdateModel:
      setModelContent(msg);
      break;
    case MessageType.DeleteModel:
      contentMap.delete(msg.uri);
      break;
    default:
      const result = provide(msg);
      return { success: result !== undefined, id: msg.id, data: result };
  }
}
