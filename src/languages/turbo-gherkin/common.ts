export interface IVanessaStep {
  filterText: string;
  insertText: string;
  sortText: string;
  documentation: string;
  kind: number;
  section: string;
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
  SetStepList,
  SetMatchers,
  CompletionItems,
  GetCodeFolding,
}