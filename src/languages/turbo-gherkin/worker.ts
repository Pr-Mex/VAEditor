import { IWorkerModel, MessageType } from './common'
import { KeywordMatcher } from './matcher';
import { getHiperlinks, getLinkData, setImports } from './hiperlinks';
import { getCompletions } from './completion';
import { getCodeActions } from './quickfix';
import { getCodeFolding } from './folding';
import { getLineHover } from './hover';
import { checkSyntax } from './syntax';

const context = {
  matcher: undefined,
  metatags: ["try", "except", "попытка", "исключение"],
  steplist: { },
  keypairs: { },
  variables: { },
  messages: {
    syntaxMsg: "Syntax error",
    soundHint: "Sound",
  }
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
  private versionId: number;
}

const contentMap = new Map<string, WorkerModel>();

function setModelContent(msg: any) {
  contentMap.set(msg.uri, new WorkerModel(msg));
}

function getWorkerModel(msg: any) {
  return contentMap.get(msg.uri);
}

function provide(msg: any) {
  const model = getWorkerModel(msg);
  if (!model) return undefined;
  switch (msg.type) {
    case MessageType.GetCodeActions:
      return getCodeActions(context, msg.errors);
    case MessageType.GetCodeFolding:
      return getCodeFolding(context.matcher, model, msg.tabSize);
    case MessageType.GetHiperlinks:
      return getHiperlinks(context.matcher, model);
    case MessageType.GetLineHover:
      return getLineHover(context, msg);
    case MessageType.GetLinkData:
      return getLinkData(context.matcher, model, msg.key);
    case MessageType.CheckSyntax:
      return checkSyntax(context, model);
  }
}

export function process(msg: any) {
  switch (msg.type) {
    case MessageType.GetCompletions:
      return getCompletions(context, msg);
    case MessageType.SetMatchers:
      context.matcher = new KeywordMatcher(msg.data);
      break;
    case MessageType.SetMetatags:
      context.metatags = msg.data;
      break;
    case MessageType.SetSteplist:
      context.steplist = msg.data;
      break;
    case MessageType.SetVariables:
      context.variables = msg.data;
      break;
    case MessageType.SetImports:
      setImports(msg.data);
      break;
    case MessageType.UpdateModel:
      setModelContent(msg);
      break;
    case MessageType.DeleteModel:
      contentMap.delete(msg.uri);
      break;
    default:
      const res = provide(msg);
      return {
        success: res !== undefined,
        id: msg.id,
        data: res
      };
  }
}
