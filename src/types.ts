// https://www.ibm.com/docs/en/i/7.4?topic=views-syscolumns2
export interface TableColumn {
  TABLE_SCHEMA: string,
  TABLE_NAME: string,
  COLUMN_NAME: string,
  SYSTEM_COLUMN_NAME: string,
  CONSTRAINT_NAME?: string,
  DATA_TYPE: string,
  CHARACTER_MAXIMUM_LENGTH?: number,
  NUMERIC_SCALE?: number,
  NUMERIC_PRECISION?: number,
  IS_NULLABLE: "Y" | "N",
  HAS_DEFAULT: "Y" | "N",
  COLUMN_DEFAULT?: string,
  COLUMN_TEXT: string,
  IS_IDENTITY: "YES" | "NO",
}

// https://www.ibm.com/docs/en/i/7.4?topic=views-sysparms
export interface SQLParm {
  SPECIFIC_SCHEMA: string,
  SPECIFIC_NAME: string,
  PARAMETER_NAME: string,
  PARAMETER_MODE: "IN" | "OUT" | "INOUT",
  DATA_TYPE: string,
  CHARACTER_MAXIMUM_LENGTH?: number,
  NUMERIC_SCALE?: number,
  NUMERIC_PRECISION?: number,
  IS_NULLABLE: "YES" | "NO",
  DEFAULT?: string,
  LONG_COMMENT?: string,
  ORDINAL_POSITION: number,
  ROW_TYPE: "P" | "R",
}

export interface ResolvedSqlObject {
  schema: string;
  name: string;
  sqlType: string;
}

export interface BasicSQLObject {
  type: string;
  tableType: string;
  constraintType: string;
  schema: string;
  name: string;
  specificName: string;
  text: string;
  system: {
    schema: string;
    name: string;
  }
  basedOn: {
    schema: string;
    name: string;
  }
}

export interface CPYFOptions {
  toLib: string;
  toFile: string;
  fromMbr: string;
  toMbr: string;
  mbrOpt: string;
  crtFile: string;
  outFmt: string
}