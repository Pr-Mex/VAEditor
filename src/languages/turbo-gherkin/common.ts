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
  SetMatchers,
  SetMetatags,
  SetSteplist,
  SetImports,
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