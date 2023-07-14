
export enum StatementType {
	Unknown,
	Create,
	Insert,
	Select,
	Update,
	Delete,
	Declare,
	Begin,
	Drop,
	End,
	Call
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