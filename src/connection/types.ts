import { QueryMetaData, QueryResult } from "@ibm/mapepire-js/dist/src/types";

export interface JobLogEntry {
  MESSAGE_ID: string;
  SEVERITY: string;
  MESSAGE_TIMESTAMP: string;
  FROM_LIBRARY: string;
  FROM_PROGRAM: string;
  MESSAGE_TYPE: string;
  MESSAGE_TEXT: string;
  MESSAGE_SECOND_LEVEL_TEXT: string
}

export type Rows = {[column: string]: string|number|boolean}[];