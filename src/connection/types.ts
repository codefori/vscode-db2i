
export interface ServerResponse {
  id: string;
  success: boolean;
  message?: string;
}

export interface ConnectionResult extends ServerResponse {
  job: string;
}

export interface QueryResult extends ServerResponse {
  metadata: QueryMetaData,
  is_done: boolean;
  data: Rows;
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
  naming?: "system"|"sql",
  libraries?: string[]
}