
export interface ServerResponse {
  id: string;
  success: boolean;
  error?: string;
}

export interface ConnectionResult extends ServerResponse {
  job: string;
}

export interface QueryResult extends ServerResponse {
  metadata: QueryMetaData,
  is_done: boolean;
  data: any;
}

export interface QueryMetaData {
  column_count: number,
  columns: ColumnMetaData[],
  job: string
}

export interface ColumnMetaData {
  display_size: number;
  label: string;
  name: string;
  type: string;
}

export type Rows = {[column: string]: string|number|boolean}[];

export interface JDBCOptions {
  // Format properties
  naming?: "system"|"sql";

  // Other properties
  "full open"?: boolean;
  
  // System Properties
  libraries?: string[];
  "auto commit"?: "true" | "false";
  "concurrent access resolution"?: "1" | "2" | "3";
  "cursor hold"?: "true" | "false";
  "cursor sensitivity"?: "asensitive" | "insensitive" | "sensitive";
  "database name"?: string;
  "decfloat rounding mode"?: "half even" | "half up" | "down" | "ceiling" | "floor" | "up" | "half down";
  "maximum precision"?: "31" | "63";
  "maximum scale"?: string;
  "minimum divide scale"?: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
  "package ccsid"?: "1200" | "13488" | "system";
  "transaction isolation"?: "none" | "read uncommitted"| "read committed"| "repeatable read"| "serializable";
  "translate hex"?: "character" | "binary";
  "true autocommit"?: "true" | "false";
  "XA loosely coupled support"?: "0" | "1";



}