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

export interface VanessaStep {
  filterText: string;
  insertText: string;
  sortText: string;
  documentation: string;
  kind: number;
  section: string;
}

export interface IVanessaModel
  extends monaco.editor.ITextModel {
    workerVersionId: number,
    savedVersionId: number,
    resetModified: Function,
    isModified: Function,
}

export enum VAToken {
  Empty = 0,
  Section,
  Operator,
  Comment,
  Multiline,
  Instruction,
  Parameter,
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

export interface IWorkerModel {
  getLineContent(lineNumber: number): string;
  getLineCount(): number;
}