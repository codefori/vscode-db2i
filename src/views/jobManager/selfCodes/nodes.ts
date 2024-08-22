
export interface SelfIleStackFrame {
  ORD: number;
  TYPE: string;
  LIB: string;
  PGM: string;
  MODULE: string;
  PROC: string;
  STMT: string;
  ACTGRP: string;
}

export interface InitialStackData {
  initial_stack: SelfIleStackFrame[];
}

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

  PROGRAM_LIBRARY: string;
  PROGRAM_NAME: string;
  PROGRAM_TYPE: "*PGM"|"*SRVPGM";
  MODULE_NAME: string;
  CLIENT_APPLNAME: string
  CLIENT_PROGRAMID: string;
  INITIAL_STACK: InitialStackData;
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