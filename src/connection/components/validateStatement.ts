import { IBMiComponent, SecureComponentState } from "@halcyontech/vscode-ibmi-types/api/components/component";
import IBMi from "@halcyontech/vscode-ibmi-types/api/IBMi";
import { posix } from "path";
import { getInstance } from "../../base";
import { JobInfo } from "../manager";
import { CheckStatementComponent } from "./checkStatement";

export const VALID_STATEMENT_LENGTH = 32740;
export const MAX_STATEMENT_COUNT = 200;

interface SqlCheckError {
  CURSTMTLENGTH: number;
  ERRORFIRSTCOLUMNNUMBER: number;
  ERRORFIRSTRECORDNUMBER: number;
  ERRORLASTCOLUMNNUMBER: number;
  ERRORLASTRECORDNUMBER: number;
  ERRORREPLACEMENTTEXT: string;
  ERRORSQLMESSAGEID: string;
  ERRORSQLSTATE: string;
  ERRORSYNTAXCOLUMNNUMBER: number;
  ERRORSYNTAXRECORDNUMBER: number;
  MESSAGEFILELIBRARY: string;
  MESSAGEFILENAME: string;
  MESSAGETEXT: string;
  NUMBEROFSTATEMENTSBACK: number;
}

type SqlErrorType = "error" | "warning" | "none";

const ERROR_STATE_MAP: { [state: string]: SqlErrorType } = {
  '00': 'none',
  '01': 'warning',
}

export interface SqlSyntaxError {
  type: SqlErrorType;
  sqlid: string;
  sqlstate: string;
  text: string;
  offset: number;
}

export class ValidateStatementComponent implements IBMiComponent {
  static ID = "ValidateStatement";
  private static readonly VERSION = 2;
  private static readonly SIGNATURE = "1937A5AE221BD126F8514798721DFC7F1259CAA9018443ABE38CCF735F48073C";
  private static readonly FUNCTION_NAME = `VALIDATE_STATEMENT${ValidateStatementComponent.VERSION.toString().padStart(4, "0")}`;

  static async get(): Promise<ValidateStatementComponent | undefined> {
    return await getInstance()?.getConnection()?.getComponent<ValidateStatementComponent>(ValidateStatementComponent.ID);
  }

  private getLibrary(connection: IBMi) {
    return connection?.getConfig()?.tempLibrary.toUpperCase() || `ILEDITOR`;
  }

  getIdentification() {
    return {
      name: ValidateStatementComponent.ID,
      version: ValidateStatementComponent.VERSION,
      signature: ValidateStatementComponent.SIGNATURE,
    };
  }

  async getRemoteState(connection: IBMi, installDirectory: string): Promise<SecureComponentState> {
    const remoteSignature = await connection.getContent().getSQLRoutineSignature(
      this.getLibrary(connection),
      ValidateStatementComponent.FUNCTION_NAME,
      "FUNCTION"
    );
    return {
      status: remoteSignature ? "Installed" : "NotInstalled",
      remoteSignature: remoteSignature,
    };
  }

  async update(connection: IBMi, installDirectory: string): Promise<SecureComponentState> {
    return connection.withTempDirectory(async tempDir => {
      const tempSourcePath = posix.join(tempDir, `sqlvalidator.sql`);
      const srcPath = tempSourcePath ? tempSourcePath : '';
      const library = this.getLibrary(connection);
      const oldLib = (await connection.runSQL('VALUES CURRENT PATH'))[0]['00001'] as string;
      await connection.getContent().writeStreamfileRaw(srcPath, this.getSource(library, ValidateStatementComponent.VERSION, oldLib));
      const result = await connection.runCommand({
        command: `QSYS/RUNSQLSTM SRCSTMF('${tempSourcePath}') COMMIT(*NONE) NAMING(*SYS) DFTRDBCOL(${library})`,
        cwd: `/`,
        noLibList: true,
        getSpooledFiles: true
      });

      if (result.code !== 0) {
        throw Error(result.stderr || result.stdout);
      }

      return this.getRemoteState(connection, installDirectory);
    });
  }

  async checkMultipleStatements(currentJob: JobInfo, statements: string[]): Promise<SqlSyntaxError[] | undefined> {
    const connection = getInstance()?.getConnection();
    if (!connection) return undefined;

    const library = this.getLibrary(connection);

    if (library) {
      const checks = statements.map(stmt => `select * from table(${library}.${ValidateStatementComponent.FUNCTION_NAME}(?)) x`).join(` union all `);
      const stmt = currentJob.job.query<SqlCheckError>(checks, { parameters: statements });
      const result = await stmt.execute(statements.length);
      stmt.close();

      if (!result.success || result.data.length === 0) return [];

      return result.data.map(sqlError => niceError(sqlError));
    }

    return undefined;
  }



  private getSource(library: string, version: number, oldLib: string) {
    return /*sql*/`
    SET PATH = ${library};
    create or replace function ${library}.${ValidateStatementComponent.FUNCTION_NAME}(statementText char(${VALID_STATEMENT_LENGTH}) FOR SBCS DATA)
    returns table (
      messageFileName char(10),
      messageFileLibrary char(10),
      numberOfStatementsBack int,
      curStmtLength int,
      errorFirstRecordNumber int,
      errorFirstColumnNumber int,
      errorLastRecordNumber int,
      errorLastColumnNumber int,
      errorSyntaxRecordNumber int,
      errorSyntaxColumnNumber int,
      errorSQLMessageID char(7),
      errorSQLSTATE char(5),
      errorReplacementText char(1000),
      messageText char(132)
    )
    modifies sql data
    begin
      -- Variables required for parameters
      declare stmtLength int default 0;
      declare recordsProvided int default 1;
      declare statementLanguage char(10) default '*NONE';
      declare options char(24) default '000000000000000000000000';
      declare statementInfo char(1000) for bit data default '';
      declare statementInfoLength int default 1000;
      declare recordsProcessed int default 0;
      declare errorCode char(1000) default '';
      --
    
      -- Variables required for parsing the error list
      declare messageFileName char(10);
      declare messageFileLibrary char(10);
      declare numberOfStatementsBack int default 0;
      declare currentStatementIndex int default 0;
    
      -- Variables for each error
      declare errorOffset int default 25;
      declare curStmtLength int default 0;
      declare errorFirstRecordNumber int default 0;
      declare errorFirstColumnNumber int default 0;
      declare errorLastRecordNumber int default 0;
      declare errorLastColumnNumber int default 0;
      declare errorSyntaxRecordNumber int default 0;
      declare errorSyntaxColumnNumber int default 0;
      declare errorSQLMessageID char(7) default '';
      declare errorSQLSTATE char(5) default '';
      declare errorRepLen int default 0;
      declare errorReplacementText char(1000) default ''; 
      declare messageText char(132) default '';
    
      set stmtLength = length(rtrim(statementText));
      set options = x'00000001' concat x'00000001' concat x'0000000A' concat '*NONE     '; --No naming convention
      -- set options = x'00000001' concat x'00000008' concat x'00000004' concat x'000004B0'; -- ccsid
      
      call ${CheckStatementComponent.FUNCTION_NAME}( statementText, stmtLength, recordsProvided, statementLanguage, options, statementInfo, statementInfoLength, recordsProcessed, errorCode);
    
      -- Parse the output
      set messageFileName = rtrim(substr(statementInfo, 1, 10));
      set messageFileLibrary = rtrim(substr(statementInfo, 11, 10));
      set numberOfStatementsBack = interpret(substr(statementInfo, 21, 4) as int);
      set errorOffset = 25;
    
      while currentStatementIndex < numberOfStatementsBack do
        set curStmtLength = interpret(substr(statementInfo, errorOffset, 4) as int);
        set errorFirstRecordNumber = interpret(substr(statementInfo, errorOffset + 4, 4) as int);
        set errorFirstColumnNumber = interpret(substr(statementInfo, errorOffset + 8, 4) as int);
        set errorLastRecordNumber = interpret(substr(statementInfo, errorOffset + 12, 4) as int);
        set errorLastColumnNumber = interpret(substr(statementInfo, errorOffset + 16, 4) as int);
        set errorSyntaxRecordNumber = interpret(substr(statementInfo, errorOffset + 20, 4) as int);
        set errorSyntaxColumnNumber = interpret(substr(statementInfo, errorOffset + 24, 4) as int);
        set errorSQLMessageID = rtrim(substr(statementInfo, errorOffset + 28, 7));
        set errorSQLSTATE = rtrim(substr(statementInfo, errorOffset + 35, 5));
        set errorRepLen = interpret(substr(statementInfo, errorOffset + 40, 4) as int);
        set errorReplacementText = rtrim(substr(statementInfo, errorOffset + 44, errorRepLen));
    
        set errorOffset = errorOffset + 44 + errorRepLen;
    
        set currentStatementIndex = currentStatementIndex + 1;
    
        select message_text
        into messageText
        from table(qsys2.message_file_data(messageFileLibrary, messageFileName))
        where message_id = errorSQLMessageID;
    
        pipe (
          messageFileName,
          messageFileLibrary,
          numberOfStatementsBack,
          curStmtLength,
          errorFirstRecordNumber,
          errorFirstColumnNumber,
          errorLastRecordNumber,
          errorLastColumnNumber,
          errorSyntaxRecordNumber,
          errorSyntaxColumnNumber,
          errorSQLMessageID,
          errorSQLSTATE,
          errorReplacementText,
          messageText
        );
      end while;
    
      return;
    end;
  
    comment on function ${library}/${ValidateStatementComponent.FUNCTION_NAME} is '${version} - SQL Syntax Checker';

    SET PATH = ${oldLib};
    `;
  }
}

function niceError(sqlError: SqlCheckError): SqlSyntaxError {
  const replaceTokens = splitReplaceText(sqlError.ERRORREPLACEMENTTEXT);

  let text = sqlError.MESSAGETEXT || `Unknown error message ${sqlError.ERRORSQLMESSAGEID ? `(${sqlError.ERRORSQLMESSAGEID})` : `(No message ID)`}`;
  replaceTokens.forEach((token, index) => {
    text = text.replace(`&${index + 1}`, token);
  });

  const sqlState = sqlError.ERRORSQLSTATE.substring(0, 2);
  let errorType: SqlErrorType = (sqlState in ERROR_STATE_MAP ? ERROR_STATE_MAP[sqlState] : `error`);

  return {
    type: errorType,
    sqlid: sqlError.ERRORSQLMESSAGEID,
    sqlstate: sqlError.ERRORSQLSTATE,
    text,
    offset: sqlError.ERRORSYNTAXCOLUMNNUMBER,
  };
}

function splitReplaceText(input: string) {
  const firstGoodChar = input.split('').findIndex(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126);

  let replacements: string[] = [];
  let inReplacement = false;
  let currentReplacement = ``;

  for (let i = firstGoodChar; i < input.length; i++) {
    const isGoodChar = input.charCodeAt(i) >= 32 && input.charCodeAt(i) <= 126;

    if (isGoodChar) {
      inReplacement = true;

      if (inReplacement) {
        currentReplacement += input[i];
      }
    } else {
      if (inReplacement) {
        replacements.push(currentReplacement);
        currentReplacement = ``;
      }

      inReplacement = false;
    }
  }

  if (currentReplacement) {
    replacements.push(currentReplacement);
  }

  return replacements;
}