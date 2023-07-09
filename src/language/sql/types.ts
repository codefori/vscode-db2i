
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