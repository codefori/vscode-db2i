import Statement from "./statement";

export enum StatementType {
	Unknown = "Unknown",
	Create = "Create",
	Insert = "Insert",
	Select = "Select",
	With = "With",
	Update = "Update",
	Delete = "Delete",
	Declare = "Declare",
	Begin = "Begin",
	Drop = "Drop",
	End = "End",
	Call = "Call",
	Alter = "Alter"
}

export const StatementTypeWord = {
	'CREATE': StatementType.Create,
	'SELECT': StatementType.Select,
	'WITH': StatementType.With,
	'INSERT': StatementType.Insert,
	'UPDATE': StatementType.Update,
	'DELETE': StatementType.Delete,
	'DECLARE': StatementType.Declare,
	'DROP': StatementType.Drop,
	'END': StatementType.End,
	'CALL': StatementType.Call,
	'BEGIN': StatementType.Begin,
	'ALTER': StatementType.Alter
};

export enum ClauseType {
	Unknown = "Unknown",
	From = "From",
	Into = "Into",
	Where = "Where",
	Having = "Having",
	Group = "Group",
	Limit = "Limit",
	Offset = "Offset",
	Order = "Order"
}

export const ClauseTypeWord = {
	'FROM': ClauseType.From,
	'INTO': ClauseType.Into,
	'WHERE': ClauseType.Where,
	'HAVING': ClauseType.Having,
	'GROUP': ClauseType.Group,
	'LIMIT': ClauseType.Limit,
	'OFFSET': ClauseType.Offset,
	'ORDER': ClauseType.Order
}

export interface CTEReference {
	name: string;
	columns: string[];
	statement: Statement
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
	system?: string;
}

export interface ObjectRef {
  tokens: Token[],
  object: QualifiedObject;
  alias?: string;

	isUDTF?: boolean;

	/** only used within create statements */
	createType?: string;
}

export interface StatementGroup {
	range: IRange,
	statements: Statement[]
}

export interface Definition extends ObjectRef {
	range: IRange;
	children: Definition[];
}

export interface ParsedEmbeddedStatement {
	changed: boolean;
	content: string;
	parameterCount: number;
}