export const VALIDATOR_NAME = `VALIDATE_STATEMENT`;
export const WRAPPER_NAME = `CHECKSTMTWRAPPED`

export function getValidatorSource(schema: string, version: number) {
  return /*sql*/`
  create or replace procedure ${schema}.${WRAPPER_NAME} (
    IN statementText char(1000) FOR SBCS DATA,
    IN statementLength int,
    IN recordsProvided int,
    IN statementLanguage char(10),
    IN options char(24),
    OUT statementInfo char(1000),
    IN statementInfoLength int,
    OUT recordsProcessed int,
    OUT errorCode char(1000)
  ) 
  LANGUAGE RPGLE
  NOT DETERMINISTIC
  MODIFIES SQL DATA
  EXTERNAL NAME QSYS/QSQCHKS
  PARAMETER STYLE GENERAL;

  comment on procedure ${schema}/${WRAPPER_NAME} is '${version} - QSQCHKS Wrapper';

  create or replace function ${schema}.${VALIDATOR_NAME}(statementText char(1000) FOR SBCS DATA) --todo: support 1208 parms
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
    
    call ${schema}.${WRAPPER_NAME}( statementText, stmtLength, recordsProvided, statementLanguage, options, statementInfo, statementInfoLength, recordsProcessed, errorCode);
  
    -- set ${schema}.outlog = statementInfo;
    -- set ${schema}.outlog = substr(statementInfo, 21, 4);
  
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
      from table(qsys2.message_file_data('QSYS', 'QSQLMSG'))
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

  comment on function ${schema}/${VALIDATOR_NAME} is '${version} - SQL Syntax Checker';
  
  --select *
  --from table(${schema}.validate_statement('select from sample.employee order by a')) x;
  --
  --select * from table(qsys2.message_file_data('QSYS', 'QSQLMSG'));
  --
  --values hex(substr(${schema}.outlog, 21, 4));
  --values interpret(hex(substr(${schema}.outlog, 21, 4)) as int);
  --values hex(1) concat hex(1) concat hex(10) concat '*NONE     ';
  --values length(x'000004B8');
  --values hex(1200);
  `;
}