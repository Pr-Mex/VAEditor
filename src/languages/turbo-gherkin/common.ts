import { firstNonWhitespaceIndex, lastNonWhitespaceIndex } from 'monaco-editor/esm/vs/base/common/strings'
import { KeywordMatcher } from './matcher';
import { VACodeError } from './quickfix';

export function getLineMinColumn(line: string): number {
  return firstNonWhitespaceIndex(line) + 1;
}

export function getLineMaxColumn(line: string): number {
  return lastNonWhitespaceIndex(line) + 2;
}

export interface IWorkerContext {
  matcher: KeywordMatcher;
  directives: ISpprDirect;
  metatags: string[];
  steplist: any;
  keypairs: any;
  elements: any;
  variables: any;
  messages: any;
  sppr: boolean;
}

export interface IVanessaModel
  extends monaco.editor.ITextModel {
  stepDecorations?: string[],
  workerVersionId: number,
  savedVersionId: number,
  resetModified: Function,
  isModified: Function,
  testedImages?: VAImage[],
}

export interface VAImage {
  lineNumber: number;
  column: number;
  height: number;
  src: string;
}

export interface ISyntaxManager {
  getModel(): IVanessaModel;
  setImages(images: VAImage[]): void;
}

export interface ISyntaxDecorations {
  decorations: monaco.editor.IModelDeltaDecoration[],
  problems: monaco.editor.IMarkerData[],
  images?: VAImage[],
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
  StartComment,
  EndComment,
  DirectIf,
  DirectElse,
  DirectEndif,
}

export interface VAIndent {
  token: VAToken;
  indent: number;
  folding?: number;
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
  SetDirectives,
  UpdateModel,
  DeleteModel,
  GetCodeActions,
  GetCodeFolding,
  GetCompletions,
  GetHiperlinks,
  GetLineHover,
  GetLinkData,
  CheckSyntax,
  SetSPPR,
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
    case MessageType.SetDirectives: return "SetDirectives";
    case MessageType.UpdateModel: return "UpdateModel";
    case MessageType.DeleteModel: return "DeleteModel";
    case MessageType.GetCodeActions: return "GetCodeActions";
    case MessageType.GetCodeFolding: return "GetCodeFolding";
    case MessageType.GetCompletions: return "GetCompletions";
    case MessageType.GetHiperlinks: return "GetHiperlinks";
    case MessageType.GetLineHover: return "GetLineHover";
    case MessageType.GetLinkData: return "GetLinkData";
    case MessageType.CheckSyntax: return "CheckSyntax";
    case MessageType.SetSPPR: return "SetSPPR";
  }
}

export type WorkerMessage =
  | { id?: number, type: MessageType.SetKeywords, data: any }
  | { id?: number, type: MessageType.SetKeypairs, data: any }
  | { id?: number, type: MessageType.SetMetatags, data: any }
  | { id?: number, type: MessageType.SetSteplist, list: string, clear: boolean }
  | { id?: number, type: MessageType.SetMessages, data: any }
  | { id?: number, type: MessageType.SetElements, values: string, clear: boolean }
  | { id?: number, type: MessageType.SetVariables, values: string, clear: boolean }
  | { id?: number, type: MessageType.SetDirectives, data: any }
  | { id?: number, type: MessageType.SetImports, data: any }
  | { id?: number, type: MessageType.UpdateModel, versionId: number, uri: string }
  | { id?: number, type: MessageType.DeleteModel, uri: string }
  | { id?: number, type: MessageType.GetCodeActions, versionId: number, uri: string, errors: VACodeError[] }
  | { id?: number, type: MessageType.GetCodeFolding, versionId: number, uri: string }
  | { id?: number, type: MessageType.GetCompletions, line: string, lineNumber: number, column: number }
  | { id?: number, type: MessageType.GetHiperlinks, versionId: number, uri: string }
  | { id?: number, type: MessageType.GetLineHover, versionId: number, uri: string, lineNumber: number, minColumn: number, maxColumn: number }
  | { id?: number, type: MessageType.GetLinkData, versionId: number, uri: string, key: string }
  | { id?: number, type: MessageType.CheckSyntax, versionId: number, uri: string }
  | { id?: number, type: MessageType.SetSPPR, sppr: boolean }
  ;

export interface IWorkerModel {
  getLineContent(lineNumber: number): string;
  getLineToken(lineNumber: number): VAIndent;
  getLineCount(): number;
}

export interface ISpprDirect {
 if?: string[],
 else?: string[],
 endif?: string[],
}
