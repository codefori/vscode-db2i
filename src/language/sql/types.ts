import Statement from "./statement";

export enum StatementType {
	Unknown = "Unknown",
	Create = "Create",
	Close = "Close",
	Insert = "Insert",
	Select = "Select",
	With = "With",
	Update = "Update",
	Delete = "Delete",
	Declare = "Declare",
	Begin = "Begin",
	Drop = "Drop",
	End = "End",
	Else = "Else",
	Elseif = "Elseif",
	Call = "Call",
	Alter = "Alter",
	Fetch = "Fetch",
	For = "For",
	Get = "Get",
	Goto = "Goto",
	If = "If",
	Include = "Include",
	Iterate = "Iterate",
	Leave = "Leave",
	Loop = "Loop",
	Merge = "Merge",
	Open = "Open",
	Pipe = "Pipe",
	Repeat = "Repeat",
	Resignal = "Resignal",
	Return = "Return",
	Signal = "Signal",
	Set = "Set",
	While = "While",
	Label = "Label",
	Commit = "Commit",
	Rollback = "Rollback",
	Savepoint = "Savepoint",
	Release = "Release",
	Prepare = "Prepare",
	Execute = "Execute",
	Describe = "Describe",
	Connect = "Connect",
	Disconnect = "Disconnect",
	Rename = "Rename",
	Truncate = "Truncate",
	Comment = "Comment",
	Transfer = "Transfer",
	Grant = "Grant",
	Revoke = "Revoke",
	Allocate = "Allocate",
	Refresh = "Refresh",
	Values = "Values",
	Case = "Case",
	When = "When",
	Continue = "Continue",
	Exit = "Exit",
	Associate = "Associate",
	Lock = "Lock",
	Cursor = "Cursor",
	Locators = "Locators",
	Table = "Table",
	Immediate = "Immediate",
	Diagnostics = "Diagnostics",
	Connection = "Connection",
	Encryption = "Encryption",
	Password = "Password",
	Option = "Option",
	Path = "Path",
	Schema = "Schema",
	Session = "Session",
	Authorization = "Authorization",
	Transaction = "Transaction",
	Ownership = "Ownership",
	Atomic = "Atomic",
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
	'ELSE': StatementType.Else,
	'ELSEIF': StatementType.Elseif,
	'CALL': StatementType.Call,
	'BEGIN': StatementType.Begin,
	'ALTER': StatementType.Alter,
	'FOR': StatementType.For,
	'FETCH': StatementType.Fetch,
	'GET': StatementType.Get,
	'GOTO': StatementType.Goto,
	'IF': StatementType.If,
	'INCLUDE': StatementType.Include,
	'ITERATE': StatementType.Iterate,
	'LEAVE': StatementType.Leave,
	'LOOP': StatementType.Loop,
	'MERGE': StatementType.Merge,
	'PIPE': StatementType.Pipe,
	'REPEAT': StatementType.Repeat,
	'RESIGNAL': StatementType.Resignal,
	'RETURN': StatementType.Return,
	'SIGNAL': StatementType.Signal,
	'SET': StatementType.Set,
	'WHILE': StatementType.While,
	'LABEL': StatementType.Label,
	'COMMIT': StatementType.Commit,
	'ROLLBACK': StatementType.Rollback,
	'SAVEPOINT': StatementType.Savepoint,
	'RELEASE': StatementType.Release,
	'PREPARE': StatementType.Prepare,
	'EXECUTE': StatementType.Execute,
	'DESCRIBE': StatementType.Describe,
	'CONNECT': StatementType.Connect,
	'DISCONNECT': StatementType.Disconnect,
	'RENAME': StatementType.Rename,
	'TRUNCATE': StatementType.Truncate,
	'COMMENT': StatementType.Comment,
	'TRANSFER': StatementType.Transfer,
	'GRANT': StatementType.Grant,
	'REVOKE': StatementType.Revoke,
	'ALLOCATE': StatementType.Allocate,
	'REFRESH': StatementType.Refresh,
	'VALUES': StatementType.Values,
	'CASE': StatementType.Case,
	'WHEN': StatementType.When,
	'CONTINUE': StatementType.Continue,
	'EXIT': StatementType.Exit,
	'ASSOCIATE': StatementType.Associate,
	'LOCK': StatementType.Lock,
	'CURSOR': StatementType.Cursor,
	'LOCATORS': StatementType.Locators,
	'TABLE': StatementType.Table,
	'IMMEDIATE': StatementType.Immediate,
	'DIAGNOSTICS': StatementType.Diagnostics,
	'CONNECTION': StatementType.Connection,
	'ENCRYPTION': StatementType.Encryption,
	'PASSWORD': StatementType.Password,
	'OPTION': StatementType.Option,
	'PATH': StatementType.Path,
	'SCHEMA': StatementType.Schema,
	'SESSION': StatementType.Session,
	'AUTHORIZATION': StatementType.Authorization,
	'TRANSACTION': StatementType.Transaction,
	'OWNERSHIP': StatementType.Ownership,
	'ATOMIC': StatementType.Atomic,
	'OPEN': StatementType.Open,
	'CLOSE': StatementType.Close,
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
	fromLateral?: boolean;

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

export interface CallableReference {
	tokens: Token[], 
	parentRef: ObjectRef
};