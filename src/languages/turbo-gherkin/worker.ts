import { IWorkerContext, MessageType, type2str, WorkerMessage } from './common'
import { KeywordMatcher } from './matcher';
import { getHiperlinks, getLinkData, setImports } from './hiperlinks';
import { getCompletions } from './completion';
import { getCodeActions } from './quickfix';
import { getCodeFolding } from './folding';
import { WorkerModel } from './model';
import { getLineHover } from './hover';
import { checkSyntax } from './syntax';
import { setStepList, updateStepLabels } from './steplist';

const context: IWorkerContext = {
  matcher: undefined,
  metatags: ["try", "except", "попытка", "исключение"],
  steplist: {},
  keypairs: {},
  elements: {},
  variables: {},
  messages: {
    syntaxMsg: "Syntax error",
    soundHint: "Sound",
  }
}

const contentMap = new Map<string, WorkerModel>();

function setModelContent(context: IWorkerContext, msg: any) {
  contentMap.set(msg.uri, new WorkerModel(context.matcher, msg));
}

function getWorkerModel(msg: any) {
  return contentMap.get(msg.uri);
}

function setMessages(context: IWorkerContext, msg: { data: string }) {
  const messages = JSON.parse(msg.data);
  Object.keys(context.messages).forEach(key => {
    if (messages[key])
      context.messages[key] = messages[key];
  });
}

function setElements(context: IWorkerContext, msg: { values: string, clear: boolean }) {
  if (msg.clear) context.elements = {};
  let obj = JSON.parse(msg.values);
  for (let key in obj) {
    context.elements[key.toLowerCase()] = obj[key];
  }
}

function setVariables(ctx: IWorkerContext, msg: { values: string, clear: boolean }) {
  if (msg.clear) ctx.variables = {};
  let obj = JSON.parse(msg.values);
  for (let key in obj) {
    ctx.variables[key.toLowerCase()] = { name: key, value: obj[key] };
  }
}

function provide(msg: any) {
  const model = getWorkerModel(msg);
  if (!model) return undefined;
  switch (msg.type) {
    case MessageType.GetCodeFolding:
      return getCodeFolding(model);
    case MessageType.GetCodeActions:
      return getCodeActions(context, model, msg);
    case MessageType.GetHiperlinks:
      return getHiperlinks(context, model, msg);
    case MessageType.GetLineHover:
      return getLineHover(context, model, msg);
    case MessageType.GetLinkData:
      return getLinkData(context, model, msg);
    case MessageType.CheckSyntax:
      return checkSyntax(context, model, msg);
  }
}

export function process(msg: WorkerMessage) {
  //@ts-ignore
  console.debug("worker:", type2str(msg.type), msg.versionId, msg.uri);
  switch (msg.type) {
    case MessageType.GetCompletions:
      const suggestions = getCompletions(context, msg);
      return { id: msg.id, data: { suggestions }, success: true };
    case MessageType.SetKeywords:
      context.matcher = new KeywordMatcher(msg.data);
      context.matcher.setKeypairs(context.keypairs);
      context.matcher.setMetatags(context.metatags)
      updateStepLabels(context);
      break;
    case MessageType.SetKeypairs:
      context.keypairs = msg.data;
      context.matcher?.setKeypairs(context.keypairs);
      break;
    case MessageType.SetMetatags:
      context.metatags = msg.data;
      context.matcher?.setMetatags(context.metatags)
      break;
    case MessageType.SetMessages:
      setMessages(context, msg);
      break;
    case MessageType.SetSteplist:
      setStepList(context, msg);
      break;
    case MessageType.SetElements:
      setElements(context, msg);
      updateStepLabels(context);
      break;
    case MessageType.SetVariables:
      setVariables(context, msg);
      updateStepLabels(context);
      break;
    case MessageType.SetImports:
      setImports(msg.data);
      break;
    case MessageType.UpdateModel:
      setModelContent(context, msg);
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
