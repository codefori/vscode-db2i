import Statement from "./statement";

export enum StatementType {
	Unknown = "Unknown",
	Create = "Create",
	Insert = "Insert",
	Select = "Select",
	Update = "Update",
	Delete = "Delete",
	Declare = "Declare",
	Begin = "Being",
	Drop = "Drop",
	End = "End",
	Call = "Call"
}

export const StatementTypeWord = {
	'CREATE': StatementType.Create,
	'SELECT': StatementType.Select,
	'WITH': StatementType.Select,
	'INSERT': StatementType.Insert,
	'UPDATE': StatementType.Update,
	'DELETE': StatementType.Delete,
	'DECLARE': StatementType.Declare,
	'DROP': StatementType.Drop,
	'END': StatementType.End,
	'CALL': StatementType.Call,
	'BEGIN': StatementType.Begin
};

export interface IRange {
  start: number;
  end: number;
}

export interface Token {
  value?: string;
  block?: Token[];
  type: string;
  range: IRange;
}

export interface QualifiedObject {
  schema?: string;
  name?: string;
}

export interface ObjectRef {
  tokens: Token[],
  object: QualifiedObject;
  alias?: string;
}

export interface StatementGroup {
	range: IRange,
	statements: Statement[]
}