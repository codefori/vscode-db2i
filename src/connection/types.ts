
// Redefined from mapepire-js
export enum JobStatus {
  NOT_STARTED = "notStarted",
  CONNECTING = "connecting",
  READY = "ready",
  BUSY = "busy",
  ENDED = "ended"
}

export enum TransactionEndType {
  COMMIT = "COMMIT",
  ROLLBACK = "ROLLBACK"
}

export enum ExplainType {
  RUN = "run",
  DO_NOT_RUN = "doNotRun"
}
// End

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