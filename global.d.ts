
interface TableColumn {
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

interface SQLParm {
  PARAMETER_NAME: string,
  PARAMETER_MODE: "IN" | "OUT" | "INOUT",
  DATA_TYPE: string,
  CHARACTER_MAXIMUM_LENGTH?: number,
  NUMERIC_SCALE?: number,
  NUMERIC_PRECISION?: number,
  IS_NULLABLE: "Y" | "N",
  DEFAULT?: string,
  LONG_COMMENT?: string
}

interface StatementInfo {
  content: string,
  type: "statement"|"json"|"csv"|"cl"|"sql",
  open?: boolean
}