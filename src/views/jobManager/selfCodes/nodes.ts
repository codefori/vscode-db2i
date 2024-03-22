export interface SelfCodeNode {
  JOB_NAME: string,
  USER_NAME: string;
  REASON_CODE: string;
  LOGGED_TIME: string;
  LOGGED_SQLSTATE: string;
  LOGGED_SQLCODE: number;
  MATCHES: number;
  STMTTEXT: string;
  MESSAGE_TEXT: string;
  MESSAGE_SECOND_LEVEL_TEXT: string;
}

export type SelfValue = "*ALL" | "*ERROR" | "*WARNING" | "*NONE";

export interface SelfCodeObject {
  code: SelfValue;
  message: string;
}

export const selfCodesMap: SelfCodeObject[] = [
  {code: `*ALL`, message: undefined},
  {code: `*ERROR`, message: undefined},
  {code: `*WARNING`, message: undefined},
  {code: `*NONE`, message: undefined}
];