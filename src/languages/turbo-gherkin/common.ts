import { firstNonWhitespaceIndex, lastNonWhitespaceIndex } from 'monaco-editor/esm/vs/base/common/strings'
import { KeywordMatcher } from './matcher';

export function getLineMinColumn(line: string): number {
  return firstNonWhitespaceIndex(line) + 1;
}

export function getLineMaxColumn(line: string): number {
  return lastNonWhitespaceIndex(line) + 2;
}

export interface IWorkerContext {
  matcher: KeywordMatcher;
  metatags: string[];
  steplist: any;
  keypairs: any;
  elements: any;
  variables: any;
  messages: any;
}

export interface IVanessaModel
  extends monaco.editor.ITextModel {
  stepDecorations?: string[],
  workerVersionId: number,
  savedVersionId: number,
  resetModified: Function,
  isModified: Function,
}

export interface ISyntaxDecorations {
  decorations: monaco.editor.IModelDeltaDecoration[],
  problems: monaco.editor.IMarkerData[],
}

export enum VAToken {
  Empty = 0,
  Section,
  Operator,
  Comment,
  Multiline,
  Instruction,
  Parameter,
  Asterisk,
}

export interface VAIndent {
  token: VAToken;
  indent: number;
}

export enum MessageType {
  SetKeywords,
  SetMetatags,
  SetSteplist,
  SetImports,
  SetElements,
  SetKeypairs,
  SetMessages,
  SetVariables,
  UpdateModel,
  DeleteModel,
  GetCodeActions,
  GetCodeFolding,
  GetCompletions,
  GetHiperlinks,
  GetLineHover,
  GetLinkData,
  CheckSyntax,
}

export function type2str(type: MessageType) {
  switch (type) {
    case MessageType.SetKeywords: return "SetKeywords";
    case MessageType.SetMetatags: return "SetMetatags";
    case MessageType.SetSteplist: return "SetSteplist";
    case MessageType.SetImports: return "SetImports";
    case MessageType.SetElements: return "SetElements";
    case MessageType.SetKeypairs: return "SetKeypairs";
    case MessageType.SetMessages: return "SetMessages";
    case MessageType.SetVariables: return "SetVariables";
    case MessageType.UpdateModel: return "UpdateModel";
    case MessageType.DeleteModel: return "DeleteModel";
    case MessageType.GetCodeActions: return "GetCodeActions";
    case MessageType.GetCodeFolding: return "GetCodeFolding";
    case MessageType.GetCompletions: return "GetCompletions";
    case MessageType.GetHiperlinks: return "GetHiperlinks";
    case MessageType.GetLineHover: return "GetLineHover";
    case MessageType.GetLinkData: return "GetLinkData";
    case MessageType.CheckSyntax: return "CheckSyntax";
  }
}

export interface IWorkerModel {
  getLineContent(lineNumber: number): string;
  getLineToken(lineNumber: number): VAIndent;
  getLineCount(): number;
}
