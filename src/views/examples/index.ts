export interface SQLExamplesList {
  [group: string]: SQLExample[]
}

interface ExampleSystemRequirements {
  // OS version: required db2 level
  [osVersion: number]: number;
}

export interface SQLExample {
  name: string;
  content: string[];
  requirements?: ExampleSystemRequirements;
};

    // Unlike the bulk of the examples defined below, the services examples are retrieved dynamically
    export const ServiceInfoLabel = `IBM i (SQL) Services`;

export let Examples: SQLExamplesList = {
  "Data Definition Language (DDL)": [
    {
      "name": "Create Schema",
      "content": [
        "CREATE SCHEMA schema1;"
      ]
    },
    {
      "name": "Drop Schema",
      "content": [
        "DROP SCHEMA schema1;"
      ]
    },
    {
      "name": "Create or Replace Table",
      "content": [
        "CREATE OR REPLACE TABLE table1 (column1 INTEGER NOT NULL, column2 VARCHAR(100) ALLOCATE(20));"
      ]
    },
    {
      "name": "Create or Replace Table With Constraints",
      "content": [
        "CREATE OR REPLACE TABLE table2 (column1 INTEGER NOT NULL CONSTRAINT constraint9 PRIMARY KEY, column2 DECIMAL(5, 2));"
      ]
    },
    {
      "name": "Alter Table to Add Column",
      "content": [
        "ALTER TABLE table1 ADD COLUMN column3 INTEGER;"
      ]
    },
    {
      "name": "Alter Table to Drop Column",
      "content": [
        "ALTER TABLE table1 DROP COLUMN column3;"
      ]
    },
    {
      "name": "Alter Table to Alter Column",
      "content": [
        "ALTER TABLE table1 ALTER COLUMN column1 SET DATA TYPE DECIMAL(31, 0);"
      ]
    },
    {
      "name": "Alter Table to add Primary Key Constraint",
      "content": [
        "ALTER TABLE table1 ADD CONSTRAINT constraint1 PRIMARY KEY (column1);"
      ]
    },
    {
      "name": "Alter Table to add Unique Constraint",
      "content": [
        "ALTER TABLE table1 ADD CONSTRAINT constraint2 UNIQUE (column2);"
      ]
    },
    {
      "name": "Alter Table to add Foreign Key Constraint",
      "content": [
        "ALTER TABLE table1 ADD CONSTRAINT constraint3 FOREIGN KEY (column2) REFERENCES table2 ON DELETE RESTRICT ON UPDATE RESTRICT;"
      ]
    },
    {
      "name": "Alter Table to add Hash Partition",
      "content": [
        "ALTER TABLE employee ADD PARTITION BY HASH (empno, firstnme, midinit, lastname) INTO 20 PARTITIONS;"
      ]
    },
    {
      "name": "Alter Table to add Range Partition",
      "content": [
        "ALTER TABLE employee",
        "  ADD PARTITION BY RANGE (lastname NULLS LAST) (",
        "    PARTITION a_l STARTING FROM ('A') INCLUSIVE ENDING AT ('M') EXCLUSIVE ,",
        "    PARTITION m_z STARTING FROM ('M') INCLUSIVE ENDING AT (MAXVALUE) INCLUSIVE",
        "  );"
      ]
    },
    {
      "name": "Comment on Column",
      "content": [
        "COMMENT ON COLUMN table1 (column2 IS 'comment', column3 IS 'comment');"
      ]
    },
    {
      "name": "Label on Column",
      "content": [
        "LABEL ON COLUMN table1 (column2 IS 'label', column3 IS 'label');"
      ]
    },
    {
      "name": "Drop Table and Restrict",
      "content": [
        "DROP TABLE table3 RESTRICT;"
      ]
    },
    {
      "name": "Rename Table",
      "content": [
        "RENAME TABLE table1 TO table3;"
      ]
    },
    {
      "name": "Create or Replace View",
      "content": [
        "CREATE OR REPLACE VIEW view1 AS SELECT column1, column2, column3 FROM table2 WHERE column1 > 5;"
      ]
    },
    {
      "name": "Create or Replace View With Check Options",
      "content": [
        "CREATE OR REPLACE VIEW view1 AS SELECT * FROM table2 WHERE column1 > 5 WITH CHECK OPTION;"
      ]
    },
    {
      "name": "Drop View Cascade",
      "content": [
        "DROP VIEW view3 CASCADE;"
      ]
    },
    {
      "name": "Refresh Table",
      "content": [
        "REFRESH TABLE mqt1;"
      ]
    },
    {
      "name": "Alter Table to Add Materialized Query",
      "content": [
        "ALTER TABLE table1 ADD MATERIALIZED QUERY (select int_col, varchar_col from table3) DATA INITIALLY IMMEDIATE REFRESH DEFERRED MAINTAINED BY USER ENABLE QUERY OPTIMIZATION;"
      ]
    },
    {
      "name": "Create Alias for Table",
      "content": [
        "CREATE ALIAS alias1 FOR table1;"
      ]
    },
    {
      "name": "Comment on Alias",
      "content": [
        "COMMENT ON ALIAS alias1 IS 'comment';"
      ]
    },
    {
      "name": "Label on Alias",
      "content": [
        "LABEL ON ALIAS alias1 IS 'label';"
      ]
    },
    {
      "name": "Create or Replace Alias for Table",
      "content": [
        "CREATE OR REPLACE ALIAS alias2 FOR table2(member1);"
      ]
    },
    {
      "name": "Drop Alias",
      "content": [
        "DROP ALIAS alias1;"
      ]
    },
    {
      "name": "Create Distinct Type",
      "content": [
        "CREATE DISTINCT TYPE type1 AS INTEGER WITH COMPARISONS;"
      ]
    },
    {
      "name": "Drop Distinct Type Cascade",
      "content": [
        "DROP DISTINCT TYPE type1 CASCADE;"
      ]
    },
    {
      "name": "Create or Replace Trigger After Insert",
      "content": [
        "CREATE OR REPLACE TRIGGER NEW_HIRE AFTER INSERT ON EMPLOYEE FOR EACH ROW MODE DB2SQL UPDATE COMPANY_STATS SET NBEMP = NBEMP + 1;"
      ]
    },
    {
      "name": "Create or Replace Sequence",
      "content": [
        "CREATE OR REPLACE SEQUENCE seq1 START WITH 10 INCREMENT BY 10;"
      ]
    },
    {
      "name": "Alter Sequence to Restart",
      "content": [
        "ALTER SEQUENCE seq1 RESTART;"
      ]
    },
    {
      "name": "Alter Sequence",
      "content": [
        "ALTER SEQUENCE seq1 DATA TYPE BIGINT INCREMENT BY 10 MINVALUE 100 NO MAXVALUE CYCLE CACHE 5 ORDER;"
      ]
    },
    {
      "name": "Create or Replace Variable",
      "content": [
        "CREATE OR REPLACE VARIABLE MYSCHEMA.MYJOB_PRINTER VARCHAR(30)DEFAULT 'Default printer';"
      ]
    },
    {
      "name": "Label for Variable",
      "content": [
        "LABEL ON VARIABLE MYSCHEMA.MYJOB_PRINTER IS 'Label for this variable';"
      ]
    },
    {
      "name": "Comment for Variable",
      "content": [
        "COMMENT ON VARIABLE MYSCHEMA.MYJOB_PRINTER IS 'Comment for this variable';"
      ]
    },
    {
      "name": "Add generated columns to a table",
      "content": [
        "ALTER TABLE account",
        "ADD COLUMN audit_type_change CHAR(1) GENERATED ALWAYS AS (DATA CHANGE OPERATION)",
        "ADD COLUMN audit_user VARCHAR(128) GENERATED ALWAYS AS (SESSION_USER) ",
        "ADD COLUMN audit_client_IP VARCHAR(128) GENERATED ALWAYS AS (SYSIBM.CLIENT_IPADDR) ",
        "ADD COLUMN audit_job_name VARCHAR(28) GENERATED ALWAYS AS (QSYS2.JOB_NAME);",
        ""
      ]
    },
    {
      "name": "Detach a partition",
      "content": [
        "ALTER TABLE account ",
        "DETACH PARTITION p2011 INTO Archived_2011_Accounts;"
      ]
    },
    {
      "name": "(re)Attach a partition",
      "content": [
        "ALTER TABLE account ",
        "ATTACH PARTITION p2011 FROM Archived_2011_Accounts;"
      ]
    },
    {
      "name": "Alter Table to be located in memory",
      "content": [
        "ALTER TABLE table1 ALTER KEEP IN MEMORY YES;"
      ]
    },
    {
      "name": "Alter Table to be located on Solid State Drives",
      "content": [
        "ALTER TABLE table1 ALTER UNIT SSD;"
      ]
    },
    {
      "name": "Dynamically built CREATE VIEW statement",
      "content": [
        "--  create a sample database",
        "CALL QSYS.CREATE_SQL_SAMPLE('BIERHAUS');",
        "",
        "--",
        "-- Generate the column list for a table or view",
        "--",
        "SELECT LISTAGG(CAST(QSYS2.DELIMIT_NAME(COLUMN_NAME) AS CLOB(1M)), ",
        "                   ', ') ",
        "                   WITHIN GROUP ( ORDER BY ORDINAL_POSITION ) AS COLUMN_LIST",
        "      FROM QSYS2.SYSCOLUMNS2 C",
        "        WHERE TABLE_NAME   = 'EMPLOYEE' AND",
        "              TABLE_SCHEMA = 'BIERHAUS'",
        "              AND HIDDEN = 'N'; -- Don't include hidden columns",
        "",
        "--",
        "-- Generate a valid CREATE VIEW statement",
        "--",
        "",
        "begin",
        "  declare create_view_statement clob(1M) ccsid 37;",
        "",
        "  WITH Gen(Column_list) as (",
        "    SELECT LISTAGG(CAST(QSYS2.DELIMIT_NAME(COLUMN_NAME) AS CLOB(1M)), ",
        "                   ', ') ",
        "                   WITHIN GROUP ( ORDER BY ORDINAL_POSITION ) AS COLUMN_LIST",
        "      FROM QSYS2.SYSCOLUMNS2 C",
        "        WHERE TABLE_NAME   = 'EMPLOYEE' AND",
        "              TABLE_SCHEMA = 'BIERHAUS'",
        "              AND HIDDEN = 'N' -- Don't include hidden columns",
        "  )",
        "  select 'create or replace view BIERHAUS.employee_view( '   concat Column_list concat ' )",
        "        as (SELECT ' concat Column_list concat ' from BIERHAUS.employee)'",
        "    into create_view_statement",
        "    from Gen;",
        "  execute immediate create_view_statement;",
        "end;",
        "",
        "-- Results in this view being created:",
        "-- create or replace view BIERHAUS.employee_view( EMPNO, FIRSTNME, MIDINIT, LASTNAME, ",
        "--                                                WORKDEPT, PHONENO, HIREDATE, JOB, ",
        "--                                                EDLEVEL, SEX, BIRTHDATE, SALARY, ",
        "--                                                BONUS, COMM )",
        "--   as (SELECT EMPNO, FIRSTNME, MIDINIT, LASTNAME, WORKDEPT, ",
        "--              PHONENO, HIREDATE, JOB, EDLEVEL, SEX, BIRTHDATE, ",
        "--              SALARY, BONUS, COMM from BIERHAUS.employee)",
        "        ",
        "        "
      ]
    }
  ],
  "Data Manipulation Language (DML)": [
    {
      "name": "Delete From Table",
      "content": [
        "DELETE FROM table1 WHERE column1 = 0;"
      ]
    },
    {
      "name": "Insert into Table",
      "content": [
        "INSERT INTO table1 VALUES(0, 'AAA', 1);"
      ]
    },
    {
      "name": "Insert into Column in Table",
      "content": [
        "INSERT INTO table1 (column1) VALUES(0);"
      ]
    },
    {
      "name": "Insert into Column in Table From Another Column",
      "content": [
        "INSERT INTO table1 (column1) SELECT column1 FROM table2 WHERE column1 > 5;"
      ]
    },
    {
      "name": "Select All From Table",
      "content": [
        "SELECT * FROM QSYS2.SYSTABLES;"
      ]
    },
    {
      "name": "Select All from Table with Where Clause",
      "content": [
        "SELECT * FROM QSYS2.SYSTABLES WHERE TABLE_NAME LIKE 'FILE%';"
      ]
    },
    {
      "name": "Select Table Schema and Group By",
      "content": [
        "SELECT TABLE_SCHEMA, COUNT(*) AS \"COUNT\" FROM QSYS2.SYSTABLES GROUP BY TABLE_SCHEMA ORDER BY \"COUNT\" DESC;"
      ]
    },
    {
      "name": "Update Column in Table",
      "content": [
        "UPDATE table1 SET column1 = 0 WHERE column1 < 0;"
      ]
    },
    {
      "name": "Update Row in Table",
      "content": [
        "UPDATE table1 SET ROW = (column1, ' ', column3);"
      ]
    },
    {
      "name": "Update Columns in Table with Columns from another Table",
      "content": [
        "UPDATE table1 SET (column1, column2) = (SELECT column1, column2 FROM table2 WHERE table1.column3 = column3);"
      ]
    },
    {
      "name": "Merge into Table",
      "content": [
        "MERGE INTO t1 USING ",
        "  (SELECT id, c2 FROM t2) x ON ",
        "     t1.id = x.id ",
        "  WHEN NOT MATCHED THEN INSERT VALUES (id, c2) ",
        "  WHEN MATCHED THEN UPDATE SET c2 = x.c2;"
      ]
    },
    {
      "name": "Truncate Table Ignoring Delete Triggers",
      "content": [
        "TRUNCATE table1 IGNORE DELETE TRIGGERS;"
      ]
    },
    {
      "name": "Truncate Table Continue Identity",
      "content": [
        "TRUNCATE table1 CONTINUE IDENTITY;"
      ]
    },
    {
      "name": "Truncate Table Restart Identity Immediate",
      "content": [
        "TRUNCATE table1 RESTART IDENTITY IMMEDIATE;"
      ]
    },
    {
      "name": "Use FOR UPDATE to launch Edit Table",
      "content": [
        "CALL qsys.create_sql_sample('BUSINESS_NAME');",
        "",
        "-- Normal query - read only",
        "SELECT *",
        "   FROM business_name.sales;",
        "",
        "-- Edit Table mode in ACS",
        "SELECT *",
        "   FROM business_name.sales",
        "   FOR UPDATE;"
      ]
    }
  ],
  "Data Control Language (DCL)": [
    {
      "name": "Grant Select, Delete, Insert, Update on Table to Public with Grant Option",
      "content": [
        "GRANT SELECT, DELETE, INSERT, UPDATE ON TABLE table3 TO PUBLIC WITH GRANT OPTION;"
      ]
    },
    {
      "name": "Grant all Privileges to Public",
      "content": [
        "GRANT ALL PRIVILEGES ON table3 TO PUBLIC;"
      ]
    },
    {
      "name": "Grant Alter, Index on Table to Public",
      "content": [
        "GRANT ALTER, INDEX ON table3 TO PUBLIC;"
      ]
    },
    {
      "name": "Grant Update Column to Public",
      "content": [
        "GRANT UPDATE (column1) ON table2 TO PUBLIC;"
      ]
    },
    {
      "name": "Revoke Select, Delete, Insert, Update On Table From Public",
      "content": [
        "REVOKE SELECT, DELETE, INSERT, UPDATE ON TABLE table3 FROM PUBLIC;"
      ]
    },
    {
      "name": "Revoke all Privileges from Public",
      "content": [
        "REVOKE ALL PRIVILEGES ON table3 FROM PUBLIC;"
      ]
    },
    {
      "name": "Revoke Alter, Index on Table From Public",
      "content": [
        "REVOKE ALTER, INDEX on table3 FROM PUBLIC;"
      ]
    },
    {
      "name": "Revoke Update Column from Public",
      "content": [
        "REVOKE UPDATE (column1) ON table2 FROM PUBLIC;"
      ]
    }
  ],
  "Routine (Function or Procedure) Statements": [
    {
      "name": "Create or Replace Procedure Language C",
      "content": [
        "CREATE OR REPLACE PROCEDURE procedure1 (INOUT parameter1 INTEGER) LANGUAGE C EXTERNAL PARAMETER STYLE GENERAL;"
      ]
    },
    {
      "name": "Create or Replace Procedure Language C External Name",
      "content": [
        "CREATE OR REPLACE PROCEDURE procedure2 (INOUT parameter1 INTEGER) LANGUAGE C EXTERNAL NAME 'lib1/srvpgm1(entryname)' PARAMETER STYLE GENERAL;"
      ]
    },
    {
      "name": "Create or Replace Function Language C",
      "content": [
        "CREATE OR REPLACE FUNCTION function1 (parameter1 INTEGER) RETURNS INTEGER LANGUAGE C EXTERNAL NAME 'lib1/pgm1(entryname)' PARAMETER STYLE GENERAL;"
      ]
    },
    {
      "name": "Grant Execute on Procedure",
      "content": [
        "GRANT EXECUTE ON PROCEDURE procedure1 TO PUBLIC;"
      ]
    },
    {
      "name": "Revoke Execute on Procedure",
      "content": [
        "REVOKE EXECUTE ON SPECIFIC PROCEDURE specific1 FROM PUBLIC;"
      ]
    },
    {
      "name": "Comment on Parameter for Procedure",
      "content": [
        "COMMENT ON PARAMETER procedure1 (parameter1  IS 'comment', parameter2 IS 'comment');"
      ]
    },
    {
      "name": "Comment on Procedure",
      "content": [
        "COMMENT ON PROCEDURE procedure1 IS 'comment';"
      ]
    },
    {
      "name": "Drop Function",
      "content": [
        "DROP FUNCTION function1;"
      ]
    },
    {
      "name": "Drop Procedure",
      "content": [
        "DROP PROCEDURE procedure1;"
      ]
    },
    {
      "name": "Create XML Variable",
      "content": [
        "CREATE VARIABLE gxml1 XML;"
      ]
    },
    {
      "name": "Set Variable to Parse XML",
      "content": [
        "SET gxml1 = XMLPARSE(DOCUMENT '<run/>');"
      ]
    },
    {
      "name": "Dynamic Compound statement",
      "content": [
        "BEGIN",
        "   DECLARE already_exists SMALLINT DEFAULT 0;",
        "   DECLARE dup_object_hdlr CONDITION FOR SQLSTATE '42710';",
        "   DECLARE CONTINUE HANDLER FOR dup_object_hdlr",
        "      SET already_exists = 1;",
        "   CREATE TABLE table1(col1 INT);",
        "   IF already_exists > 0",
        "   THEN",
        "      DELETE FROM table1;",
        "   END IF;",
        "END;"
      ]
    }
  ],
  "Special Registers": [
    {
      "name": "Select Client Special Registers",
      "content": [
        "SELECT CLIENT APPLNAME   , ",
        "       CLIENT ACCTNG     ,",
        "       CLIENT PROGRAMID  , ",
        "       CLIENT USERID     , ",
        "       CLIENT WRKSTNNAME   ",
        "FROM SYSIBM.SYSDUMMY1;"
      ]
    },
    {
      "name": "Select Current Date",
      "content": [
        "SELECT CURRENT_DATE FROM SYSIBM.SYSDUMMY1;"
      ]
    },
    {
      "name": "Select Current Debug Mode",
      "content": [
        "SELECT CURRENT DEBUG MODE FROM SYSIBM.SYSDUMMY1;"
      ]
    },
    {
      "name": "Select Current Degree",
      "content": [
        "SELECT CURRENT DEGREE FROM SYSIBM.SYSDUMMY1;"
      ]
    },
    {
      "name": "Select Current Path",
      "content": [
        "SELECT CURRENT_PATH FROM SYSIBM.SYSDUMMY1;"
      ]
    },
    {
      "name": "Select Current Schema",
      "content": [
        "SELECT CURRENT SCHEMA FROM SYSIBM.SYSDUMMY1;"
      ]
    },
    {
      "name": "Select Current Server",
      "content": [
        "SELECT CURRENT SERVER FROM SYSIBM.SYSDUMMY1;"
      ]
    },
    {
      "name": "Select Current Time",
      "content": [
        "SELECT CURRENT_TIME FROM SYSIBM.SYSDUMMY1;"
      ]
    },
    {
      "name": "Select Current Timestamp",
      "content": [
        "SELECT CURRENT_TIMESTAMP FROM SYSIBM.SYSDUMMY1;"
      ]
    },
    {
      "name": "Select Current Time Zone",
      "content": [
        "SELECT CURRENT TIMEZONE FROM SYSIBM.SYSDUMMY1;"
      ]
    },
    {
      "name": "Select User",
      "content": [
        "SELECT USER FROM SYSIBM.SYSDUMMY1;"
      ]
    },
    {
      "name": "Select Session User",
      "content": [
        "SELECT SESSION_USER FROM SYSIBM.SYSDUMMY1;"
      ]
    },
    {
      "name": "Select System User",
      "content": [
        "SELECT SYSTEM_USER FROM SYSIBM.SYSDUMMY1;"
      ]
    },
    {
      "name": "Select  Decimal Float Rounding Mode",
      "content": [
        "SELECT CURRENT DECFLOAT ROUNDING MODE FROM SYSIBM.SYSDUMMY1;"
      ]
    },
    {
      "name": "Select Current User",
      "content": [
        "VALUES(CURRENT USER);"
      ]
    },
    {
      "name": "Select  Implicit XML Parse option",
      "content": [
        "VALUES( CURRENT IMPLICIT XMLPARSE OPTION );"
      ]
    },
    {
      "name": "Set Decfloat Rounding to Round Half Even",
      "content": [
        "SET CURRENT DECFLOAT ROUNDING MODE = ROUND_HALF_EVEN;"
      ]
    },
    {
      "name": "Set Degree to 5",
      "content": [
        "SET CURRENT DEGREE = '5';"
      ]
    },
    {
      "name": "Set Degree to Any",
      "content": [
        "SET CURRENT DEGREE = 'ANY';"
      ]
    },
    {
      "name": "Set Degree to Default",
      "content": [
        "SET CURRENT DEGREE = DEFAULT;"
      ]
    },
    {
      "name": "Set Session Authorization to JOEUSER",
      "content": [
        "SET SESSION AUTHORIZATION ='JOEUSER';"
      ]
    },
    {
      "name": "Select  Decimal Float Rounding Mode",
      "content": [
        "SELECT CURRENT DECFLOAT ROUNDING MODE FROM SYSIBM.SYSDUMMY1;"
      ]
    },
    {
      "name": "Set Path",
      "content": [
        "SET PATH = MYSCHEMA, SYSTEM PATH;"
      ]
    },
    {
      "name": "Set current schema",
      "content": [
        "SET SCHEMA = MYSCHEMA;"
      ]
    },
    {
      "name": "Set client special registers",
      "content": [
        "CALL SYSPROC.WLM_SET_CLIENT_INFO(",
        "    'db2user', ",
        "    'machine.rchland.ibm.com', ",
        "    'Auditor', ",
        "    'Accounting department', ",
        "    'AUTOMATIC' );",
        "",
        "SELECT ",
        "UPPER(CURRENT CLIENT_USERID) , ",
        "CURRENT CLIENT_WRKSTNNAME , ",
        "CURRENT CLIENT_APPLNAME , ",
        "CURRENT CLIENT_ACCTNG , ",
        "CURRENT CLIENT_PROGRAMID ",
        "FROM SYSIBM.SYSDUMMY1;",
        "",
        "-- Selectively change a subset of registers",
        "CALL SYSPROC.WLM_SET_CLIENT_INFO(",
        "    CLIENT_PROGRAMID => 'Warehouse Extraction Process - V2.4' ",
        " );",
        "",
        "SELECT ",
        "UPPER(CURRENT CLIENT_USERID) , ",
        "CURRENT CLIENT_WRKSTNNAME , ",
        "CURRENT CLIENT_APPLNAME , ",
        "CURRENT CLIENT_ACCTNG , ",
        "CURRENT CLIENT_PROGRAMID ",
        "FROM SYSIBM.SYSDUMMY1;"
      ]
    }
  ],
  "Built-in Global Variables": [
    {
      "name": "Thread Identifier",
      "content": [
        "VALUES(QSYS2.THREAD_ID);"
      ]
    }
  ],
  "Miscellaneous": [
    {
      "name": "Call Create SQL Sample with Schema",
      "content": [
        "CALL QSYS.CREATE_SQL_SAMPLE('SCHEMA-NAME');"
      ]
    },
    {
      "name": "Call QCMDEXC with schema",
      "content": [
        "CALL QSYS2.QCMDEXC('addlible schema1');"
      ]
    },
    {
      "name": "Review ACS function usage configuration",
      "content": [
        "-- ",
        "--  Note: Here is the default configuration",
        "--",
        "--  Function ID              Default Usage",
        "--  -----------              -------------",
        "--  QIBM_DB_SQLADM           DENIED",
        "--  QIBM_DB_SYSMON           DENIED",
        "--  QIBM_DB_SECADM           DENIED",
        "--  QIBM_DB_DDMDRDA          ALLOWED",
        "--  QIBM_DB_ZDA              ALLOWED",
        "--  QIBM_XE1_OPNAV_DBNAV     ALLOWED",
        "--  QIBM_XE1_OPNAV_DBSQLPM   ALLOWED",
        "--  QIBM_XE1_OPNAV_DBSQLPCS  ALLOWED",
        "--  QIBM_XE1_OPNAV_DBXACT    ALLOWED",
        "SELECT function_id,",
        "       default_usage,",
        "       f.*",
        "   FROM qsys2.function_info f",
        "   WHERE function_id LIKE 'QIBM_DB_%' OR",
        "         function_id LIKE 'QIBM_XE1_OPNAV_DB_%';"
      ]
    },
    {
      "name": "Lock Table in Share Mode",
      "content": [
        "LOCK TABLE table1 IN SHARE MODE;"
      ]
    },
    {
      "name": "Lock Table in Exclusive Mode",
      "content": [
        "LOCK TABLE table1 IN EXCLUSIVE MODE;"
      ]
    },
    {
      "name": "Lock Table in Exclusive Mode Allow Read",
      "content": [
        "LOCK TABLE table1 IN EXCLUSIVE MODE ALLOW READ;"
      ]
    },
    {
      "name": "Set Path to *LIBL",
      "content": [
        "SET PATH = *LIBL;"
      ]
    },
    {
      "name": "Set Path to schemas",
      "content": [
        "SET PATH = schema1, schema2;"
      ]
    },
    {
      "name": "Declare Global Temporary Table Session",
      "content": [
        "DECLARE GLOBAL TEMPORARY TABLE SESSION.TEMP_EMP (EMPNO CHAR(6) NOT NULL, SALARY DECIMAL(9, 2), BONUS DECIMAL(9, 2), COMM DECIMAL(9, 2)) ON COMMIT PRESERVE ROWS;"
      ]
    },
    {
      "name": "Declare Global Temporary Table",
      "content": [
        "DECLARE GLOBAL TEMPORARY TABLE TEMPTAB1 LIKE USER1.EMPTAB INCLUDING IDENTITY ON COMMIT PRESERVE ROWS;"
      ]
    },
    {
      "name": "CL ADDRPYLE",
      "content": [
        "CL: ADDRPYLE SEQNBR(3333) MSGID(CPA32B2) RPY(I);"
      ]
    },
    {
      "name": "CL ADDRPYLE CMPDTA(table)",
      "content": [
        "CL: ADDRPYLE SEQNBR(3333) MSGID(CPA32B2) CMPDTA(table1 1) RPY(I);"
      ]
    },
    {
      "name": "CL: CHGJOB INQMSGRPY(*SYSRPYL)",
      "content": [
        "CL: CHGJOB INQMSGRPY(*SYSRPYL);"
      ]
    },
    {
      "name": "CL: CHGJOB INQMSGRPY(*DFT)",
      "content": [
        "CL: CHGJOB INQMSGRPY(*DFT);"
      ]
    },
    {
      "name": "CL: RMVRPYLE SEQNBR(3333)",
      "content": [
        "CL: RMVRPYLE SEQNBR(3333);"
      ]
    }
  ],
  "IBM i Services": [
    {
      "name": "__ Where to find more detail __",
      "content": [
        "--  Documentation can be found here:",
        "--  --------------------------------",
        "--  https://www.ibm.com/support/knowledgecenter/ssw_ibm_i_73/rzajq/rzajqservicessys.htm",
        "-- ",
        "--  Enabling DB2 PTF Group level and enhancement details can be found here:",
        "--  -----------------------------------------------------------------------",
        "--  https://ibm.biz/DB2foriServices",
        "--"
      ]
    },
    {
      "name": "Security - Review *ALLOBJ users",
      "content": [
        "--",
        "-- Which users have *ALLOBJ authority either directly",
        "-- or via a Group or Supplemental profile?",
        "--",
        "SELECT AUTHORIZATION_NAME, STATUS, NO_PASSWORD_INDICATOR, PREVIOUS_SIGNON,",
        "TEXT_DESCRIPTION",
        "FROM QSYS2.USER_INFO",
        "WHERE SPECIAL_AUTHORITIES LIKE '%*ALLOBJ%'",
        "OR AUTHORIZATION_NAME IN (",
        "SELECT USER_PROFILE_NAME",
        "FROM QSYS2.GROUP_PROFILE_ENTRIES",
        "WHERE GROUP_PROFILE_NAME IN (",
        "SELECT AUTHORIZATION_NAME",
        "FROM QSYS2.USER_INFO",
        "WHERE SPECIAL_AUTHORITIES like '%*ALLOBJ%'",
        ")",
        ")",
        "ORDER BY AUTHORIZATION_NAME;"
      ]
    },
    {
      "name": "Security - Review *JOBCTL users",
      "content": [
        "--",
        "-- Which users have *JOBCTL authority either directly",
        "-- or via a Group or Supplemental profile?",
        "--",
        "SELECT AUTHORIZATION_NAME, STATUS, NO_PASSWORD_INDICATOR, PREVIOUS_SIGNON,",
        "TEXT_DESCRIPTION",
        "FROM QSYS2.USER_INFO",
        "WHERE SPECIAL_AUTHORITIES LIKE '%*JOBCTL%'",
        "OR AUTHORIZATION_NAME IN (",
        "SELECT USER_PROFILE_NAME",
        "FROM QSYS2.GROUP_PROFILE_ENTRIES",
        "WHERE GROUP_PROFILE_NAME IN (",
        "SELECT AUTHORIZATION_NAME",
        "FROM QSYS2.USER_INFO",
        "WHERE SPECIAL_AUTHORITIES like '%*JOBCTL%'",
        ")",
        ")",
        "ORDER BY AUTHORIZATION_NAME;"
      ]
    },
    {
      "name": "Security - User Info Sign On Failures",
      "content": [
        "--",
        "-- Which users are having trouble signing on?",
        "--",
        "SELECT * FROM QSYS2.USER_INFO ",
        " WHERE SIGN_ON_ATTEMPTS_NOT_VALID > 0;"
      ]
    },
    {
      "name": "Security - Group profile detail",
      "content": [
        "--",
        "-- Review Group and Supplemental Group settings",
        "--",
        "SELECT group_profile_name,",
        "       supplemental_group_count,",
        "       supplemental_group_list,",
        "       u.*",
        "   FROM qsys2.user_info u",
        "   WHERE supplemental_group_count > 0",
        "   ORDER BY 2 DESC;"
      ]
    },
    {
      "name": "Security - Authorization List detail",
      "content": [
        "--",
        "-- List the public security settings for all authorization lists.",
        "--",
        "SELECT *",
        "FROM QSYS2.AUTHORIZATION_LIST_USER_INFO",
        "WHERE AUTHORIZATION_NAME = '*PUBLIC';"
      ]
    },
    {
      "name": "Security - User Info close to disabled",
      "content": [
        "--",
        "-- Which users are at risk of becoming disabled due to lack of use? ",
        "--",
        "SELECT * FROM QSYS2.USER_INFO ",
        " WHERE STATUS = '*ENABLED' AND LAST_USED_TIMESTAMP IS NOT NULL",
        " ORDER BY LAST_USED_TIMESTAMP ASC",
        " FETCH FIRST 20 ROWS ONLY;"
      ]
    },
    {
      "name": "Security - DRDA Authentication Entry info",
      "content": [
        "--",
        "-- Review the DRDA & DDM Server authentication entry configuration",
        "--",
        "SELECT * FROM QSYS2.DRDA_AUTHENTICATION_ENTRY_INFO",
        "  ORDER BY AUTHORIZATION_NAME, SERVER_NAME;"
      ]
    },
    {
      "name": "Review public authority to files in library TOYSTORE",
      "content": [
        "SELECT OBJECT_AUTHORITY AS PUBLIC_AUTHORITY,  ",
        "       COUNT(*) AS COUNT FROM TABLE(QSYS2.OBJECT_STATISTICS('TOYSTORE', 'FILE')) F, ",
        "LATERAL ",
        "(SELECT OBJECT_AUTHORITY FROM QSYS2.OBJECT_PRIVILEGES ",
        "    WHERE SYSTEM_OBJECT_NAME   = F.OBJNAME ",
        "      AND USER_NAME            = '*PUBLIC'",
        "      AND SYSTEM_OBJECT_SCHEMA = 'TOYSTORE'",
        "      AND OBJECT_TYPE          = '*FILE') P ",
        "GROUP BY OBJECT_AUTHORITY ORDER BY 2 DESC;"
      ]
    },
    {
      "name": "Find objects in a library, not included in an authorization list",
      "content": [
        "SELECT a.objname, objdefiner, objtype, sql_object_type",
        " FROM TABLE(qsys2.object_statistics('TOYSTORE', 'ALL')) a",
        "LEFT EXCEPTION JOIN LATERAL",
        " (SELECT system_object_name ",
        "    FROM qsys2.authorization_list_info x ",
        "      WHERE AUTHORIZATION_LIST = 'TOYSTOREAL') b",
        "        ON a.objname = b.system_object_name;"
      ]
    },
    {
      "name": "Security - Function Usage",
      "content": [
        "--",
        "-- Compare Security Function Usage details between production and backup ",
        "--",
        "",
        "DECLARE GLOBAL TEMPORARY TABLE SESSION . Remote_function_usage ",
        "( function_id, user_name, usage, user_type )",
        "AS (SELECT * FROM gt73p2.qsys2.function_usage) WITH DATA",
        "WITH REPLACE;",
        "",
        "SELECT 'GT73P1' AS \"Source Partition\",",
        "   a.function_id, a.user_name, a.usage, a.user_type",
        "   FROM qsys2.function_usage a LEFT EXCEPTION JOIN ",
        "        session.remote_function_usage b ON ",
        "   a.function_id = b.function_id AND a.user_name   = b.user_name AND",
        "   a.usage   = b.usage           AND a.user_type   = b.user_type",
        "UNION ALL",
        "SELECT 'GT73P2' AS \"Target Partition\",",
        "   b.function_id, b.user_name, b.usage, b.user_type",
        "   FROM qsys2.function_usage a RIGHT EXCEPTION JOIN ",
        "        session.remote_function_usage b ON ",
        "   a.function_id = b.function_id AND a.user_name   = b.user_name AND",
        "   a.usage   = b.usage           AND a.user_type   = b.user_type",
        "ORDER BY 2, 3;",
        ""
      ]
    },
    {
      "name": "Security - Check authority to query",
      "content": [
        "--",
        "-- Description: Does this user have authority to query this file ",
        "--",
        "VALUES ( ",
        "   CASE WHEN QSYS2.SQL_CHECK_AUTHORITY('QSYS2','SYSLIMITS') = 1 ",
        "        THEN 'I can query QSYS2/SYSLIMITS' ",
        "        ELSE 'No query access for me' END ",
        ");"
      ]
    },
    {
      "name": "Security - Secure column values within SQL tooling",
      "content": [
        "--",
        "-- Secure salary column values in the SQL Performance Center  ",
        "--",
        "CALL SYSPROC.SET_COLUMN_ATTRIBUTE('TOYSTORE',",
        "                                  'EMPLOYEE',",
        "                                  'SALARY', ",
        "                                  'SECURE YES'); ",
        "",
        "--",
        "-- Review configuration of SECURE column values for the tools ",
        "-- used by DBEs & Database Performance analysts ",
        "--",
        " SELECT COLUMN_NAME,SECURE ",
        "    FROM QSYS2.SYSCOLUMNS2 ",
        "    WHERE SYSTEM_TABLE_SCHEMA = 'TOYSTORE' AND",
        "          SYSTEM_TABLE_NAME   = 'EMPLOYEE';"
      ]
    },
    {
      "name": "Security - Authority Collection",
      "content": [
        "--  minvrm:  v7r4m0",
        "",
        "-- Enable authority collection by object for the TOYSTORE/EMPLOYEE *FILE ",
        "-- and include all dependent objects",
        "cl: CHGAUTCOL  OBJ('/QSYS.LIB/TOYSTORE.LIB/EMPLOYEE.FILE')",
        "           AUTCOLVAL(*OBJINF) INCDEPOBJ(*LF);",
        "",
        "",
        "-- Start capturing authority collection by object detail",
        "cl: STRAUTCOL TYPE(*OBJAUTCOL) DLTCOL(*ALL);",
        "",
        "-- Review which objects are enabled for authority collection",
        "SELECT authority_collection_value,",
        "       a.*",
        "   FROM TABLE (",
        "         qsys2.object_statistics('TOYSTORE', '*ALL')",
        "      ) a",
        "   ORDER BY 1 DESC; ",
        "",
        "stop;",
        "-- Stop capturing data",
        "cl: ENDAUTCOL TYPE(*OBJAUTCOL);",
        "",
        "-- Delete the authority collection data",
        "cl: DLTAUTCOL TYPE(*OBJ) OBJ('/QSYS.LIB/TOYSTORE.LIB/EMPLOYEE.FILE') INCDEPOBJ(*LF);",
        "",
        "",
        ""
      ]
    },
    {
      "name": "Security - Authority Collection",
      "content": [
        "--  minvrm:  v7r4m0",
        "",
        "--",
        "-- Show me activity over TOYSTORE/EMPLOYEE",
        "--",
        "with emp_activity (",
        "    username, cur_auth, req_auth",
        "  ) as (",
        "    select \"CURRENT_USER\", detailed_current_authority, detailed_required_authority",
        "      from qsys2.authority_collection_object aco",
        "      where system_object_schema = 'TOYSTORE' and system_object_name = 'EMPLOYEE' and adopting_program_owner is null",
        "  )",
        "  select * from emp_activity;",
        "",
        "--",
        "-- Show me just the data changers",
        "--",
        "with emp_activity (",
        "    username, cur_auth, req_auth",
        "  ) as (",
        "    select \"CURRENT_USER\", detailed_current_authority, detailed_required_authority",
        "      from qsys2.authority_collection_object aco",
        "      where system_object_schema = 'TOYSTORE' and system_object_name = 'EMPLOYEE' and adopting_program_owner is null",
        "  )",
        "  select * from emp_activity",
        "    where  req_auth like '%UPD%' or",
        "           req_auth like '%DLT%' or",
        "           req_auth like '%ADD%';",
        "     ",
        "stop;",
        "--",
        "-- Refine the data changers query to include more data",
        "--",
        "with emp_activity (",
        "    authorization_name,",
        "    check_timestamp,",
        "    system_object_name,",
        "    system_object_schema,",
        "    system_object_type,",
        "    asp_name,",
        "    asp_number,",
        "    object_name,",
        "    object_schema,",
        "    object_type,",
        "    authorization_list,",
        "    authority_check_successful,",
        "    check_any_authority,",
        "    cached_authority,",
        "    required_authority,",
        "    detailed_required_authority,",
        "    current_authority,",
        "    detailed_current_authority,",
        "    authority_source,",
        "    group_name,",
        "    multiple_groups_used,",
        "    adopt_authority_used,",
        "    multiple_adopting_programs_used,",
        "    adopting_program_name,",
        "    adopting_program_schema,",
        "    adopting_procedure_name,",
        "    adopting_program_type,",
        "    adopting_program_asp_name,",
        "    adopting_program_asp_number,",
        "    adopting_program_statement_number,",
        "    adopting_program_owner,",
        "    current_adopted_authority,",
        "    detailed_current_adopted_authority,",
        "    adopted_authority_source,",
        "    most_recent_program_invoked,",
        "    most_recent_program_schema,",
        "    most_recent_module,",
        "    most_recent_program_procedure,",
        "    most_recent_program_type,",
        "    most_recent_program_asp_name,",
        "    most_recent_program_asp_number,",
        "    most_recent_program_statement_number,",
        "    most_recent_user_state_program_invoked,",
        "    most_recent_user_state_program_schema,",
        "    most_recent_user_state_module,",
        "    most_recent_user_state_program_procedure,",
        "    most_recent_user_state_program_type,",
        "    most_recent_user_state_program_asp_name,",
        "    most_recent_user_state_program_asp_number,",
        "    most_recent_user_state_program_statement_number,",
        "    job_name,",
        "    job_user,",
        "    job_number,",
        "    thread_id,",
        "    \"CURRENT_USER\",",
        "    object_file_id,",
        "    object_asp_name,",
        "    object_asp_number,",
        "    path_name,",
        "    path_region,",
        "    path_language,",
        "    absolute_path_indicator,",
        "    relative_directory_file_id",
        "  )",
        "  as (",
        "    select authorization_name,",
        "           check_timestamp,",
        "           system_object_name,",
        "           system_object_schema,",
        "           system_object_type,",
        "           asp_name,",
        "           asp_number,",
        "           object_name,",
        "           object_schema,",
        "           object_type,",
        "           authorization_list,",
        "           authority_check_successful,",
        "           check_any_authority,",
        "           cached_authority,",
        "           required_authority,",
        "           detailed_required_authority,",
        "           current_authority,",
        "           detailed_current_authority,",
        "           authority_source,",
        "           group_name,",
        "           multiple_groups_used,",
        "           adopt_authority_used,",
        "           multiple_adopting_programs_used,",
        "           adopting_program_name,",
        "           adopting_program_schema,",
        "           adopting_procedure_name,",
        "           adopting_program_type,",
        "           adopting_program_asp_name,",
        "           adopting_program_asp_number,",
        "           adopting_program_statement_number,",
        "           adopting_program_owner,",
        "           current_adopted_authority,",
        "           detailed_current_adopted_authority,",
        "           adopted_authority_source,",
        "           most_recent_program_invoked,",
        "           most_recent_program_schema,",
        "           most_recent_module,",
        "           most_recent_program_procedure,",
        "           most_recent_program_type,",
        "           most_recent_program_asp_name,",
        "           most_recent_program_asp_number,",
        "           most_recent_program_statement_number,",
        "           most_recent_user_state_program_invoked,",
        "           most_recent_user_state_program_schema,",
        "           most_recent_user_state_module,",
        "           most_recent_user_state_program_procedure,",
        "           most_recent_user_state_program_type,",
        "           most_recent_user_state_program_asp_name,",
        "           most_recent_user_state_program_asp_number,",
        "           most_recent_user_state_program_statement_number,",
        "           job_name,",
        "           job_user,",
        "           job_number,",
        "           thread_id,",
        "           \"CURRENT_USER\",",
        "           object_file_id,",
        "           object_asp_name,",
        "           object_asp_number,",
        "           path_name,",
        "           path_region,",
        "           path_language,",
        "           absolute_path_indicator,",
        "           relative_directory_file_id",
        "      from qsys2.authority_collection_object aco",
        "      where system_object_schema = 'TOYSTORE' and system_object_name = 'EMPLOYEE' and",
        "            adopting_program_owner is null",
        "  )",
        "  select *",
        "    from emp_activity",
        "    where detailed_required_authority like '%UPD%' or detailed_required_authority like",
        "            '%DLT%' or detailed_required_authority like '%ADD%';",
        "     "
      ]
    },
    {
      "name": "Security - Object Ownership",
      "content": [
        "--  minvrm:  v7r3m0",
        "",
        "with qsysobjs (lib, obj, type) as (",
        "    select object_library, object_name, object_type",
        "      from table (qsys2.object_ownership('SCOTTF'))",
        "      where path_name is null",
        "  )",
        "  select q.*, z.*",
        "    from qsysobjs q, lateral (",
        "           select objcreated, last_used_timestamp, objsize",
        "             from table (qsys2.object_statistics(lib, type, obj))",
        "         ) z",
        "  order by OBJSIZE DESC;"
      ]
    },
    {
      "name": "Security - QSYS objects owned by the #1 storage consumer",
      "content": [
        "--  minvrm:  v7r3m0",
        "",
        "with top_dog (username, storage) as (",
        "       select authorization_name, sum(storage_used)",
        "         from qsys2.user_storage",
        "         where authorization_name not like 'Q%'",
        "         group by authorization_name",
        "         order by 2 desc",
        "         limit 1),",
        "     qsysobjs (lib, obj, type) as (",
        "       select object_library, object_name, object_type",
        "         from top_dog, table (",
        "                qsys2.object_ownership(username)",
        "              )",
        "         where path_name is null",
        "     )",
        "  select username, q.*, z.*",
        "    from top_dog, qsysobjs q, lateral (",
        "           select objcreated, last_used_timestamp, objsize",
        "             from table (",
        "                 qsys2.object_statistics(lib, type, obj)",
        "               )",
        "         ) z",
        "    order by objsize desc;",
        "  "
      ]
    },
    {
      "name": "Security - Certificate attribute analysis",
      "content": [
        "--  minvrm:  v7r3m0",
        "",
        "-- Use a global variable to avoid having source code include password values",
        "create or replace variable coolstuff.system_cert_pw varchar(30);",
        "set coolstuff.system_cert_pw = 'PWDVALUE1234567';",
        "",
        "select *",
        "  from table (",
        "      qsys2.certificate_info(certificate_store_password => coolstuff.system_cert_pw)",
        "    )",
        "  where validity_end < current date + 1 month;"
      ]
    },
    {
      "name": "Security - Dashboard",
      "content": [
        "--  minvrm:  v7r3m0",
        "",
        "--",
        "-- How is my IBM i Security configured?",
        "--",
        "select *",
        "  from qsys2.security_info;"
      ]
    },
    {
      "name": "Security - Certificate attribute analysis",
      "content": [
        "--  minvrm:  v7r3m0",
        "",
        "--",
        "--  Review the certificate store detail using the stashed password file",
        "--  Find the certificates that are no longer valid, or that become invalid within a month",
        "--",
        "select *",
        "  from table (",
        "      qsys2.certificate_info(certificate_store_password => '*NOPWD')",
        "    )",
        "  where validity_end < current date + 1 month",
        "  order by validity_end;"
      ]
    },
    {
      "name": "Security - User Info Basic (faster than User Info)",
      "content": [
        "--  minvrm:  v7r3m0",
        "",
        "--",
        "-- Review all user profiles that have an expired password",
        "--",
        "select *",
        "  from QSYS2.USER_INFO_BASIC",
        "  where DAYS_UNTIL_PASSWORD_EXPIRES = 0",
        "  order by coalesce(PREVIOUS_SIGNON, current timestamp - 100 years) asc;"
      ]
    },
    {
      "name": "IFS -  Which jobs hold a lock on a specific IFS stream file?",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "-- ",
        "select i.*",
        "  from table (",
        "      qsys2.ifs_object_lock_info(",
        "        path_name => '/usr/local/guardium/guard_tap.ini')",
        "    ) i;",
        "    "
      ]
    },
    {
      "name": "IFS -  What IFS files are in use by a specific job?",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "select j.*",
        "  from table (",
        "      qsys2.ifs_job_info(",
        "        '432732/SCOTTF/QPADEV000F')",
        "    ) j;"
      ]
    },
    {
      "name": "IFS - Summarize the current usage for an IFS stream file",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "-- ",
        "select r.*",
        "  from table (",
        "      qsys2.ifs_object_references_info(",
        "        path_name => '/usr/local/guardium/guard_tap.ini')",
        "    ) r;",
        "    "
      ]
    },
    {
      "name": "IFS -  Non-QSYS, IFS directory data size probe",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "",
        "-- Note... if not already enrolled, add this...",
        "cl:ADDDIRE USRID(<user-profile> RST) USRD('Your name') USER(<user-profile>);",
        " ",
        "stop;",
        "select path_name, object_type, data_size, object_owner, create_timestamp, access_timestamp,",
        "       data_change_timestamp, object_change_timestamp",
        "  from table (",
        "      qsys2.ifs_object_statistics(",
        "        start_path_name => '/', ",
        "        subtree_directories => 'YES', ",
        "        object_type_list => '*ALLDIR *NOQSYS'))",
        "   where  data_size is not null and object_owner not in ('QSYS')                    ",
        "   order by 3 desc",
        "   limit 10;"
      ]
    },
    {
      "name": "IFS -  10 largest files under a subdir and tree",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "select path_name, object_type, data_size, object_owner",
        "  from table(qsys2.IFS_OBJECT_STATISTICS( ",
        "                   start_path_name => '/usr',",
        "                   subtree_directories => 'YES'))",
        "   order by 3 desc",
        "   limit 10;"
      ]
    },
    {
      "name": "IFS -  IFS storage consumed for a specific user",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "with ifsobjs (path, type) as (",
        "  select path_name, object_type",
        "    from table(qsys2.object_ownership('SCOTTF')) a",
        "      where path_name is not null",
        ")",
        "select i.*, data_size, z.*",
        "  from ifsobjs i, lateral (",
        "    select * from ",
        "      table(qsys2.ifs_object_statistics(",
        "              start_path_name => path, ",
        "              subtree_directories => 'NO'))) z",
        "order by data_size desc;"
      ]
    },
    {
      "name": "IFS - How *PUBLIC is configured for IFS objects I own",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "with ifsobjs (path) as (",
        "    select path_name",
        "      from table (",
        "          qsys2.object_ownership(session_user)",
        "        )",
        "      where path_name is not null",
        "  )",
        "  select z.*",
        "    from ifsobjs i, lateral (",
        "           select *",
        "             from table (",
        "                 qsys2.ifs_object_privileges(path_name => path)",
        "               )",
        "         ) z",
        "    where authorization_name = '*PUBLIC'",
        "    order by data_authority;"
      ]
    },
    {
      "name": "IFS - Reading a stream file",
      "content": [
        "--  minvrm: V7R3M0",
        "",
        "-- Read an IFS stream using character data ",
        "--",
        "select line_number, line",
        "  from table (",
        "      qsys2.ifs_read(",
        "        path_name => '/usr/local/install.log', ",
        "        end_of_line => 'ANY',",
        "        maximum_line_length => default, ",
        "        ignore_errors => 'NO')",
        "    );  "
      ]
    },
    {
      "name": "IFS - Writing to a stream file",
      "content": [
        "--  minvrm: V7R3M0",
        "",
        "-- ",
        "-- Find all the library names and write them to an IFS file",
        "--",
        "begin",
        "  -- Make sure output file is empty to start",
        "  call qsys2.ifs_write(",
        "    path_name => '/tmp/library_names',",
        "    line => '',",
        "    overwrite => 'REPLACE',",
        "    end_of_line => 'NONE'",
        "  );",
        "  -- Add lines to the output file",
        "  for select objname as libname",
        "    from table (",
        "        qsys2.object_statistics('*ALLSIMPLE', 'LIB')",
        "      )",
        "    do",
        "      call qsys2.ifs_write(",
        "        path_name => '/tmp/library_names',",
        "        line => libname",
        "      );",
        "  end for;",
        "end;",
        "",
        "select *",
        "  from table (",
        "      qsys2.ifs_read('/tmp/library_names')",
        "    );",
        "stop;",
        ""
      ]
    },
    {
      "name": "IFS - Server share info",
      "content": [
        "--  minvrm: V7R3M0",
        "",
        "--",
        "-- IBM� i NetServer shares - IFS stream files being shared",
        "--",
        "select server_share_name, path_name, permissions ",
        "  from qsys2.server_share_info",
        "  where share_type = 'FILE';"
      ]
    },
    {
      "name": "IFS - Server share info with security details",
      "content": [
        "--  minvrm: V7R3M0",
        "",
        "--",
        "-- IBM� i NetServer shares - IFS stream files security",
        "--",
        "with shares (name, pn, perm) as (",
        "    select server_share_name, path_name, permissions",
        "      from qsys2.server_share_info",
        "      where share_type = 'FILE'",
        "  )",
        "  select name, pn, perm, authorization_name as username,",
        "         data_authority as actual_data_authority",
        "    from shares, lateral (",
        "           select *",
        "             from table (",
        "                 qsys2.ifs_object_privileges(path_name => pn)",
        "               )",
        "         );"
      ]
    },
    {
      "name": "Work Management - Object lock info",
      "content": [
        "--",
        "-- Review detail about all object lock holders over TOYSTORE/EMPLOYEE *FILE",
        "--",
        "WITH LOCK_CONFLICT_TABLE (object_name, lock_state, q_job_name) AS (",
        "SELECT object_name, lock_state, job_name",
        "FROM QSYS2.OBJECT_LOCK_INFO where ",
        " object_schema = 'TOYSTORE' and ",
        " object_name = 'EMPLOYEE'",
        ") SELECT object_name, lock_state, q_job_name, V_SQL_STATEMENT_TEXT, V_CLIENT_IP_ADDRESS, ",
        "   B.* FROM LOCK_CONFLICT_TABLE, ",
        "TABLE(QSYS2.GET_JOB_INFO(q_job_name)) B;"
      ]
    },
    {
      "name": "Work Management - Record lock info",
      "content": [
        "--",
        "-- Review detail about all record locks held over TOYSTORE/EMPLOYEE *FILE",
        "--",
        "WITH LOCK_CONFLICT_TABLE (",
        "  table_name, lock_state, rrn, q_job_name) AS (",
        "SELECT table_name, lock_state, rrn, job_name",
        "FROM QSYS2.RECORD_LOCK_INFO where ",
        "  table_schema = 'TOYSTORE' and ",
        "  table_name = 'EMPLOYEE'",
        ") SELECT table_name, lock_state, rrn, ",
        "         q_job_name, V_SQL_STATEMENT_TEXT, ",
        "         V_CLIENT_IP_ADDRESS, ",
        "         B.* FROM LOCK_CONFLICT_TABLE, ",
        "TABLE(QSYS2.GET_JOB_INFO(q_job_name)) B;",
        ""
      ]
    },
    {
      "name": "Work Management - SET_SERVER_SBS_ROUTING and ad hoc users",
      "content": [
        "--",
        "-- Construct a subsystem that will constrain the amount of system resources",
        "-- available to users who are known to execute ad hoc queries.",
        "--",
        "CL: CRTSBSD SBSD(QGPL/ADHOCSBS) POOLS((1 *BASE)) TEXT('Ad hoc users SBS');",
        "CL: CRTJOBQ QGPL/ADHOCJOBQ TEXT('Ad hoc users job queue');",
        "CL: ADDJOBQE SBSD(QGPL/ADHOCSBS) JOBQ(QGPL/ADHOCJOBQ) MAXACT(100) SEQNBR(40);",
        "CL: CRTCLS CLS(QGPL/ADHOCCLS) RUNPTY(55) TIMESLICE(100) TEXT('Ad hoc class');",
        "CL: ADDPJE SBSD(QGPL/ADHOCSBS) PGM(QSYS/QRWTSRVR) JOBD(QGPL/QDFTSVR) \tCLS(QGPL/ADHOCCLS);",
        "CL: ADDPJE SBSD(QGPL/ADHOCSBS) PGM(QSYS/QZDASOINIT) JOBD(QGPL/QDFTSVR) \tCLS(QGPL/ADHOCCLS);",
        "CL: STRSBS SBSD(QGPL/ADHOCSBS);",
        "--",
        "-- Relocate SCOTT's server jobs to the ADHOCSBS",
        "--",
        "CALL QSYS2.SET_SERVER_SBS_ROUTING('SCOTT','*ALL','ADHOCSBS');",
        "",
        "--",
        "-- Review existing configurations for users and groups",
        "--",
        "SELECT * FROM QSYS2.SERVER_SBS_ROUTING;"
      ]
    },
    {
      "name": "Work Management - Scheduled Job Info",
      "content": [
        "--",
        "-- Example: Review the job scheduled entries which are no longer in effect, either because they ",
        "-- were explicitly held or because they were scheduled to run a single time and the date has ",
        "-- passed.",
        "--",
        "SELECT * FROM QSYS2.SCHEDULED_JOB_INFO  WHERE STATUS IN ('HELD', 'SAVED') ORDER BY SCHEDULED_BY;"
      ]
    },
    {
      "name": "Work Management - System Status",
      "content": [
        "--",
        "-- Return storage and CPU status for the partition. ",
        "-- Specify to reset all the elapsed values to 0.",
        "--",
        "SELECT * FROM TABLE(QSYS2.SYSTEM_STATUS(RESET_STATISTICS=>'YES')) X;",
        "",
        "-- deleay 60 seconds",
        "cl: dllyjob dly(60);",
        "",
        "--",
        "-- Repeat the query, observing the elapsed detail",
        "-- ",
        "SELECT elapsed_time, elapsed_cpu_used, elapsed_cpu_shared,",
        "   elapsed_cpu_uncapped_capacity, total_jobs_in_system, maximum_jobs_in_system,",
        "   active_jobs_in_system, interactive_jobs_in_system, configured_cpus,",
        "   cpu_sharing_attribute, current_cpu_capacity, average_cpu_rate,",
        "   average_cpu_utilization, minimum_cpu_utilization, maximum_cpu_utilization,",
        "   sql_cpu_utilization, main_storage_size, system_asp_storage, total_auxiliary_storage,",
        "   system_asp_used, current_temporary_storage, maximum_temporary_storage_used,",
        "   permanent_address_rate, temporary_address_rate, temporary_256mb_segments,",
        "   temporary_4gb_segments, permanent_256mb_segments, permanent_4gb_segments, host_name",
        "   FROM TABLE(qsys2.system_status()) x;"
      ]
    },
    {
      "name": "Work Management - System Status",
      "content": [
        "--",
        "-- Review the ASP consumption vs limit",
        "--",
        "with sysval(low_limit) as (",
        "select current_numeric_value/10000.0 as QSTGLOWLMT",
        "  from qsys2.system_value_info",
        "  where system_value_name = 'QSTGLOWLMT'",
        ")",
        "select SYSTEM_ASP_USED, ",
        "       DEC((100.00 - low_limit),4,2) as SYSTEM_ASP_LIMIT ",
        "from sysval, qsys2.SYSTEM_STATUS_INFO ;",
        "   "
      ]
    },
    {
      "name": "Work Management - System Values",
      "content": [
        "-- Note: replace REMOTEPART with the name of the remote partition",
        "--       (WRKRDBDIRE or QSYS2.SYSCATALOGS)",
        "",
        "-- Compare System Values across two partitions ",
        " DECLARE GLOBAL TEMPORARY TABLE SESSION.Remote_System_Values ",
        " ( SYSTEM_VALUE_NAME,CURRENT_NUMERIC_VALUE,CURRENT_CHARACTER_VALUE ) ",
        " AS (SELECT * FROM REMOTEPART.QSYS2.SYSTEM_VALUE_INFO) WITH DATA ",
        " WITH REPLACE; ",
        "",
        "-- Use exception join to reveal any differences ",
        "  SELECT 'REMOTEPART' AS \"System Name\", A.SYSTEM_VALUE_NAME, ",
        "  A.CURRENT_NUMERIC_VALUE,A.CURRENT_CHARACTER_VALUE FROM QSYS2.SYSTEM_VALUE_INFO A ",
        " LEFT EXCEPTION JOIN SESSION.Remote_System_Values B ",
        " ON A.SYSTEM_VALUE_NAME = B.SYSTEM_VALUE_NAME AND ",
        "    A.CURRENT_NUMERIC_VALUE IS NOT DISTINCT FROM B.CURRENT_NUMERIC_VALUE AND ",
        "    A.CURRENT_CHARACTER_VALUE IS NOT DISTINCT FROM B.CURRENT_CHARACTER_VALUE ",
        " UNION ALL ",
        "  SELECT 'LOCALPART' AS \"System Name\", B.SYSTEM_VALUE_NAME, ",
        "  B.CURRENT_NUMERIC_VALUE, ",
        "  B.CURRENT_CHARACTER_VALUE FROM QSYS2.SYSTEM_VALUE_INFO A ",
        " RIGHT EXCEPTION JOIN SESSION.Remote_System_Values B ",
        " ON A.SYSTEM_VALUE_NAME = B.SYSTEM_VALUE_NAME AND ",
        "    A.CURRENT_NUMERIC_VALUE IS NOT DISTINCT FROM B.CURRENT_NUMERIC_VALUE AND ",
        "    A.CURRENT_CHARACTER_VALUE IS NOT DISTINCT FROM B.CURRENT_CHARACTER_VALUE ",
        " ORDER BY SYSTEM_VALUE_NAME;"
      ]
    },
    {
      "name": "Work Management - System Status",
      "content": [
        "--",
        "-- Review the ASP consumption vs limit",
        "--",
        "with sysval(low_limit) as (",
        "select current_numeric_value/10000.0 as QSTGLOWLMT",
        "  from qsys2.system_value_info",
        "  where system_value_name = 'QSTGLOWLMT'",
        ")",
        "select SYSTEM_ASP_USED, ",
        "       DEC((100.00 - low_limit),4,2) as SYSTEM_ASP_LIMIT ",
        "from sysval, qsys2.SYSTEM_STATUS_INFO ;",
        "   "
      ]
    },
    {
      "name": "Work Management - Active Job info - Longest running SQL statements",
      "content": [
        "--",
        "-- Find the jobs with SQL statements executing and order the results by duration of SQL statement execution",
        "--",
        "WITH ACTIVE_USER_JOBS (Q_JOB_NAME, AUTHORIZATION_NAME, CPU_TIME, RUN_PRIORITY) AS ( ",
        "SELECT JOB_NAME, AUTHORIZATION_NAME, CPU_TIME, RUN_PRIORITY FROM TABLE (ACTIVE_JOB_INFO('NO','','','')) x ",
        "WHERE JOB_TYPE <> 'SYS' ",
        ") SELECT Q_JOB_NAME, AUTHORIZATION_NAME, CPU_TIME, RUN_PRIORITY, V_SQL_STATEMENT_TEXT, ",
        "ABS( CURRENT TIMESTAMP - V_SQL_STMT_START_TIMESTAMP )  AS SQL_STMT_DURATION, B.* ",
        "FROM ACTIVE_USER_JOBS, TABLE(QSYS2.GET_JOB_INFO(Q_JOB_NAME)) B ",
        "WHERE V_SQL_STMT_STATUS = 'ACTIVE'   ",
        "ORDER BY SQL_STMT_DURATION DESC ; "
      ]
    },
    {
      "name": "Work Management - Active Job info - Longest active DRDA connections",
      "content": [
        "--",
        "-- Find the active DRDA jobs and compute the connection duration",
        "--",
        "WITH ACTIVE_USER_JOBS (Q_JOB_NAME,  CPU_TIME, RUN_PRIORITY) AS ( ",
        "SELECT JOB_NAME, CPU_TIME, RUN_PRIORITY FROM TABLE (ACTIVE_JOB_INFO('NO','','QRWTSRVR','')) x ",
        "WHERE JOB_STATUS <> 'PSRW'",
        ") SELECT Q_JOB_NAME, ",
        "ABS( CURRENT TIMESTAMP - MESSAGE_TIMESTAMP ) AS CONNECTION_DURATION, CPU_TIME, RUN_PRIORITY, B.* ",
        "FROM ACTIVE_USER_JOBS, TABLE(QSYS2.JOBLOG_INFO(Q_JOB_NAME)) B ",
        "WHERE MESSAGE_ID = 'CPI3E01'   ",
        "ORDER BY CONNECTION_DURATION DESC ; "
      ]
    },
    {
      "name": "Work Management - Active Job info - SQL Server Mode study",
      "content": [
        "--",
        "-- Find active QSQSRVR jobs and the owning application job",
        "--",
        "WITH tt (authorization_name, job_name, cpu_time, total_disk_io_count)",
        "AS (",
        "select authorization_name, job_name, cpu_time, total_disk_io_count from",
        "table(qsys2.active_job_info(",
        "SUBSYSTEM_LIST_FILTER=>'QSYSWRK',",
        "JOB_NAME_FILTER=>'QSQSRVR')) x",
        ")",
        "select authorization_name, ss.message_text, job_name, cpu_time,",
        "total_disk_io_count",
        "from tt, table(qsys2.joblog_info(job_name)) ss where message_id = 'CPF9898' and",
        "from_program = 'QSQSRVR'",
        "ORDER BY CPU_TIME DESC;"
      ]
    },
    {
      "name": "Work Management - Interactive jobs",
      "content": [
        "--",
        "-- Find all interactive jobs ",
        "--",
        "SELECT * FROM TABLE(QSYS2.JOB_INFO(JOB_TYPE_FILTER => '*INTERACT')) X;"
      ]
    },
    {
      "name": "Work Management - Jobs that are waiting to run",
      "content": [
        "--",
        "-- Find jobs sitting on a job queue, waiting to run",
        "--",
        "SELECT * FROM TABLE(QSYS2.JOB_INFO(JOB_STATUS_FILTER    => '*JOBQ')) X;"
      ]
    },
    {
      "name": "Work Management - Job Queues",
      "content": [
        "--",
        "-- Review the job queues with the most pending jobs",
        "--",
        "SELECT * FROM qsys2.job_queue_info",
        " ORDER BY NUMBER_OF_JOBS DESC",
        " LIMIT 10;"
      ]
    },
    {
      "name": "Work Management - Active Job Info - QTEMP consumption",
      "content": [
        "--",
        "-- description: Identify Host Server jobs currently using >10 Meg of QTEMP",
        "--",
        "SELECT qtemp_size, job_name,",
        "   internal_job_id, subsystem, subsystem_library_name, authorization_name, job_type,",
        "   function_type, \"FUNCTION\", job_status, memory_pool, run_priority, thread_count,",
        "   temporary_storage, cpu_time, total_disk_io_count, elapsed_interaction_count,",
        "   elapsed_total_response_time, elapsed_total_disk_io_count,",
        "   elapsed_async_disk_io_count, elapsed_sync_disk_io_count, elapsed_cpu_percentage,",
        "   elapsed_cpu_time, elapsed_page_fault_count, job_end_reason, server_type, elapsed_time",
        "FROM TABLE(qsys2.active_job_info(",
        "  subsystem_list_filter => 'QUSRWRK', ",
        "  job_name_filter       => 'QZDASOINIT', ",
        "  detailed_info         => 'QTEMP'))",
        "WHERE qtemp_size > 10; "
      ]
    },
    {
      "name": "Work Management - Active Job Info - Largest Query",
      "content": [
        "--",
        "-- description: Find the 10 QZDASOINIT jobs that have executed the most expensive (by storage) queries",
        "--",
        "SELECT JOB_NAME, LARGEST_QUERY_SIZE, J.*",
        "FROM TABLE(QSYS2.ACTIVE_JOB_INFO(",
        "  subsystem_list_filter => 'QUSRWRK', ",
        "  job_name_filter       => 'QZDASOINIT', ",
        "  detailed_info         => 'ALL')) J",
        "ORDER BY LARGEST_QUERY_SIZE DESC",
        "LIMIT 10;",
        "",
        ""
      ]
    },
    {
      "name": "Work Management - Active Job Info - Lock contention",
      "content": [
        "--",
        "-- description: Find the jobs that are encountering the most lock contention",
        "--",
        "SELECT JOB_NAME, DATABASE_LOCK_WAITS, NON_DATABASE_LOCK_WAITS, ",
        "       DATABASE_LOCK_WAITS + NON_DATABASE_LOCK_WAITS as Total_Lock_Waits, J.*",
        "FROM TABLE (QSYS2.ACTIVE_JOB_INFO(DETAILED_INFO => 'ALL')) J",
        "ORDER BY 4 DESC",
        "LIMIT 20;"
      ]
    },
    {
      "name": "Work Management - Active Job Info - Long running SQL statements",
      "content": [
        "--",
        "-- description: Look for long-running SQL statements for a subset of users",
        "--",
        "SELECT JOB_NAME, authorization_name as \"User\", ",
        "  TIMESTAMPDIFF(2, CAST(CURRENT TIMESTAMP - SQL_STATEMENT_START_TIMESTAMP AS CHAR(22))) AS execution_seconds,",
        "  TIMESTAMPDIFF(4, CAST(CURRENT TIMESTAMP - SQL_STATEMENT_START_TIMESTAMP AS CHAR(22))) AS execution_minutes,",
        "  TIMESTAMPDIFF(8, CAST(CURRENT TIMESTAMP - SQL_STATEMENT_START_TIMESTAMP AS CHAR(22))) AS execution_hours,",
        "  SQL_STATEMENT_TEXT, J.*      ",
        "FROM TABLE(QSYS2.ACTIVE_JOB_INFO(",
        "             CURRENT_USER_LIST_FILTER => 'SCOTTF,SLROMANO,JELSBURY',",
        "             DETAILED_INFO            => 'ALL')) J",
        "WHERE SQL_STATEMENT_STATUS = 'ACTIVE'  ",
        "ORDER BY 2 DESC",
        "LIMIT 30;",
        " "
      ]
    },
    {
      "name": "Work Management - Active Job Info - Temp storage top consumers",
      "content": [
        "--",
        "-- description: Find active jobs using the most temporary storage. ",
        "--",
        "SELECT JOB_NAME, AUTHORIZATION_NAME, TEMPORARY_STORAGE, SQL_STATEMENT_TEXT, J.*",
        "  FROM TABLE (QSYS2.ACTIVE_JOB_INFO(DETAILED_INFO => 'ALL')) J",
        "   WHERE JOB_TYPE <> 'SYS' ORDER BY TEMPORARY_STORAGE DESC ;"
      ]
    },
    {
      "name": "Work Management - Job Description Initial Library List",
      "content": [
        "--",
        "-- If we plan to delete a library, use SQL to determine whether any job descriptions ",
        "-- include that library name in its INLLIBL.",
        "",
        "-- Examine the library lists for every job description.",
        "-- Since the library list column returns a character string containing a list of libraries,",
        "-- to see the individual library names it needs to be broken apart. ",
        "-- To do this, you can create a table function that takes the library list string and returns a list of library names.",
        "",
        "CREATE OR REPLACE FUNCTION systools.get_lib_names (",
        "         jobd_libl VARCHAR(2750),",
        "         jobd_libl_cnt INT",
        "      )",
        "   RETURNS TABLE (",
        "      libl_position INT, library_name VARCHAR(10)",
        "   )",
        "   BEGIN",
        "      DECLARE in_pos INT;",
        "      DECLARE lib_cnt INT;",
        "      SET in_pos = 1;",
        "      SET lib_cnt = 1;",
        "      WHILE lib_cnt <= jobd_libl_cnt DO",
        "         PIPE (",
        "            lib_cnt,",
        "            RTRIM((SUBSTR(jobd_libl, in_pos, 10)))",
        "         );",
        "         SET in_pos = in_pos + 11;",
        "         SET lib_cnt = lib_cnt + 1;",
        "      END WHILE;",
        "      RETURN;",
        "   END;",
        " ",
        "--",
        "-- Use the function to interrogate the use of libraries in jobd's libl",
        "--",
        "SELECT job_description,",
        "       job_description_library,",
        "       libl_position,",
        "       library_name",
        "   FROM qsys2.job_description_info,",
        "        TABLE (",
        "           systools.get_lib_names(library_list, library_list_count)",
        "        ) x",
        "   WHERE library_name = 'QGPL';",
        "                             "
      ]
    },
    {
      "name": "Work Management - QSYSWRK subsystem autostart jobs",
      "content": [
        "select autostart_job_name, job_description_library, job_description",
        "  from qsys2.autostart_job_info",
        "  where subsystem_description_library = 'QSYS'",
        "        and subsystem_description = 'QSYSWRK'",
        "  order by 1, 2, 3;"
      ]
    },
    {
      "name": "Work Management - Locks held by the current job",
      "content": [
        "select *",
        "  from table (",
        "      qsys2.job_lock_info(job_name => '*')",
        "    )",
        "  order by object_library, object_name, object_type;",
        "                             "
      ]
    },
    {
      "name": "Work Management - QUSRWRK prestart jobs configured with limited reuse",
      "content": [
        "select maximum_uses, pj.*",
        "  from qsys2.prestart_job_info pj",
        "  where subsystem_description_library = 'QSYS'",
        "        and subsystem_description = 'QUSRWRK'",
        "        and pj.maximum_uses <> -1",
        "  order by 1;",
        "                             "
      ]
    },
    {
      "name": "Work Management - Prestart job statistical review",
      "content": [
        "-- Review the prestart job statistics for all active prestart jobs",
        "with pjs (sbslib, sbs, pgmlib, pgm, pj) as (",
        "       -- active subsystems that have prestart jobs",
        "       select subsystem_description_library, subsystem_description,",
        "              prestart_job_program_library, prestart_job_program, prestart_job_name",
        "         from qsys2.prestart_job_info",
        "         where active = 'YES'",
        "     ),",
        "     active_pjs (sbslib, sbs, pgmlib, pgm, pj) as (",
        "       -- active pjs",
        "       select distinct sbslib, sbs, pgmlib, pgm, pj",
        "         from pjs,",
        "              lateral (",
        "                select *",
        "                  from table (",
        "                      qsys2.job_info(",
        "                        job_status_filter => '*ACTIVE', job_subsystem_filter => sbs,",
        "                        job_user_filter => '*ALL')",
        "                    )",
        "                  where job_type_enhanced = 'PRESTART_BATCH'",
        "                        and trim(",
        "                          substr(job_name, locate_in_string(job_name, '/', 1, 2) + 1, 10))",
        "                        = pj",
        "              ) xpj",
        "     )",
        "  -- active pjs and statistics",
        "  select sbslib, sbs, pgmlib, pgm, pj, stat.*",
        "    from active_pjs, lateral (",
        "           select *",
        "             from table (",
        "                 qsys2.prestart_job_statistics(sbs, pgmlib, pgm)",
        "               )",
        "         ) as stat",
        "    order by 1, 2, 3;",
        "         ",
        ";",
        "     "
      ]
    },
    {
      "name": "Work Management - QBATCH routing entries",
      "content": [
        "select sequence_number, program_library, program_name, class_library, class_name,",
        "       comparison_data, comparison_start",
        "  from qsys2.routing_entry_info",
        "  where subsystem_description_library = 'QSYS'",
        "        and subsystem_description = 'QBATCH'",
        "  order by sequence_number;"
      ]
    },
    {
      "name": "Work Management - Active Subsystem detail",
      "content": [
        "select subsystem_description_library, subsystem_description, maximum_active_jobs,",
        "       current_active_jobs, subsystem_monitor_job, text_description,",
        "       controlling_subsystem, workload_group, signon_device_file_library,",
        "       signon_device_file, secondary_language_library, iasp_name",
        "  from qsys2.subsystem_info",
        "  where status = 'ACTIVE'",
        "  order by current_active_jobs desc;"
      ]
    },
    {
      "name": "Work Management - Subsystem pool detail",
      "content": [
        "select subsystem_description_library, subsystem_description, pool_id, pool_name,",
        "       maximum_active_jobs, pool_size",
        "  from qsys2.subsystem_pool_info",
        "  order by pool_id, pool_size desc;"
      ]
    },
    {
      "name": "Work Management - Subsystem workstation configuration",
      "content": [
        "select subsystem_description_library, subsystem_description, workstation_name,",
        "       workstation_type, job_description_library, job_description, allocation,",
        "       maximum_active_jobs, subsystem_description, workstation_type,",
        "       job_description_library, job_description, allocation, maximum_active_jobs",
        "  from qsys2.workstation_info",
        "  order by subsystem_description_library, subsystem_description;"
      ]
    },
    {
      "name": "Work Management - Communications Entry Info",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "",
        "-- List all the communications entries defined for the QCMN subsystem",
        "select *",
        "  from qsys2.communications_entry_info",
        "  where subsystem_description_library = 'QSYS' and",
        "        subsystem_description = 'QCMN';"
      ]
    },
    {
      "name": "Work Management - Open Files",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "",
        "--",
        "-- Examine the open files in jobs that have pending database changes",
        "--",
        "select job_name, commitment_definition, state_timestamp,o.*",
        "  from qsys2.db_transaction_info d, lateral (",
        "         select *",
        "           from table (",
        "               qsys2.open_files(d.job_name)",
        "             )",
        "       ) o",
        "  where (local_record_changes_pending = 'YES' or",
        "         local_object_changes_pending = 'YES') and",
        "        o.library_name not in ('QSYS', 'QSYS2', 'SYSIBM'); ",
        "        "
      ]
    },
    {
      "name": "Work Management - System Status Info Basic",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "",
        "--",
        "-- Review the ASP consumption vs limit",
        "--",
        "with sysval (low_limit) as (",
        "       select current_numeric_value / 10000.0",
        "         from qsys2.system_value_info",
        "         where system_value_name = 'QSTGLOWLMT'",
        "     ),",
        "     sysval2 (low_limit_action) as (",
        "       select current_character_value",
        "         from qsys2.system_value_info",
        "         where system_value_name = 'QSTGLOWACN'",
        "     )",
        "  select system_asp_used, ",
        "         dec((100.00 - low_limit), 4, 2) as system_asp_limit, ",
        "         low_limit,",
        "         low_limit_action",
        "    from sysval, sysval2, qsys2.system_status_info_basic;"
      ]
    },
    {
      "name": "Work Management - Workload Group Info",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "",
        "--",
        "-- Review the configured workload groups",
        "--",
        "select *",
        "  from QSYS2.WORKLOAD_GROUP_INFO;",
        "",
        "--",
        "-- Review active jobs, that utilize a workload group",
        "--",
        "select w.*, b.*",
        "  from QSYS2.WORKLOAD_GROUP_INFO w, lateral (",
        "         select a.*",
        "           from table (",
        "               qsys2.active_job_info(DETAILED_INFO => 'ALL')",
        "             ) a",
        "           where WORKLOAD_GROUP = w.workload_group",
        "       ) b;"
      ]
    },
    {
      "name": "IBM PowerHA SystemMirror for i - Monitored Resources Requiring Attention",
      "content": [
        "--  minvrm: V7R2M0",
        "",
        "--",
        "-- A list of monitored resources that are either failed or inconsistent along with additional node level information",
        "--",
        "select details.monitored_resource, details.resource_type, details.library,",
        "       details.global_status, details.node, details.local_status, details.message_id,",
        "       details.message_text",
        "  from table (",
        "         qhasm.admin_domain_mre_list()",
        "       ) list, table (",
        "         qhasm.admin_domain_mre_details(",
        "           monitored_resource => list.monitored_resource,",
        "           resource_type => list.resource_type, library => list.library)",
        "       ) details",
        "  where (list.global_status = '*INCONSISTENT' or",
        "          list.global_status = '*FAILED') and",
        "        details.local_status != 'CURRENT';"
      ]
    },
    {
      "name": "IBM PowerHA SystemMirror for i - Unmonitored Resources",
      "content": [
        "--  minvrm: V7R2M0",
        "",
        "--",
        "-- Find the list of unmonitored resources in the administrative domain",
        "--",
        "select jobd.objname as \"Unmonitored Resource\", '*JOBD' as \"Resource Type\",",
        "       jobd.objlongschema as \"Resource Library\"",
        "  from table (",
        "      qsys2.object_statistics('*ALL', '*JOBD', '*ALLSIMPLE')",
        "    ) jobd",
        "  where jobd.objlongschema != 'QSYS' and",
        "        jobd.objlongschema != 'QINSYS' and",
        "        jobd.objlongschema != 'QINPRIOR' and",
        "        jobd.objlongschema != 'QINMEDIA' and",
        "        not exists (",
        "            select monitored_resource",
        "              from table (",
        "                  qhasm.admin_domain_mre_list(resource_type => '*JOBD')",
        "                ) mre",
        "              where mre.monitored_resource = jobd.objname)",
        "union",
        "select sbsd.objname as \"Unmonitored Resource\", '*SBSD' as \"Resource Type\",",
        "       sbsd.objlongschema as \"Resource Library\"",
        "  from table (",
        "      qsys2.object_statistics('*ALL', '*SBSD', '*ALLSIMPLE')",
        "    ) sbsd",
        "  where sbsd.objlongschema != 'QSYS' and",
        "        sbsd.objlongschema != 'QINSYS' and",
        "        sbsd.objlongschema != 'QINPRIOR' and",
        "        sbsd.objlongschema != 'QINMEDIA' and",
        "        not exists (",
        "            select monitored_resource",
        "              from table (",
        "                  qhasm.admin_domain_mre_list(resource_type => '*SBSD')",
        "                ) mre",
        "              where mre.monitored_resource = sbsd.objname)",
        "union",
        "select usrprf.objname as \"Unmonitored Resource\", '*USRPRF' as \"Resource Type\",",
        "       usrprf.objlongschema as \"Resource Library\"",
        "  from table (",
        "      qsys2.object_statistics('QSYS', '*USRPRF', '*ALLSIMPLE')",
        "    ) usrprf",
        "  where not exists (",
        "        select monitored_resource",
        "          from table (",
        "              qhasm.admin_domain_mre_list(resource_type => '*USRPRF')",
        "            ) mre",
        "          where mre.monitored_resource = usrprf.objname)",
        "union",
        "select autl.objname as \"Unmonitored Resource\", '*AUTL' as \"Resource Type\",",
        "       autl.objlongschema as \"Resource Library\"",
        "  from table (",
        "      qsys2.object_statistics('QSYS', '*AUTL', '*ALLSIMPLE')",
        "    ) autl",
        "  where not exists (",
        "        select monitored_resource",
        "          from table (",
        "              qhasm.admin_domain_mre_list(resource_type => '*AUTL')",
        "            ) mre",
        "          where mre.monitored_resource = autl.objname)",
        "union",
        "select cls.objname as \"Unmonitored Resource\", '*CLS' as \"Resource Type\",",
        "       cls.objlongschema as \"Resource Library\"",
        "  from table (",
        "      qsys2.object_statistics('*ALL', '*CLS', '*ALLSIMPLE')",
        "    ) cls",
        "  where cls.objlongschema != 'QSYS' and",
        "        cls.objlongschema != 'QINSYS' and",
        "        cls.objlongschema != 'QINPRIOR' and",
        "        cls.objlongschema != 'QINMEDIA' and",
        "        not exists (",
        "            select monitored_resource",
        "              from table (",
        "                  qhasm.admin_domain_mre_list(resource_type => '*CLS')",
        "                ) mre",
        "              where mre.monitored_resource = cls.objname);"
      ]
    },
    {
      "name": "IBM PowerHA SystemMirror for i - CRG and Session Switch Readiness",
      "content": [
        "--  minvrm: V7R2M0",
        "",
        "--",
        "-- Indicates if a device cluster resource group (CRG) is ready to switch with the READY_TO_SWITCH column. ",
        "-- Contains YES if ready to switch, or NO if not ready to switch.",
        "-- This also provides supporting data for why the CRG is or is not ready to switch. ",
        "-- For example, the CRG status, PowerHA Session Status, or CRG recovery domain node status",
        "--",
        "select crg.cluster_resource_group, crg.crg_status, ssn_info.session_name,",
        "       ssn_info.copy_status, rcydmn_nodes.*, (",
        "       case",
        "         when ((crg.crg_status = 'ACTIVE' or",
        "               crg.crg_status = 'EXIT POINT OPERATION PENDING') and",
        "             ssn_info.copy_status = 'ACTIVE' and",
        "             rcydmn_nodes.number_of_crg_inactive_backup_nodes = 0 and",
        "             rcydmn_nodes.number_of_crg_ineligible_backup_nodes = 0 and",
        "             rcydmn_nodes.number_of_crg_partitioned_backup_nodes = 0) then 'YES'",
        "         else 'NO'",
        "       end) as ready_to_switch",
        "  from qhasm.crg_list crg, (",
        "         select coalesce(sum(",
        "                    case node_status",
        "                      when 'INACTIVE' then 1",
        "                      else 0",
        "                    end), 0) number_of_crg_inactive_backup_nodes, coalesce(sum(",
        "                    case node_status",
        "                      when 'INELIGIBLE' then 1",
        "                      else 0",
        "                    end), 0) number_of_crg_ineligible_backup_nodes, coalesce(sum(",
        "                    case node_status",
        "                      when 'PARTITIONED' then 1",
        "                      else 0",
        "                    end), 0) number_of_crg_partitioned_backup_nodes",
        "           from qhasm.crg_list crg, table (",
        "                  qhasm.crg_recovery_domain(",
        "                    cluster_resource_group => crg.cluster_resource_group)",
        "                ) rcydmn",
        "           where rcydmn.node_status != 'ACTIVE' and",
        "                 rcydmn.current_node_role > 0",
        "       ) as rcydmn_nodes, qhasm.session_list ssn_list, table (",
        "         qhasm.session_info(session => ssn_list.session_name)",
        "       ) ssn_info",
        "  where crg.crg_type = '*DEV' and",
        "        crg.cluster_resource_group = ssn_list.cluster_resource_group; "
      ]
    },
    {
      "name": "Librarian - Examine least and most popular routines",
      "content": [
        "--",
        "-- Note: Replace library-name with the target library name",
        "-- Find unused procedures and functions",
        "--",
        "select OBJNAME,OBJTEXT,OBJCREATED,DAYS_USED_COUNT, x.* from table(qsys2.object_statistics('library-name', 'PGM SRVPGM')) x",
        "WHERE SQL_OBJECT_TYPE IN ('PROCEDURE','FUNCTION')",
        "AND LAST_USED_TIMESTAMP IS NULL OR DAYS_USED_COUNT = 0",
        "ORDER BY OBJLONGNAME ASC;",
        "",
        "-- Find the most frequently used procedures and functions",
        "--",
        "select LAST_USED_TIMESTAMP, DAYS_USED_COUNT, LAST_RESET_TIMESTAMP, x.* from table(qsys2.object_statistics('library-name', 'PGM SRVPGM')) x",
        "WHERE SQL_OBJECT_TYPE IN ('PROCEDURE','FUNCTION')",
        "AND LAST_USED_TIMESTAMP IS NOT NULL",
        "ORDER BY DAYS_USED_COUNT DESC;"
      ]
    },
    {
      "name": "Librarian - Find objects",
      "content": [
        "--",
        "-- Find user libraries that are available, return full details about the libraries",
        "--",
        "SELECT * FROM TABLE (QSYS2.OBJECT_STATISTICS('*ALLUSRAVL ', '*LIB') ) as a;",
        "",
        "--",
        "-- Super Fast retrieval of library and schema name",
        "--",
        "SELECT OBJNAME AS LIBRARY_NAME, OBJLONGNAME AS SCHEMA_NAME",
        "   FROM TABLE(QSYS2.OBJECT_STATISTICS('*ALLSIMPLE', 'LIB')) Z",
        "     ORDER BY 1 ASC;",
        "",
        "--",
        "-- Super Fast retrieval names of an object type within a library",
        "--",
        "SELECT objname",
        "   FROM TABLE(qsys2.object_statistics('TOYSTORE', '*FILE', '*ALLSIMPLE')) AS x;",
        "",
        "--",
        "-- Find Program and Service programs within a library",
        "-- Note: Replace library-name with the target library name",
        "--",
        "SELECT * FROM TABLE (QSYS2.OBJECT_STATISTICS('library-name', '*PGM *SRVPGM') ) as a;",
        ""
      ]
    },
    {
      "name": "Librarian - Library list",
      "content": [
        "--",
        "-- Description: Ensure that the TOYSTORE library is the first library ",
        "--              in the user portion of the library list ",
        " BEGIN ",
        " DECLARE V_ROW_NUM INTEGER; ",
        " WITH CTE1(SCHEMA_NAME, ROW_NUM) AS ( ",
        "   SELECT SCHEMA_NAME, ROW_NUMBER() OVER (ORDER BY ORDINAL_POSITION) AS ROW_NUM ",
        "     FROM QSYS2.LIBRARY_LIST_INFO WHERE TYPE = 'USER' ",
        " ) SELECT ROW_NUM INTO V_ROW_NUM FROM CTE1 WHERE SCHEMA_NAME = 'TOYSTORE'; ",
        " IF (V_ROW_NUM IS NULL) THEN ",
        "   CALL QSYS2.QCMDEXC('ADDLIBLE TOYSTORE'); ",
        " ELSEIF (V_ROW_NUM > 1) THEN ",
        "   BEGIN ",
        "     CALL QSYS2.QCMDEXC('RMVLIBLE TOYSTORE'); ",
        "     CALL QSYS2.QCMDEXC('ADDLIBLE TOYSTORE'); ",
        "   END; ",
        " END IF; ",
        " END;"
      ]
    },
    {
      "name": "Librarian -  Which IBM commands have had their command parameter defaults changed using CHGCMDDFT",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "select * from table(qsys2.object_statistics('QSYS', '*CMD'))",
        "  where APAR_ID = 'CHGDFT';"
      ]
    },
    {
      "name": "Librarian - Journal Inherit Rules",
      "content": [
        "--  minvrm: V7R3M0",
        "",
        "--",
        "-- Review library specific journal inheritance rules",
        "--",
        "select library_name, ",
        "       ordinal_position,  ",
        "       object_type, ",
        "       operation, ",
        "       rule_action,  ",
        "       name_filter, ",
        "       journal_images,  ",
        "       omit_journal_entry, ",
        "       remote_journal_filter ",
        "  from qsys2.journal_inherit_rules",
        "  where journaled = 'YES'",
        "  order by library_name, ordinal_position;"
      ]
    },
    {
      "name": "Librarian -  Library Info",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "",
        "create or replace variable coolstuff.library_report_stmt varchar(10000) for sbcs data default",
        "'create or replace table coolstuff.library_sizes",
        "      (library_name, schema_name, ",
        "      ",
        "       -- qsys2.library_info() columns",
        "       library_size, library_size_formatted, ",
        "       object_count, library_size_complete, library_type, text_description,",
        "       iasp_name, iasp_number, create_authority, object_audit_create, journaled,",
        "       journal_library, journal_name, inherit_journaling, journal_start_timestamp,",
        "       apply_starting_receiver_library, apply_starting_receiver,",
        "       apply_starting_receiver_asp,",
        "       ",
        "       -- qsys2.object_statistics() columns",
        "       objowner, objdefiner, objcreated, objsize, objtext, objlongname,",
        "       change_timestamp, last_used_timestamp, last_used_object, days_used_count, last_reset_timestamp,",
        "       save_timestamp, restore_timestamp, save_while_active_timestamp, ",
        "       user_changed, source_file, source_library, source_member,",
        "       source_timestamp, created_system, created_system_version, licensed_program,",
        "       licensed_program_version, compiler, compiler_version, object_control_level,",
        "       ptf_number, apar_id, user_defined_attribute, allow_change_by_program,",
        "       changed_by_program, compressed, primary_group, storage_freed,",
        "       associated_space_size, optimum_space_alignment, overflow_storage, object_domain,",
        "       object_audit, object_signed, system_trusted_source, multiple_signatures,",
        "       save_command, save_device, save_file_name, save_file_library, save_volume, save_label,",
        "       save_sequence_number, last_save_size, journal_images, omit_journal_entry, remote_journal_filter, ",
        "       authority_collection_value",
        "       )",
        "  as",
        "      (select objname as lib, objlongname as schema, library_size,",
        "              varchar_format(library_size, ''999G999G999G999G999G999G999G999G999G999'')",
        "                as formatted_size, object_count, library_size_complete, library_type, text_description,",
        "       b.iasp_name, b.iasp_number, create_authority, object_audit_create, a.journaled,",
        "       b.journal_library, b.journal_name, inherit_journaling, b.journal_start_timestamp,",
        "       b.apply_starting_receiver_library, b.apply_starting_receiver,",
        "       b.apply_starting_receiver_asp,",
        "              objowner, objdefiner, objcreated, objsize, objtext, objlongname,",
        "       change_timestamp, last_used_timestamp, last_used_object, days_used_count, last_reset_timestamp,",
        "       save_timestamp, restore_timestamp, save_while_active_timestamp, ",
        "       user_changed, source_file, source_library, source_member,",
        "       source_timestamp, created_system, created_system_version, licensed_program,",
        "       licensed_program_version, compiler, compiler_version, object_control_level,",
        "       ptf_number, apar_id, user_defined_attribute, allow_change_by_program,",
        "       changed_by_program, compressed, primary_group, storage_freed,",
        "       associated_space_size, optimum_space_alignment, overflow_storage, object_domain,",
        "       object_audit, object_signed, system_trusted_source, multiple_signatures,",
        "       save_command, save_device, save_file_name, save_file_library, save_volume, save_label,",
        "       save_sequence_number, last_save_size, journal_images, omit_journal_entry, remote_journal_filter, ",
        "       authority_collection_value",
        "          from table (",
        "                 qsys2.object_statistics(''*ALLUSR'', ''*LIB'')",
        "               ) as a, lateral (",
        "                 select *",
        "                   from table (",
        "                       qsys2.library_info(library_name => a.objname,",
        "                                          ignore_errors => ''YES'',",
        "                                          detailed_info => ''LIBRARY_SIZE'')",
        "                     )",
        "               ) b)",
        "      with data   on replace delete rows';",
        "stop;",
        "  ",
        "cl:SBMJOB CMD(RUNSQL SQL('begin execute immediate coolstuff.library_report_stmt; end') commit(*NONE)) JOB(LIBSIZES);",
        "stop;",
        "",
        "--",
        "-- jobs submitted from this job",
        "--",
        "select *",
        "  from table (",
        "      qsys2.job_info(job_submitter_filter => '*JOB', job_user_filter => '*ALL')",
        "    );",
        "",
        "-- once the job ends, it won't be returned by job_info... then you can query the results",
        "select * from coolstuff.library_sizes ls order by library_size desc;",
        " "
      ]
    },
    {
      "name": "PTF - Group PTF Currency",
      "content": [
        "--",
        "-- Derive the IBM i operating system level and then ",
        "-- determine the level of currency of PTF Groups",
        "--   ",
        "With iLevel(iVersion, iRelease) AS",
        "(",
        "select OS_VERSION, OS_RELEASE from sysibmadm.env_sys_info",
        ")",
        "  SELECT P.*",
        "     FROM iLevel, systools.group_ptf_currency P",
        "     WHERE ptf_group_release = ",
        "           'R' CONCAT iVersion CONCAT iRelease concat '0'",
        "     ORDER BY ptf_group_level_available -",
        "        ptf_group_level_installed DESC;",
        "        ",
        "--",
        "-- For those that need to use STRSQL ;-(",
        "-- ",
        "With iLevel(iVersion, iRelease) AS",
        "(",
        "select OS_VERSION, OS_RELEASE from sysibmadm.env_sys_info",
        ")",
        "SELECT VARCHAR(GRP_CRNCY,26) AS \"GRPCUR\",",
        "       GRP_ID,  VARCHAR(GRP_TITLE, 20) AS \"NAME\",",
        "       GRP_LVL, GRP_IBMLVL, GRP_LSTUPD,",
        "       GRP_RLS, GRP_SYSSTS",
        "FROM iLevel, systools.group_ptf_currency P",
        "WHERE ptf_group_release =",
        "'R' CONCAT iVersion CONCAT iRelease concat '0'",
        "ORDER BY ptf_group_level_available -",
        "ptf_group_level_installed DESC;"
      ]
    },
    {
      "name": "PTF - Firmware Currency",
      "content": [
        "--",
        "-- Compare the current Firmware against IBM's ",
        "-- Fix Level Request Tool (FLRT) to determine if the ",
        "-- firmware level is current or upgrades are available",
        "--   ",
        "SELECT * ",
        "  FROM SYSTOOLS.FIRMWARE_CURRENCY;"
      ]
    },
    {
      "name": "PTF - Group PTF Details",
      "content": [
        "--",
        "-- Review all unapplied PTFs contained within PTF Groups installed on the partition ",
        "-- against the live PTF detail available from IBM",
        "--",
        "SELECT * FROM SYSTOOLS.GROUP_PTF_DETAILS",
        "  WHERE PTF_STATUS <> 'PTF APPLIED'",
        "  ORDER BY PTF_GROUP_NAME;"
      ]
    },
    {
      "name": "PTF - Group PTF Details",
      "content": [
        "--",
        "-- Determine if this IBM i is missing any IBM i Open Source PTFs",
        "-- ",
        "SELECT *",
        "   FROM TABLE(systools.group_ptf_details('SF99225')) a",
        "     WHERE PTF_STATUS = 'PTF MISSING'; /* SF99225 == 5733OPS */"
      ]
    },
    {
      "name": "PTF - PTF information",
      "content": [
        "--",
        "-- Find which PTFs will be impacted by the next IPL.",
        "--",
        "SELECT PTF_IDENTIFIER, PTF_IPL_ACTION, A.*",
        "  FROM QSYS2.PTF_INFO A",
        "  WHERE PTF_IPL_ACTION <> 'NONE';",
        "",
        "--",
        "-- Find which PTFs are loaded but not applied",
        "--",
        "SELECT PTF_IDENTIFIER, PTF_IPL_REQUIRED, A.*",
        "  FROM QSYS2.PTF_INFO A",
        "  WHERE PTF_LOADED_STATUS = 'LOADED'",
        "  ORDER BY PTF_PRODUCT_ID;"
      ]
    },
    {
      "name": "Journal - Journaled Objects",
      "content": [
        "--  minvrm: V7R3M0",
        "",
        "--",
        "-- Which objects are journaled to this journal?",
        "--",
        "select *",
        "  from qsys2.journaled_objects",
        "  where journal_library = 'TOYSTORE' and",
        "        journal_name = 'QSQJRN';",
        "        "
      ]
    },
    {
      "name": "Journal - Journal Info",
      "content": [
        "--  minvrm: V7R3M0",
        "",
        "--",
        "-- description: Which journal receivers are detached?",
        "-- (replace SHOESTORE with your library name and QSQJRN with your journal name)",
        "--",
        "with attached(jl, jn, jrcv) as (",
        "select attached_journal_receiver_library, 'QSQJRN', attached_journal_receiver_name",
        "  from qsys2.journal_info",
        "  where journal_library = 'SHOESTORE' and journal_name = 'QSQJRN'",
        ")",
        "select objname as detached_jrnrcv, a.*",
        "  from attached, table (",
        "      qsys2.object_statistics(jl, '*JRNRCV')",
        "    ) as a",
        "    where ",
        "    a.journal_library = jl and a.journal_name = jn and",
        "    objname not in (select jrcv from attached);"
      ]
    },
    {
      "name": "Journal - Systools Audit Journal AF",
      "content": [
        "--  minvrm: V7R3M0",
        "",
        "--",
        "-- Is this IBM i configured to generated AF entries?",
        "-- Note: auditing_control         == QAUDCTL ",
        "--       auditing_level           == QAUDLVL and",
        "--       auditing_level_extension == QAUDLVL2",
        "--",
        "select count(*) as \"AF_enabled?\"",
        "  from qsys2.security_info",
        "  where (auditing_control like '%*AUDLVL%') and",
        "        ((auditing_level like '%*AUTFAIL%') or",
        "         (auditing_level like '%*AUDLVL2%' and",
        "          auditing_level_extension like '%*AUTFAIL%'));",
        "",
        "--",
        "-- Review the authorization violations, which occurred in the last 24 hours",
        "-- ",
        "select ENTRY_TIMESTAMP, VIOLATION_TYPE_DETAIL, USER_NAME, coalesce(",
        "         path_name, object_library concat '/' concat object_name concat ' ' concat object_type) as object",
        "  from table (",
        "      SYSTOOLS.AUDIT_JOURNAL_AF(STARTING_TIMESTAMP => current timestamp - 24 hours)",
        "    );",
        "",
        "--",
        "-- Review the authorization violations, which occurred in the last 24 hours (include all columns)",
        "-- ",
        "select ENTRY_TIMESTAMP, VIOLATION_TYPE_DETAIL, USER_NAME, coalesce(",
        "         path_name, object_library concat '/' concat object_name concat ' ' concat object_type) as object, af.*",
        "  from table (",
        "      SYSTOOLS.AUDIT_JOURNAL_AF(STARTING_TIMESTAMP => current timestamp - 24 hours)",
        "    ) af;",
        " "
      ]
    },
    {
      "name": "Journal - Systools Audit Journal CA",
      "content": [
        "--  minvrm: V7R3M0",
        "",
        "--",
        "-- Is this IBM i configured to generated CA entries?",
        "-- Note: auditing_control         == QAUDCTL",
        "--       auditing_level           == QAUDLVL and",
        "--       auditing_level_extension == QAUDLVL2",
        "--",
        "select count(*) as \"CA_enabled?\"",
        "  from qsys2.security_info",
        "  where (auditing_control like '%*AUDLVL%') and",
        "        ((auditing_level like '%*SECURITY%') or (auditing_level like '%*SECRUN%') or",
        "         (auditing_level like '%*AUDLVL2%' and",
        "           (auditing_level_extension like '%*SECURITY%') or (auditing_level_extension like '%*SECRUN%')));",
        "",
        "--",
        "-- Review the authorization changes, which occurred in the last 24 hours (include all columns)",
        "-- ",
        "select ENTRY_TIMESTAMP, USER_NAME, COMMAND_TYPE, USER_PROFILE_NAME,",
        "coalesce(",
        "         path_name, object_library concat '/' concat object_name concat ' ' concat object_type) as object, ca.*",
        "  from table (",
        "      SYSTOOLS.AUDIT_JOURNAL_CA(STARTING_TIMESTAMP => current timestamp - 24 hours)",
        "    ) ca",
        "    order by entry_timestamp desc;",
        ""
      ]
    },
    {
      "name": "Journal - Systools Audit Journal OW",
      "content": [
        "--  minvrm: V7R3M0",
        "",
        "--",
        "-- Is this IBM i configured to generated OW entries?",
        "-- Note: auditing_control         == QAUDCTL ",
        "--       auditing_level           == QAUDLVL and",
        "--       auditing_level_extension == QAUDLVL2",
        "--",
        "select count(*) as \"OW_enabled?\"",
        "  from qsys2.security_info",
        "  where (auditing_control like '%*AUDLVL%') and",
        "        ((auditing_level like '%*SECURITY%') or (auditing_level like '%*SECRUN%') or",
        "         (auditing_level like '%*AUDLVL2%' and",
        "           (auditing_level_extension like '%*SECURITY%') or (auditing_level_extension like '%*SECRUN%')));",
        "",
        "--",
        "-- Review the ownership changes, which occurred in the last 24 hours (include all columns)",
        "-- ",
        "select ENTRY_TIMESTAMP, USER_NAME, PREVIOUS_OWNER, NEW_OWNER,  ",
        "coalesce(",
        "         path_name, object_library concat '/' concat object_name concat ' ' concat object_type) as object, ow.*",
        "  from table (",
        "      SYSTOOLS.AUDIT_JOURNAL_OW(STARTING_TIMESTAMP => current timestamp - 24 hours)",
        "    ) ow",
        "    order by entry_timestamp desc;"
      ]
    },
    {
      "name": "Journal - Systools Audit Journal PW",
      "content": [
        "--  minvrm: V7R3M0",
        "",
        "--",
        "-- Is this IBM i configured to generated PW entries?",
        "-- Note: auditing_control         == QAUDCTL ",
        "--       auditing_level           == QAUDLVL and",
        "--       auditing_level_extension == QAUDLVL2",
        "--",
        "select count(*) as \"PW_enabled?\"",
        "  from qsys2.security_info",
        "  where (auditing_control like '%*AUDLVL%') and",
        "        ((auditing_level like '%*AUTFAIL%') or",
        "         (auditing_level like '%*AUDLVL2%' and",
        "          auditing_level_extension like '%*AUTFAIL%'));",
        "",
        "--",
        "-- Review the password failures, which occurred in the last 24 hours (include all columns)",
        "-- ",
        "select ENTRY_TIMESTAMP, VIOLATION_TYPE_DETAIL, AUDIT_USER_NAME, DEVICE_NAME, pw.*",
        "  from table (",
        "      SYSTOOLS.AUDIT_JOURNAL_PW(STARTING_TIMESTAMP => current timestamp - 24 hours)",
        "    ) pw",
        "    order by entry_timestamp desc;"
      ]
    },
    {
      "name": "Journal - Systools change user profile (CHGUSRPRF)",
      "content": [
        "--  minvrm: V7R3M0",
        "",
        "--",
        "-- Find user profiles using a default password, generate the commands needed to disable them",
        "--",
        "select AUTHORIZATION_NAME, TEXT_DESCRIPTION, CHGUSRPRF_COMMAND",
        "  from QSYS2.USER_INFO,",
        "       table (",
        "         SYSTOOLS.CHANGE_USER_PROFILE(",
        "           P_USER_NAME => AUTHORIZATION_NAME, P_STATUS => '*DISABLED', PREVIEW => 'YES'",
        "         ))",
        "  where STATUS = '*ENABLED' and",
        "        user_creator <> '*IBM' and",
        "        USER_DEFAULT_PASSWORD = 'YES';",
        "stop;",
        "--",
        "-- Take the action!",
        "--",
        "select cp.* from QSYS2.USER_INFO,",
        "       table (",
        "         SYSTOOLS.CHANGE_USER_PROFILE(",
        "           P_USER_NAME => AUTHORIZATION_NAME, P_STATUS => '*DISABLED', PREVIEW => 'NO'",
        "         )",
        "       ) cp",
        "  where STATUS = '*ENABLED' and",
        "        user_creator <> '*IBM' and",
        "        USER_DEFAULT_PASSWORD = 'YES';",
        "stop;"
      ]
    },
    {
      "name": "Product - Expiring license info",
      "content": [
        "--",
        "-- Return information about all licensed products and features ",
        "-- that will expire within the next 2 weeks.",
        "--",
        "SELECT * FROM QSYS2.LICENSE_INFO",
        "WHERE LICENSE_EXPIRATION <= CURRENT DATE + 50 DAYS;",
        "",
        "-- Return information about all licensed products and features ",
        "-- that will expire within the next 2 weeks, for installed products only",
        "--",
        "SELECT * FROM QSYS2.LICENSE_INFO",
        "WHERE INSTALLED = 'YES' AND",
        "LICENSE_EXPIRATION <= CURRENT DATE + 50 DAYS;"
      ]
    },
    {
      "name": "System Health - Tracking the largest database tables",
      "content": [
        "--",
        "-- Review the largest tables in System Limits ",
        "-- ",
        " WITH X AS (SELECT ROW_NUMBER() ",
        "            OVER(PARTITION BY SYSTEM_SCHEMA_NAME, ",
        "                 SYSTEM_OBJECT_NAME, SYSTEM_TABLE_MEMBER ORDER BY ",
        "                CURRENT_VALUE DESC NULLS LAST) AS R, U.* ",
        "            FROM QSYS2.SYSLIMITS U ",
        "            WHERE LIMIT_ID = 15000) ",
        "        SELECT LAST_CHANGE_TIMESTAMP, SYSTEM_SCHEMA_NAME, ",
        "          SYSTEM_OBJECT_NAME, SYSTEM_TABLE_MEMBER, ",
        "        CURRENT_VALUE ",
        "        FROM X WHERE R = 1 ",
        "        ORDER BY CURRENT_VALUE DESC;"
      ]
    },
    {
      "name": "System Health - Fastest query of System Limits detail",
      "content": [
        "--  minvrm: V7R3M0",
        "",
        "--",
        "-- Show me the historical percentage used for Maximum # of Jobs",
        "--",
        "-- https://www.ibm.com/support/knowledgecenter/ssw_ibm_i_74/rzajq/rzajqserviceshealth.htm",
        "--",
        "with tt (job_maximum) as (",
        "    select current_numeric_value",
        "      from qsys2.system_value_info",
        "      where system_value_name = 'QMAXJOB'",
        "  )",
        "  select last_change_timestamp as increment_time, current_value as job_count,",
        "         tt.job_maximum,",
        "         dec(dec(current_value, 19, 2) / dec(tt.job_maximum, 19, 2) * 100, 19, 2)",
        "           as percent_consumed",
        "    from qsys2.syslimits_basic, tt",
        "    where limit_id = 19000",
        "    order by Increment_time desc;"
      ]
    },
    {
      "name": "Storage - Top 10 consumers, by user",
      "content": [
        "--",
        "-- Review the top 10 storage consumers",
        "SELECT A.AUTHORIZATION_NAME, SUM(A.STORAGE_USED) AS TOTAL_STORAGE_USED, B.TEXT_DESCRIPTION, B.ACCOUNTING_CODE, B.MAXIMUM_ALLOWED_STORAGE",
        "  FROM QSYS2.USER_STORAGE A ",
        "  INNER JOIN QSYS2.USER_INFO B ON B.USER_NAME = A.AUTHORIZATION_NAME WHERE B.USER_NAME NOT LIKE 'Q%' ",
        "  GROUP BY A.AUTHORIZATION_NAME, B.TEXT_DESCRIPTION, B.ACCOUNTING_CODE, B.MAXIMUM_ALLOWED_STORAGE",
        "  ORDER BY TOTAL_STORAGE_USED DESC FETCH FIRST 10 ROWS ONLY;"
      ]
    },
    {
      "name": "Storage - iASP storage consumption",
      "content": [
        "--",
        "--  Format output and break down by iASP",
        "--",
        "SELECT USER_NAME, ASPGRP,",
        "       VARCHAR_FORMAT(MAXSTG, '999,999,999,999,999,999,999,999') AS MAXIMUM_STORAGE_KB,",
        "       VARCHAR_FORMAT(STGUSED,'999,999,999,999,999,999,999,999') AS STORAGE_KB",
        "       FROM QSYS2.USER_STORAGE ",
        "  ORDER BY 4 DESC;"
      ]
    },
    {
      "name": "Storage - Top 10 Spool consumers, by user",
      "content": [
        "--",
        "-- Find the top 10 consumers of SPOOL storage ",
        "--",
        "SELECT USER_NAME, SUM(SIZE) AS TOTAL_SPOOL_SPACE FROM ",
        "   TABLE (QSYS2.OBJECT_STATISTICS('QSYS      ', '*LIB') ) as a, ",
        "   TABLE (QSYS2.OBJECT_STATISTICS(a.objname, 'OUTQ')  ) AS b, ",
        "   TABLE (QSYS2.OUTPUT_QUEUE_ENTRIES(a.objname, b.objname, '*NO')) AS c",
        "WHERE USER_NAME NOT LIKE 'Q%' ",
        "GROUP BY USER_NAME",
        "ORDER BY TOTAL_SPOOL_SPACE DESC",
        "FETCH FIRST 10 ROWS ONLY;"
      ]
    },
    {
      "name": "Storage - Storage details for a specific user",
      "content": [
        "--",
        "-- Retrieve the details of objects owned by a specific user",
        "-- Note: replace user-name with the user profile name of interest",
        "--",
        "SELECT b.objlongschema, b.objname, b.objtype, b.objattribute, b.objcreated, b.objsize, b.objtext, b.days_used_count, b.last_used_timestamp,b.* FROM ",
        "   TABLE (QSYS2.OBJECT_STATISTICS('*ALLUSRAVL ', '*LIB') ) as a, ",
        "   TABLE (QSYS2.OBJECT_STATISTICS(a.objname, 'ALL')  ) AS b",
        "WHERE b.OBJOWNER = 'user-name'",
        "ORDER BY b.OBJSIZE DESC",
        "FETCH FIRST 100 ROWS ONLY;"
      ]
    },
    {
      "name": "Storage - Review status of all storage H/W",
      "content": [
        "--",
        "-- Query information for all DISKs, order by percentage used",
        "--",
        "SELECT PERCENT_USED, ",
        "       CASE WHEN UNIT_TYPE = 1 ",
        "          THEN 'SSD' ",
        "          ELSE 'DISK' END as STORAGE_TYPE, ",
        "       A.* ",
        "FROM QSYS2.SYSDISKSTAT A ",
        "ORDER BY PERCENT_USED DESC;"
      ]
    },
    {
      "name": "Storage - NVMe Fuel Gauge",
      "content": [
        "--",
        "-- NVMe health detail",
        "--      ",
        "select CAP_MET, LIFE, DEGRADED, TEMP_WARN, TEMP_CRIT, ",
        "       DEVICE_TYPE, RESOURCE_NAME, DEVICE_MODEL,",
        "       SERIAL_NUMBER",
        "  from QSYS2.NVME_INFO;"
      ]
    },
    {
      "name": "Storage - Temporary storage consumption, by active jobs",
      "content": [
        "--",
        "-- Which active jobs are the top consumers of temporary storage?",
        "--",
        "SELECT bucket_current_size, bucket_peak_size, ",
        "  rtrim(job_number) concat '/' ",
        "  concat rtrim(job_user_name) ",
        "  concat '/' ",
        "  concat rtrim(job_name) as q_job_name ",
        "FROM QSYS2.SYSTMPSTG ",
        "WHERE job_status = '*ACTIVE' ",
        "ORDER BY bucket_current_size desc;"
      ]
    },
    {
      "name": "Storage - Temporary storage consumption, by DB workload",
      "content": [
        "--",
        "-- Which active database server connections ",
        "-- are consuming the most temporary storage",
        "--",
        "WITH TOP_TMP_STG (bucket_current_size, q_job_name) AS (",
        "SELECT bucket_current_size, rtrim(job_number) concat '/' concat rtrim(job_user_name) concat '/' concat rtrim(job_name) as q_job_name ",
        "FROM QSYS2.SYSTMPSTG ",
        "WHERE job_status = '*ACTIVE' AND JOB_NAME IN ('QZDASOINIT', 'QZDASSINIT', 'QRWTSRVR', 'QSQSRVR')",
        "ORDER BY bucket_current_size desc fetch first 10 rows only",
        ") SELECT bucket_current_size, q_job_name, V_SQL_STATEMENT_TEXT, B.* FROM TOP_TMP_STG, TABLE(QSYS2.GET_JOB_INFO(q_job_name)) B;"
      ]
    },
    {
      "name": "Storage - IASP Vary ON and OFF steps",
      "content": [
        "--",
        "-- description: Review the most expensive steps in recent vary ONs",
        "--",
        "SELECT v.* FROM qsys2.asp_vary_info v ",
        "WHERE OPERATION_TYPE = 'VARY ON'",
        "AND END_TIMESTAMP > CURRENT TIMESTAMP - 21 DAYS ",
        "ORDER BY duration DESC; ",
        "",
        "--",
        "-- description: Review the most expensive steps in recent vary ONs",
        "--",
        "SELECT iasp_name,       operation_type,",
        "       operation_number,MAX(start_timestamp) AS WHEN,",
        "       BIGINT(SUM(duration)) AS total_seconds",
        "   FROM qsys2.asp_vary_info WHERE DURATION IS NOT NULL",
        "   AND END_TIMESTAMP > CURRENT TIMESTAMP - 21 DAYS",
        "   GROUP BY iasp_name, operation_type, operation_number",
        "   ORDER BY total_seconds DESC;"
      ]
    },
    {
      "name": "Storage - Media Library",
      "content": [
        "-- Check for unavailable tape drives ",
        "SELECT * FROM QSYS2.MEDIA_LIBRARY_INFO ",
        "  WHERE DEVICE_STATUS = 'VARIED OFF';"
      ]
    },
    {
      "name": "Storage - ASP management",
      "content": [
        "--",
        "-- description: Review ASP and IASP definition and status",
        "--",
        "select * from qsys2.asp_info",
        "  order by ASP_NUMBER;",
        "",
        "--",
        "-- description: Review ASP and IASP storage status",
        "--",
        "select ASP_NUMBER, DEVD_NAME, DISK_UNITS, PRESENT, ",
        "       TOTAL_CAPACITY_AVAILABLE, TOTAL_CAPACITY, ",
        "       DEC(DEC(TOTAL_CAPACITY_AVAILABLE, 19, 2) /",
        "       DEC(TOTAL_CAPACITY, 19, 2) * 100, 19, 2) AS",
        "       AVAILABLE_SPACE",
        "       from qsys2.asp_info ORDER BY 7 ASC;"
      ]
    },
    {
      "name": "Storage - ASP management",
      "content": [
        "--",
        "-- description: SQL alternative to WRKASPJOB",
        "--",
        "SELECT iasp_name AS iasp,",
        "       iasp_number AS iasp#,",
        "       job_name,",
        "       job_status AS status,",
        "       job_type AS TYPE,",
        "       user_name AS \"User\",",
        "       subsystem_name AS sbs,",
        "       sql_status,",
        "       sql_stmt,",
        "       sql_time,",
        "       asp_type,",
        "       rdb_name",
        "   FROM qsys2.asp_job_info;"
      ]
    },
    {
      "name": "Spool - Top 10 consumers of spool storage",
      "content": [
        "--",
        "-- Find the top 10 consumers of SPOOL storage ",
        "-- Note: Replace library-name with the target library name",
        "--",
        "SELECT USER_NAME, SUM(SIZE) AS TOTAL_SPOOL_SPACE FROM ",
        "   TABLE (QSYS2.OBJECT_STATISTICS('QSYS      ', '*LIB') ) as a, ",
        "   TABLE (QSYS2.OBJECT_STATISTICS(a.objname, 'OUTQ')  ) AS b, ",
        "   TABLE (QSYS2.OUTPUT_QUEUE_ENTRIES(a.objname, b.objname, '*NO')) AS c",
        "WHERE USER_NAME NOT LIKE 'Q%'",
        "GROUP BY USER_NAME",
        "ORDER BY TOTAL_SPOOL_SPACE DESC",
        "LIMIT 10;"
      ]
    },
    {
      "name": "Spool - Output queue exploration",
      "content": [
        "--",
        "-- Find the output queue with the most files & see the details",
        "WITH BIGGEST_OUTQ(LIBNAME, QUEUENAME, FILECOUNT)",
        "   AS (SELECT OUTPUT_QUEUE_LIBRARY_NAME, OUTPUT_QUEUE_NAME, NUMBER_OF_FILES",
        "          FROM QSYS2.OUTPUT_QUEUE_INFO",
        "          ORDER BY NUMBER_OF_FILES DESC",
        "          FETCH FIRST 1 ROWS ONLY)",
        "   SELECT LIBNAME, QUEUENAME, X.*  FROM BIGGEST_OUTQ,   ",
        "          TABLE(QSYS2.OUTPUT_QUEUE_ENTRIES(LIBNAME, QUEUENAME, '*NO')) X",
        " ORDER BY TOTAL_PAGES DESC;",
        "",
        "",
        "-- Review the files on the top 5 output queues with the most files",
        "WITH outqs_manyfiles ( libname, queuename )",
        "   AS (SELECT OUTPUT_QUEUE_LIBRARY_NAME, OUTPUT_QUEUE_NAME",
        "          FROM QSYS2.OUTPUT_QUEUE_INFO",
        "          ORDER BY NUMBER_OF_FILES DESC",
        "          FETCH FIRST 5 ROWS ONLY)",
        "   SELECT libname, queuename, create_timestamp, spooled_file_name, user_name, total_pages, size ",
        "\tFROM outqs_manyfiles INNER JOIN QSYS2.OUTPUT_QUEUE_ENTRIES ",
        "\tON queuename=OUTPUT_QUEUE_NAME AND libname=OUTPUT_QUEUE_LIBRARY_NAME ",
        " \tORDER BY TOTAL_PAGES DESC;"
      ]
    },
    {
      "name": "Spool - Output queue basic detail",
      "content": [
        "--",
        "-- Find the 100 largest spool files in the QEZJOBLOG output queue.",
        "--",
        "SELECT * FROM QSYS2.OUTPUT_QUEUE_ENTRIES_BASIC",
        "  WHERE OUTPUT_QUEUE_NAME = 'QEZJOBLOG'",
        "  ORDER BY SIZE DESC",
        "  FETCH FIRST 100 ROWS ONLY;",
        "",
        "--",
        "-- Find the top 10 consumers of SPOOL storage.",
        "--",
        "SELECT USER_NAME, SUM(SIZE) AS TOTAL_SPOOL_SPACE",
        "  FROM QSYS2.OUTPUT_QUEUE_ENTRIES_BASIC",
        "  WHERE USER_NAME NOT LIKE 'Q%'",
        "  GROUP BY USER_NAME",
        "  ORDER BY TOTAL_SPOOL_SPACE DESC LIMIT 10;"
      ]
    },
    {
      "name": "Spool - Search all QZDASOINIT spooled files",
      "content": [
        "--",
        "-- Find QZDASONIT joblogs related to a specific TCP/IP address",
        "--",
        "with my_spooled_files (",
        "        job,",
        "        file,",
        "        file_number,",
        "        user_data,",
        "        create_timestamp",
        "     )",
        "        as (select job_name,",
        "                   spooled_file_name,",
        "                   file_number,",
        "                   user_data,",
        "                   create_timestamp",
        "              from qsys2.output_queue_entries_basic",
        "              where user_data = 'QZDASOINIT' and spooled_file_name = 'QPJOBLOG'",
        "                 and CREATE_TIMESTAMP > CURRENT TIMESTAMP - 24 hours",
        "              order by create_timestamp desc),",
        "     all_my_spooled_file_data (",
        "        job,",
        "        file,",
        "        file_number,",
        "        spool_data",
        "     )",
        "     as (",
        "        select job,",
        "               file,",
        "               file_number,",
        "               spooled_data",
        "           from my_spooled_files,",
        "                table (",
        "                   systools.spooled_file_data(",
        "                      job_name => job, spooled_file_name => file,",
        "                      spooled_file_number => file_number)",
        "                )",
        "     )",
        "   select *",
        "      from all_my_spooled_file_data",
        "      where upper(spool_data) like upper('%client 9.85.200.78 connected to server%') ;     ",
        "",
        ""
      ]
    },
    {
      "name": "Spool - Consume my most recent spooled file",
      "content": [
        "--",
        "-- Query my most recent spooled file",
        "--",
        "WITH my_spooled_files (",
        "      job,",
        "      FILE,",
        "      file_number,",
        "      user_data,",
        "      create_timestamp",
        "   )",
        "      AS (SELECT job_name,",
        "                 spooled_file_name,",
        "                 file_number,",
        "                 user_data,",
        "                 create_timestamp",
        "            FROM qsys2.output_queue_entries_basic",
        "            WHERE user_name = USER",
        "            ORDER BY create_timestamp DESC",
        "            LIMIT 1)",
        "   SELECT job,",
        "          FILE,",
        "          file_number,",
        "          spooled_data",
        "      FROM my_spooled_files,",
        "           TABLE (",
        "              systools.spooled_file_data(",
        "                 job_name => job, spooled_file_name => FILE,",
        "                 spooled_file_number => file_number)",
        "           );",
        "           ",
        "",
        ""
      ]
    },
    {
      "name": "Spool - managing spool",
      "content": [
        "--",
        "-- Preview spooled files to remove",
        "--",
        "call systools.delete_old_spooled_files(delete_older_than => current timestamp - 30 days, ",
        "-- p_output_queue_library_name => , ",
        "-- p_output_queue_name => , ",
        "-- p_user_name => , ",
        "                                       preview => 'YES');",
        "",
        "--",
        "-- Remove the spooled files",
        "--",
        "call systools.delete_old_spooled_files(delete_older_than => current timestamp - 30 days, ",
        "                                       preview => 'NO');"
      ]
    },
    {
      "name": "Spool - Generate PDF into the IFS",
      "content": [
        "--  minvrm: V7R3M0",
        "",
        "--",
        "-- What spooled files exist for a user?",
        "--",
        "select *",
        "  from qsys2.output_queue_entries_basic",
        "  where status = 'READY' and",
        "        user_name = 'JOEUSER';",
        "",
        "cl: mkdir '/usr/timmr';",
        "",
        "--",
        "-- What files exist under this path?",
        "--",
        "select *",
        "  from table (",
        "      qsys2.ifs_object_statistics(START_PATH_NAME => '/usr/JOEUSER', SUBTREE_DIRECTORIES => 'YES')",
        "    );",
        "",
        "--",
        "-- Take the spooled files and generate pdfs into IFS path",
        "-- Note: prerequisite software: 5770TS1 - Option 1 - Transform Services - AFP to PDF Transform ",
        "--",
        "select job_name, spooled_file_name, file_number, ",
        "  SYSTOOLS.Generate_PDF( ",
        "   job_name            => job_name, ",
        "   spooled_file_name   => spooled_file_name, ",
        "   spooled_file_number => file_number, ",
        "   path_name   => '/usr/timmr/' concat regexp_replace(job_name, '/', '_') ",
        "      concat '_' concat spooled_file_name concat '_' concat file_number) ",
        "      as \"pdf_created?\",",
        "   '/usr/timmr/' concat regexp_replace(job_name, '/', '_') ",
        "      concat '_' concat spooled_file_name concat '_' concat file_number",
        "      as pdf_path from qsys2.output_queue_entries_basic ",
        "      where status = 'READY' and user_name = 'TIMMR';",
        "",
        "--",
        "-- What files exist under this path?",
        "--",
        "select *",
        "  from table (",
        "      qsys2.ifs_object_statistics(START_PATH_NAME => '/usr/timmr/', SUBTREE_DIRECTORIES => 'YES')",
        "    );",
        "",
        "--",
        "-- and the data is there",
        "--",
        "select path_name, line_number, line",
        "  from table (",
        "         qsys2.ifs_object_statistics(START_PATH_NAME => '/usr/timmr/', SUBTREE_DIRECTORIES => 'YES')",
        "       ), lateral (",
        "         select *",
        "           from table (",
        "               qsys2.ifs_read_binary(",
        "                 path_name => path_name,   maximum_line_length => default,",
        "                 ignore_errors => 'NO')",
        "             )",
        "       ) where object_type = '*STMF';",
        "",
        " "
      ]
    },
    {
      "name": "Application - Service tracker",
      "content": [
        "--",
        "-- Review all the Security related IBM i Services ",
        "--",
        "SELECT * FROM QSYS2.SERVICES_INFO ",
        "   WHERE SERVICE_CATEGORY = 'SECURITY';",
        "",
        "--",
        "-- Find the example for top storage consumers ",
        "--",
        "SELECT EXAMPLE",
        "   FROM QSYS2.SERVICES_INFO",
        "   WHERE EXAMPLE LIKE '%top 10 storage%';"
      ]
    },
    {
      "name": "Application - Environment variable information",
      "content": [
        "--",
        "-- Retrieve the environment variables for the",
        "-- current connection",
        "--",
        "SELECT * FROM QSYS2.ENVIRONMENT_VARIABLE_INFO;"
      ]
    },
    {
      "name": "Application - PASE Shell",
      "content": [
        "--",
        "-- Set the current user's shell to BASH shipped by 5733-OPS.",
        "--",
        "CALL QSYS2.SET_PASE_SHELL_INFO('*CURRENT', ",
        "                               '/QOpenSys/QIBM/ProdData/OPS/tools/bin/bash');",
        "",
        "--",
        "-- Set the default shell to be ksh for any users that do not have an explicit shell set.",
        "--",
        "CALL QSYS2.SET_PASE_SHELL_INFO('*DEFAULT', '/QOpenSys/usr/bin/ksh');",
        "",
        "--",
        "-- Review shell configuration",
        "--",
        "select authorization_name, pase_shell_path ",
        "  from qsys2.user_info where pase_shell_path is not null;"
      ]
    },
    {
      "name": "Work Management - Object lock info",
      "content": [
        "--  Example showing how to use IBM i Services to capture point of failure",
        "--  detail within an SQL procedure, function or trigger",
        "",
        "--  One time setup steps",
        "CL: CRTLIB APPLIB;",
        "CREATE OR REPLACE TABLE APPLIB.HARD_TO_DEBUG_PROBLEMS AS ",
        "   (SELECT * FROM TABLE(QSYS2.JOBLOG_INFO('*')) X) WITH NO DATA ON REPLACE PRESERVE ROWS;",
        "CREATE OR REPLACE TABLE APPLIB.HARD_TO_DEBUG_LOCK_PROBLEMS LIKE ",
        "   QSYS2.OBJECT_LOCK_INFO ON REPLACE PRESERVE ROWS;",
        "",
        "create or replace procedure toystore.update_sales(IN P_PERSON VARCHAR(50),",
        "IN P_SALES INTEGER, IN P_DATE DATE)",
        "LANGUAGE SQL",
        "BEGIN",
        "-- Handler code",
        "DECLARE EXIT HANDLER FOR SQLSTATE '57033' ",
        "  BEGIN  /* Message: [SQL0913] Object in use. */",
        "  DECLARE SCHEMA_NAME VARCHAR(128);",
        "  DECLARE TABLE_NAME VARCHAR(128);",
        "  DECLARE DOT_LOCATION INTEGER;",
        "  DECLARE MSG_TOKEN CLOB(1K);",
        "",
        "  GET DIAGNOSTICS condition 1 MSG_TOKEN = db2_ordinal_token_1;",
        "  SET DOT_LOCATION = LOCATE_IN_STRING(MSG_TOKEN, '.');",
        "",
        "  SET SCHEMA_NAME = RTRIM(SUBSTR(MSG_TOKEN, 1, DOT_LOCATION - 1));",
        "  SET TABLE_NAME = RTRIM(SUBSTR(MSG_TOKEN, DOT_LOCATION + 1, LENGTH(MSG_TOKEN) - DOT_LOCATION));",
        "  INSERT INTO APPLIB.HARD_TO_DEBUG_PROBLEMS",
        "    SELECT * FROM TABLE(QSYS2.JOBLOG_INFO('*')) A",
        "    ORDER BY A.ORDINAL_POSITION DESC",
        "    FETCH FIRST 5 ROWS ONLY;",
        "",
        "  INSERT INTO APPLIB.HARD_TO_DEBUG_LOCK_PROBLEMS",
        "    SELECT * FROM QSYS2.OBJECT_LOCK_INFO",
        "     WHERE OBJECT_SCHEMA = SCHEMA_NAME AND OBJECT_NAME = TABLE_NAME;",
        "  SET MSG_TOKEN =",
        "\t SCHEMA_NAME CONCAT '.' CONCAT TABLE_NAME CONCAT ' LOCK FAILURE. See APPLIB.HARD_TO_DEBUG_LOCK_PROBLEMS';  ",
        "  RESIGNAL SQLSTATE '57033' SET MESSAGE_TEXT = MSG_TOKEN;",
        "  END;",
        "",
        "-- Mainline procedure code",
        "update toystore.sales set sales = sales + p_sales",
        "where sales_person = p_person and sales_date = p_date;",
        "",
        "end;",
        "",
        "--",
        "-- From a different job:",
        "CL:ALCOBJ OBJ((TOYSTORE/SALES *FILE *EXCLRD)) CONFLICT(*RQSRLS);",
        "",
        "--",
        "-- Try to update the sales",
        "CALL toystore.update_sales('LUCCHESSI', 14, '1995-12-31');",
        "-- SQL State: 57033 ",
        "-- Vendor Code: -438 ",
        "-- Message: [SQL0438] TOYSTORE.SALES LOCK FAILURE. See APPLIB.HARD_TO_DEBUG_LOCK_PROBLEMS",
        " ",
        "SELECT * FROM APPLIB.HARD_TO_DEBUG_PROBLEMS;",
        "SELECT * FROM APPLIB.HARD_TO_DEBUG_LOCK_PROBLEMS;",
        ""
      ]
    },
    {
      "name": "Message Handling - Review system operator inquiry messages",
      "content": [
        "--",
        "-- Examine all system operator inquiry messages that have a reply",
        "--",
        "SELECT a.message_text AS \"INQUIRY\", b.message_text AS \"REPLY\", B.FROM_USER, B.*, A.*",
        " FROM qsys2.message_queue_info a INNER JOIN   ",
        "      qsys2.message_queue_info b",
        "ON a.message_key = b.associated_message_key",
        "WHERE A.MESSAGE_QUEUE_NAME = 'QSYSOPR' AND",
        "      A.MESSAGE_QUEUE_LIBRARY = 'QSYS' AND",
        "      B.MESSAGE_QUEUE_NAME = 'QSYSOPR' AND",
        "      B.MESSAGE_QUEUE_LIBRARY = 'QSYS'",
        "ORDER BY b.message_timestamp DESC; "
      ]
    },
    {
      "name": "Message Handling - Review system operator unanswered inquiry messages",
      "content": [
        "--",
        "-- Examine all system operator inquiry messages that have no reply",
        "--",
        "WITH REPLIED_MSGS(KEY) AS (",
        "SELECT a.message_key",
        " FROM qsys2.message_queue_info a INNER JOIN   ",
        "      qsys2.message_queue_info b",
        "ON a.message_key = b.associated_message_key",
        "WHERE A.MESSAGE_QUEUE_NAME = 'QSYSOPR' AND",
        "      A.MESSAGE_QUEUE_LIBRARY = 'QSYS' AND",
        "      B.MESSAGE_QUEUE_NAME = 'QSYSOPR' AND",
        "      B.MESSAGE_QUEUE_LIBRARY = 'QSYS'",
        "ORDER BY b.message_timestamp DESC",
        ")",
        "SELECT a.message_text AS \"INQUIRY\", A.*",
        " FROM qsys2.message_queue_info a ",
        "      LEFT EXCEPTION JOIN REPLIED_MSGS b",
        "ON a.message_key = b.key",
        "WHERE MESSAGE_QUEUE_NAME = 'QSYSOPR' AND",
        "      MESSAGE_QUEUE_LIBRARY = 'QSYS' AND",
        "      message_type = 'INQUIRY'  ",
        "ORDER BY message_timestamp DESC; ",
        ""
      ]
    },
    {
      "name": "PTF - Group PTF Currency",
      "content": [
        "--",
        "-- Derive the IBM i operating system level and then ",
        "-- determine the level of currency of PTF Groups",
        "--   ",
        "With iLevel(iVersion, iRelease) AS",
        "(",
        "select OS_VERSION, OS_RELEASE from sysibmadm.env_sys_info",
        ")",
        "  SELECT P.*",
        "     FROM iLevel, systools.group_ptf_currency P",
        "     WHERE ptf_group_release = ",
        "           'R' CONCAT iVersion CONCAT iRelease concat '0'",
        "     ORDER BY ptf_group_level_available -",
        "        ptf_group_level_installed DESC;",
        "        ",
        "",
        "-- ",
        "-- For those that like STRSQL ;-(",
        "--",
        "With iLevel(iVersion, iRelease) AS",
        "(",
        "select OS_VERSION, OS_RELEASE from sysibmadm.env_sys_info",
        ")",
        "SELECT VARCHAR(GRP_CRNCY,26) AS \"GRPCUR\",",
        "       GRP_ID,  VARCHAR(GRP_TITLE, 20) AS \"NAME\",",
        "       GRP_LVL, GRP_IBMLVL, GRP_LSTUPD,",
        "       GRP_RLS, GRP_SYSSTS",
        "FROM iLevel, systools.group_ptf_currency P",
        "WHERE ptf_group_release =",
        "'R' CONCAT iVersion CONCAT iRelease concat '0'",
        "ORDER BY ptf_group_level_available -",
        "ptf_group_level_installed DESC;"
      ]
    },
    {
      "name": "Message Handling - Reply List",
      "content": [
        "-- Review reply list detail for all messages which begin with CPA ",
        "SELECT * FROM QSYS2.REPLY_LIST_INFO WHERE message_ID LIKE 'CPA%';"
      ]
    },
    {
      "name": "Product - Software Product Info",
      "content": [
        "--  minvrm:  v7r3m0",
        "",
        "-- Is QSYSINC installed? (DSPSFWRSC alternative)",
        "--",
        "select count(*) as gtg_count",
        "  from qsys2.software_product_info",
        "  where upper(text_description) like '%SYSTEM OPENNESS%'",
        "        and load_error = 'NO'",
        "        and load_state = 90",
        "        and symbolic_load_state = 'INSTALLED';"
      ]
    },
    {
      "name": "Message Handling - Send Alert messages to QSYSOPR",
      "content": [
        "--  minvrm:  v7r3m0",
        "",
        "--",
        "-- Send the SQL7064 message to the QSYSOPR message queue",
        "--",
        "values length('Query Supervisor - terminated a query for ' concat qsys2.job_name);",
        "",
        "call QSYS2.SEND_MESSAGE('SQL7064', 65, 'Query Supervisor - terminated a query for ' concat",
        "      qsys2.job_name);",
        "",
        "--",
        "-- Review the most recent messages on the QSYSOPR message queue",
        "--",
        "select *",
        "  from table (",
        "      QSYS2.MESSAGE_QUEUE_INFO(MESSAGE_FILTER => 'ALL')",
        "    )",
        "  order by MESSAGE_TIMESTAMP desc; "
      ]
    },
    {
      "name": "Performance - Collection Services",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "",
        "  ",
        "--",
        "-- Review the Collection Services (CS) configuration",
        "--",
        "select *",
        "  from QSYS2.COLLECTION_SERVICES_INFO;",
        "",
        "--",
        "-- Shred the CS categories and interval settings",
        "--",
        "select a.*",
        "  from QSYS2.COLLECTION_SERVICES_INFO, lateral (select * from JSON_TABLE(CATEGORY_LIST, 'lax $.category_list[*]' ",
        "  columns(cs_category clob(1k) ccsid 1208 path 'lax $.\"category\"', ",
        "          cs_interval clob(1k) ccsid 1208 path 'lax $.\"interval\"'))) a;",
        "  ",
        "  "
      ]
    },
    {
      "name": "Java - JVM Health",
      "content": [
        "--",
        "-- Find the top 10 JVM jobs by amount of time spent in Garbage Collection",
        "--",
        "SELECT TOTAL_GC_TIME, GC_CYCLE_NUMBER,JAVA_THREAD_COUNT, A.* FROM QSYS2.JVM_INFO A",
        " ORDER BY TOTAL_GC_TIME DESC",
        " FETCH FIRST 10 ROWS ONLY;",
        "",
        "--",
        "-- Change a specific web admin JVM to provide verbose garbage collection details:",
        "--",
        "CALL QSYS2.SET_JVM('121376/QWEBADMIN/ADMIN4','GC_ENABLE_VERBOSE') ;"
      ]
    },
    {
      "name": "System Health - System Limits tracking",
      "content": [
        "--",
        "-- Description: Enable alerts for files which are growing near the maximum",
        "--",
        "CL: ALCOBJ OBJ((QSYS2/SYSLIMTBL *FILE *EXCL)) CONFLICT(*RQSRLS) ;",
        "CL: DLCOBJ OBJ((QSYS2/SYSLIMTBL *FILE *EXCL));",
        "",
        "CREATE OR REPLACE TRIGGER QSYS2.SYSTEM_LIMITS_LARGE_FILE",
        "\tAFTER INSERT ON QSYS2.SYSLIMTBL ",
        "\tREFERENCING NEW AS N FOR EACH ROW MODE DB2ROW ",
        "SET OPTION USRPRF=*OWNER, DYNUSRPRF=*OWNER",
        "BEGIN ATOMIC ",
        "DECLARE V_CMDSTMT VARCHAR(200) ;",
        "DECLARE V_ERROR INTEGER;",
        "",
        "DECLARE EXIT HANDLER FOR SQLEXCEPTION ",
        "   SET V_ERROR = 1;",
        "",
        "/* ------------------------------------------------------------------ */",
        "/* If a table has exceeded 80% of this limit, alert the operator     */",
        "/* ------------------------------------------------------------------ */",
        "/* 15000 == MAXIMUM NUMBER OF ALL ROWS IN A PARTITION                 */",
        "/*          (max size = 4,294,967,288)                                */",
        "/* ------------------------------------------------------------------ */",
        "IF (N.LIMIT_ID = 15000 AND",
        "    N.CURRENT_VALUE > ((select supported_value from qsys2.sql_sizing where sizing_id = 15000) * 0.8)) THEN ",
        "",
        "SET V_CMDSTMT = 'SNDMSG MSG(''Table: ' ",
        "     CONCAT N.SYSTEM_SCHEMA_NAME CONCAT '/' CONCAT N.SYSTEM_OBJECT_NAME",
        "     CONCAT ' (' CONCAT N.SYSTEM_TABLE_MEMBER CONCAT ",
        "     ') IS GETTING VERY LARGE - ROW COUNT =  '",
        "     CONCAT CURRENT_VALUE CONCAT ' '') TOUSR(*SYSOPR) MSGTYPE(*INFO) ';",
        " CALL QSYS2.QCMDEXC( V_CMDSTMT );",
        "END IF;",
        "END;",
        "",
        "commit;",
        "--",
        "-- Description: Determine if any user triggers have been created over the System Limits table",
        "--",
        "SELECT * FROM QSYS2.SYSTRIGGERS ",
        "  WHERE EVENT_OBJECT_SCHEMA = 'QSYS2' AND EVENT_OBJECT_TABLE = 'SYSLIMTBL';"
      ]
    },
    {
      "name": "Communications - Network Statistics Info (NETSTAT)",
      "content": [
        "--  ",
        "-- Description: Review the connections that are transferring the most data",
        "--",
        "SELECT * FROM QSYS2.NETSTAT_INFO",
        "  ORDER BY BYTES_SENT_REMOTELY + BYTES_RECEIVED_LOCALLY DESC",
        "  LIMIT 10;",
        ""
      ]
    },
    {
      "name": "Communications - Network Statistics Interface (NETSTAT)",
      "content": [
        "--",
        "-- The following procedure was created to help clients prepare for improved enforcement of TCP/IP configuration problems.",
        "-- Reference: https://www.ibm.com/support/knowledgecenter/ssw_ibm_i_73/rzaq9/rzaq9osCLtcpifc.htm",
        "",
        "--  ",
        "-- Analyze NETSTAT Interface detail, looking for problems. ",
        "-- The example shows how TCP/IP would be incorrectly configured and the SQL below shows how to detect that this condition exists",
        "--",
        "",
        "-- Example:",
        "CL: ADDTCPIFC INTNETADR('10.1.1.1') LIND(*VIRTUALIP) SUBNETMASK('255.255.252.0');",
        "CL: ADDTCPIFC INTNETADR('10.1.1.2') LIND(*VIRTUALIP) SUBNETMASK('255.255.252.0');",
        "CL: ADDTCPIFC INTNETADR('10.1.1.3') LIND(ETHLINE) SUBNETMASK('255.255.255.255') PREFIFC('10.1.1.1' '10.1.1.2');",
        "",
        "CREATE OR REPLACE PROCEDURE FIND_INTERFACE_CONFIG_PROBLEMS()",
        "LANGUAGE SQL",
        "DYNAMIC RESULT SETS 1",
        "SET OPTION DBGVIEW = *SOURCE, OUTPUT = *PRINT",
        "BEGIN",
        "  DECLARE Pref_IP, Int_Addr, Net_Addr VARCHAR(15);",
        "  DECLARE Pref_IP_List VARCHAR(159);",
        "  DECLARE at_end integer default 0;",
        "  DECLARE not_found CONDITION FOR '02000';",
        "  DECLARE Pref_Interface_Result_Cursor CURSOR FOR",
        "    SELECT A.* FROM SESSION.CONFIG_ISSUES A",
        "    INNER JOIN QSYS2.NETSTAT_INTERFACE_INFO B",
        "    ON A.PREFERRED_IP_REFERENCED_AS_A_NON_ETHERNET_INTERFACE = B.INTERNET_ADDRESS",
        "    WHERE B.INTERFACE_LINE_TYPE <> 'ELAN' AND B.INTERFACE_LINE_TYPE <> 'VETH';",
        "  DECLARE PreferredIP_Cursor CURSOR FOR SELECT INTERNET_ADDRESS, NETWORK_ADDRESS, PREFERRED_INTERFACE_LIST",
        "    FROM QSYS2.NETSTAT_INTERFACE_INFO WHERE PREFERRED_INTERFACE_LIST IS NOT NULL;",
        "  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET at_end  = 1;",
        "  DECLARE CONTINUE HANDLER FOR not_found    SET at_end  = 1;",
        "",
        "  DECLARE GLOBAL TEMPORARY TABLE CONFIG_ISSUES(INTERNET_ADDRESS, NETWORK_ADDRESS, PREFERRED_IP_REFERENCED_AS_A_NON_ETHERNET_INTERFACE) AS (",
        "  SELECT INTERNET_ADDRESS, NETWORK_ADDRESS, CAST(NULL AS VARCHAR(15)) FROM QSYS2.NETSTAT_INTERFACE_INFO)",
        "  WITH NO DATA WITH REPLACE;",
        "",
        "  OPEN PreferredIP_Cursor;",
        "  FETCH FROM PreferredIP_Cursor INTO Int_Addr, Net_Addr, Pref_IP_List;",
        "  WHILE (at_end = 0) DO",
        "    BEGIN",
        "      DECLARE v_loc integer;",
        "      DECLARE v_start integer default 1;",
        "",
        "      Pref_IP_loop: LOOP",
        "        SET v_loc = LOCATE_IN_STRING(Pref_IP_List, ' ', v_start, 1);",
        "        IF (v_loc = 0) THEN",
        "          SET Pref_IP = SUBSTR(Pref_IP_List, v_start);",
        "        ELSE",
        "          SET Pref_IP = SUBSTR(Pref_IP_List, v_start, v_loc - v_start);",
        "        END IF;",
        "",
        "        INSERT INTO SESSION.CONFIG_ISSUES VALUES(Int_Addr, Net_Addr, Pref_IP);",
        "",
        "        IF (v_loc = 0) THEN",
        "          LEAVE Pref_IP_loop;",
        "        END IF;",
        "        SET v_start = v_loc + 1;",
        "      END LOOP;",
        "    END;",
        "  FETCH FROM PreferredIP_Cursor INTO Int_Addr, Net_Addr, Pref_IP_List;",
        "  END WHILE;",
        "  CLOSE PreferredIP_Cursor;",
        "  OPEN Pref_Interface_Result_Cursor;",
        "END;",
        "",
        "--",
        "-- Look for NETSTAT interface problems. Any rows returned should be analyzed.",
        "--",
        "CALL FIND_INTERFACE_CONFIG_PROBLEMS();"
      ]
    },
    {
      "name": "Communications - Network Statistics Interface (NETSTAT)",
      "content": [
        "--  ",
        "-- Analyze NETSTAT Interface detail, looking for problems. ",
        "-- The examples show how TCP/IP would be incorrectly configured and the SQL below shows how to detect that this condition exists",
        "--",
        "",
        "-- Example 1",
        "CL: CRTLINETH LIND(MYETH) RSRCNAME(NOEXIST);",
        "CL: ADDTCPIFC INTNETADR('10.1.1.1') LIND(*VIRTUALIP) SUBNETMASK('255.255.252.0');",
        "CL: ADDTCPIFC INTNETADR('10.1.1.2') LIND(MYETH) SUBNETMASK('255.255.255.255') LCLIFC('10.1.1.1');",
        "",
        "-- Description: Find instances where a TCP/IP interface contains an associated local interface",
        "-- and the line description type of the interface is not set to *VIRTUALIP",
        "SELECT * FROM QSYS2.NETSTAT_INTERFACE_INFO",
        "WHERE ASSOCIATED_LOCAL_INTERFACE IS NOT NULL AND",
        "      LINE_DESCRIPTION <> '*VIRTUALIP' AND",
        "      INTERFACE_LINE_TYPE = 'ELAN';",
        "",
        "-- Example 2",
        "CL: ADDTCPIFC INTNETADR('10.1.1.1') LIND(ETHLINE) SUBNETMASK('255.255.255.255') PREFIFC(*AUTO);",
        "",
        "-- Description: Find instances where a TCP/IP interface contains a preferred interface list",
        "-- and the line description type of the interface is not set to *VIRTUALIP",
        "-- and interface selection is performed automatically by the system",
        "SELECT * FROM QSYS2.NETSTAT_INTERFACE_INFO",
        "WHERE PREFERRED_INTERFACE_LIST IS NULL AND",
        "      LINE_DESCRIPTION <> '*VIRTUALIP' AND",
        "      PREFERRED_INTERFACE_DEFAULT_ROUTE = 'NO' AND",
        "      PROXY_ARP_ALLOWED = 'YES' AND",
        "      PROXY_ARP_ENABLED = 'YES';",
        "",
        "-- Example 3",
        "CL: CRTLINETH LIND(MYETH) RSRCNAME(NOEXIST);",
        "CL: ADDTCPIFC INTNETADR('10.1.1.1') LIND(*VIRTUALIP) SUBNETMASK('255.255.252.0');",
        "CL: ADDTCPIFC INTNETADR('10.1.1.2') LIND(MYETH) SUBNETMASK('255.255.255.255') PREFIFC('10.1.1.1');",
        "",
        "-- Description: Find instances where a TCP/IP interface contains a preferred interface list",
        "-- and the line description type of the interface is not set to *VIRTUALIP",
        "-- and the line type of the interface is not set to Virtual Ethernet",
        "SELECT * FROM QSYS2.NETSTAT_INTERFACE_INFO",
        "WHERE PREFERRED_INTERFACE_LIST IS NOT NULL AND",
        "      LINE_DESCRIPTION <> '*VIRTUALIP' AND",
        "      INTERFACE_LINE_TYPE <> 'VETH';",
        "",
        "-- Example 4",
        "CL: ADDTCPIFC INTNETADR('10.1.1.1') LIND(*VIRTUALIP) SUBNETMASK('255.255.252.0');",
        "CL: ADDTCPIFC INTNETADR('10.1.1.2') LIND(ETHLINE) SUBNETMASK('255.255.255.255') LCLIFC('10.1.1.1') PREFIFC('10.1.1.1');",
        "",
        "-- Description: Find instances where a TCP/IP interface contains a preferred interface list",
        "-- and an associated local interface list",
        "SELECT * FROM QSYS2.NETSTAT_INTERFACE_INFO",
        "WHERE PREFERRED_INTERFACE_LIST IS NOT NULL AND",
        "      ASSOCIATED_LOCAL_INTERFACE IS NOT NULL;"
      ]
    },
    {
      "name": "Communications - Network Statistics Job Info (NETSTAT)",
      "content": [
        "--  ",
        "-- Analyze remote IP address detail for password failures",
        "--",
        "WITH ip_addrs(rmt_addr, rmt_count)",
        "   AS (SELECT remote_address, COUNT(*)",
        "          FROM TABLE(qsys2.display_journal('QSYS', 'QAUDJRN',",
        "             journal_entry_types => 'PW', starting_timestamp => CURRENT",
        "             TIMESTAMP - 24 HOURS)) AS x",
        "          GROUP BY remote_address)",
        "   SELECT i.rmt_addr, i.rmt_count, user_name, rmt_port",
        "      FROM ip_addrs i LEFT OUTER JOIN ",
        "      qsys2.netstat_job_info n ON i.rmt_addr = remote_address",
        "      ORDER BY rmt_count DESC;"
      ]
    },
    {
      "name": "Communications - Network Statistics Route Info (NETSTAT)",
      "content": [
        "--  ",
        "-- Review the details of all TCP/IP routes",
        "--",
        "SELECT * FROM QSYS2.NETSTAT_ROUTE_INFO;"
      ]
    },
    {
      "name": "Communications - TCP/IP Information",
      "content": [
        "--",
        "-- description: Who am I?",
        "--",
        "select * from qsys2.tcpip_info;",
        "",
        "--",
        "-- Using the well defined port #'s",
        "-- Reference:",
        "-- https://www.ibm.com/support/knowledgecenter/ssw_ibm_i_73/rzaku/rzakuservertable.htm",
        "--",
        "CREATE OR REPLACE TRIGGER SHOESTORE.INSERT_EMPLOYEE",
        "  BEFORE INSERT ON SHOESTORE.EMPLOYEE ",
        "  REFERENCING NEW AS N ",
        "  FOR EACH ROW ",
        "  MODE DB2ROW  ",
        "  SET OPTION DBGVIEW = *SOURCE",
        "IE : BEGIN ATOMIC ",
        "    DECLARE V_SERVER_PORT_NUMBER INTEGER;",
        "    --",
        "    -- Perform extra validation for ODBC users",
        "    --",
        "    SET V_SERVER_PORT_NUMBER = ",
        "      (select server_port_number from qsys2.tcpip_info);",
        "    IF (V_SERVER_PORT_NUMBER = 8471) THEN",
        "       SIGNAL SQLSTATE '80001' ",
        "\t SET MESSAGE_TEXT = 'Employees cannot be added via this interface'; ",
        "    END IF;",
        "END IE  ; "
      ]
    },
    {
      "name": "Communications - Time server",
      "content": [
        "-- Define a time server as the preferred time server",
        "--",
        "call qsys2.add_time_server(TIME_SERVER         => 'TICK.RCHLAND.IBM.COM',",
        "                           PREFERRED_INDICATOR => 'YES');",
        "--",
        "-- Define a second time server in case the preferred time server is not reachable",
        "--",
        "call qsys2.add_time_server(TIME_SERVER         => 'TOCK.RCHLAND.IBM.COM',",
        "                           PREFERRED_INDICATOR => 'NO');",
        "--",
        "-- List the time servers that have been defined",
        "--",
        "select * from qsys2.time_protocol_info;"
      ]
    },
    {
      "name": "Communications - Active Database Connections",
      "content": [
        "-- List the active database connections for my job",
        "select * from table(qsys2.active_db_connections(qsys2.job_name));"
      ]
    },
    {
      "name": "Communications - Active Database Connections",
      "content": [
        "-- Extract the database application server job name",
        "select c.remote_job_name, c.connection_type, c.*",
        "  from table (",
        "      qsys2.active_db_connections('*')",
        "    ) c;"
      ]
    },
    {
      "name": "Communications - Apache Real Time Server Statistics",
      "content": [
        "-- Review the HTTP Servers thread usage detail",
        "select server_active_threads, server_idle_threads, h.*",
        "  from qsys2.http_server_info h",
        "  where server_name = 'ADMIN'",
        "  order by 1 desc, 2 desc;"
      ]
    },
    {
      "name": "Application - Examine my stack",
      "content": [
        "--",
        "-- Look at my thread's stack",
        "-- ",
        "SELECT * FROM TABLE(QSYS2.STACK_INFO('*')) AS x",
        "  WHERE LIC_PROCEDURE_NAME IS NULL",
        "     ORDINAL_POSITION;",
        "",
        "--",
        "-- Look at all threads in my job",
        "-- ",
        "SELECT * FROM TABLE(QSYS2.STACK_INFO('*', 'ALL')) AS x",
        "  WHERE LIC_PROCEDURE_NAME IS NULL",
        "     ORDER BY THREAD_ID, ORDINAL_POSITION;",
        ""
      ]
    },
    {
      "name": "Application - Split an aggregated list",
      "content": [
        "-- Do the opposite of LISTAGG(), break apart a list of values",
        "SELECT ordinal_position,",
        "       LTRIM(element) AS special_authority",
        "   FROM qsys2.user_info u,",
        "        TABLE (",
        "           systools.split(input_list => special_authorities, ",
        "                          delimiter  => '   ')",
        "        ) b",
        "   WHERE u.authorization_name = 'SCOTTF';",
        "   "
      ]
    },
    {
      "name": "Application - Work with Data areas in QTEMP",
      "content": [
        "--",
        "-- Use SQL to work with a data area",
        "-- ",
        "cl:qsys/CRTDTAARA DTAARA(QTEMP/SECRET) TYPE(*CHAR) LEN(50) VALUE(SAUCE);",
        "",
        "select * from ",
        "  table(qsys2.data_area_info(DATA_AREA_LIBRARY => 'QTEMP',",
        "                             DATA_AREA_NAME    => 'SECRET'));",
        "",
        "call qsys2.qcmdexc('qsys/CHGDTAARA DTAARA(QTEMP/SECRET) VALUE(''SQL is the secret sauce'')');",
        "",
        "",
        "select * from ",
        "  table(qsys2.data_area_info(DATA_AREA_LIBRARY => 'QTEMP',",
        "                             DATA_AREA_NAME    => 'SECRET'));",
        ""
      ]
    },
    {
      "name": "Application - Work with numeric Data areas",
      "content": [
        "--",
        "-- Use SQL to extract and manipulate a numeric type data area",
        "-- ",
        "",
        "call qsys.create_sql_sample('TOYSTORE');",
        "",
        "call qsys2.qcmdexc('QSYS/CRTDTAARA DTAARA(TOYSTORE/SALESLEAD) TYPE(*DEC) LEN(20 2) VALUE(0.00) TEXT(''top dog'')');",
        "",
        "select * from qsys2.data_area_info",
        "  where data_area_library = 'TOYSTORE';",
        "",
        "begin",
        "declare temp_top_dog varchar(100);",
        "",
        "select sales into temp_top_dog from toystore.sales ",
        "  where sales is not null ",
        "  order by sales desc limit 1;",
        "",
        "call qsys2.qcmdexc('qsys/CHGDTAARA DTAARA(TOYSTORE/SALESLEAD) VALUE(' concat temp_top_dog concat ')');",
        "end;",
        "",
        "select * from qsys2.data_area_info",
        "  where data_area_library = 'TOYSTORE';"
      ]
    },
    {
      "name": "Application - Special case Data Areas",
      "content": [
        "--",
        "-- SQL alternative to RTVDTAARA",
        "--",
        "-- *GDA - Group data area.",
        "-- *LDA - Local data area.",
        "-- *PDA - Program initialization parameter data area.",
        "--",
        "",
        "select data_area_value from ",
        "  table(qsys2.data_area_info(DATA_AREA_LIBRARY => '*LIBL',",
        "                             DATA_AREA_NAME    => '*GDA'));",
        "                             ",
        "select data_area_value from ",
        "  table(qsys2.data_area_info(DATA_AREA_LIBRARY => '*LIBL',",
        "                             DATA_AREA_NAME    => '*LDA'));",
        "                             ",
        "select data_area_value from ",
        "  table(qsys2.data_area_info(DATA_AREA_LIBRARY => '*LIBL',",
        "                             DATA_AREA_NAME    => '*PDA'));",
        "                             ",
        "",
        "                             "
      ]
    },
    {
      "name": "Application - Bound Module - Optimization level detail",
      "content": [
        "--",
        "--  Are we taking advantage of ILE optimization?",
        "--",
        "select optimization_level, count(*) as optimization_level_count",
        "  from qsys2.bound_module_info",
        "  where program_library = 'APPLIB'",
        "  group by optimization_level",
        "  order by 2 desc;"
      ]
    },
    {
      "name": "Application - Bound Module - What's not built from IFS source?",
      "content": [
        "--",
        "--  Which modules are not being built with source residing in the IFS?",
        "--",
        "select *",
        "  from qsys2.bound_module_info",
        "  where program_library = 'QGPL'",
        "        and source_file_library not in ('QTEMP')",
        "        and source_stream_file_path is null",
        "  order by source_file_library, source_file, source_file_member desc;"
      ]
    },
    {
      "name": "Application - Bound SRVPGM - Deferred Activation",
      "content": [
        "--",
        "--  Are we using deferred service program activation?",
        "--",
        "select bound_service_program_activation, count(*) as bound_service_program_activation_count",
        "  from qsys2.BOUND_SRVPGM_INFO",
        "  where program_library = 'APPLIB'",
        "  group by bound_service_program_activation",
        "  order by 2 desc;"
      ]
    },
    {
      "name": "Application - Program Export/Import",
      "content": [
        "--",
        "--",
        "--   Alternative to: DSPSRVPGM SRVPGM(QSYS/QP0ZCPA) DETAIL(*PROCEXP) ",
        "--",
        "select *",
        "  from qsys2.PROGRAM_EXPORT_IMPORT_INFO ",
        "  where program_library = 'QSYS'    and ",
        "        program_name    = 'QP0ZCPA' and",
        "        object_type     = '*SRVPGM' and",
        "        symbol_usage    = '*PROCEXP';",
        ""
      ]
    },
    {
      "name": "Application - User Spaces (*USRSPC)",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "--",
        "--  Review user space attributes",
        "--",
        "select USER_SPACE_LIBRARY, USER_SPACE, SIZE, EXTENDABLE, INITIAL_VALUE",
        "  from qsys2.user_space_info",
        "  order by size desc;",
        "  "
      ]
    },
    {
      "name": "Application - User Spaces (*USRSPC)",
      "content": [
        "--  minvrm: V7R3M0",
        "",
        "--",
        "--  Examine the data within a user space",
        "-- ",
        "select *",
        "  from table (",
        "      QSYS2.USER_SPACE(USER_SPACE         => 'USRSPACE1', ",
        "                       USER_SPACE_LIBRARY => 'STORE42')",
        "    );",
        "  "
      ]
    },
    {
      "name": "Application - User Indexes (*USRIDX)",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "   ",
        "--",
        "--  Review user index attributes",
        "--",
        "select USER_INDEX_LIBRARY, USER_INDEX, ENTRY_TYPE, ENTRY_LENGTH, MAXIMUM_ENTRY_LENGTH, INDEX_SIZE,",
        "       IMMEDIATE_UPDATE, OPTIMIZATION, KEY_INSERTION, KEY_LENGTH, ENTRY_TOTAL, ENTRIES_ADDED,",
        "       ENTRIES_REMOVED, TEXT_DESCRIPTION",
        "  from qsys2.user_index_info",
        "  order by ENTRY_TOTAL * ENTRY_LENGTH desc;"
      ]
    },
    {
      "name": "Application - User Indexes (*USRIDX)",
      "content": [
        "--  minvrm: V7R3M0",
        "",
        "--",
        "--  Examine the user index entries",
        "--",
        "select *",
        "  from table (",
        "      QSYS2.USER_INDEX_ENTRIES(USER_INDEX         => 'USRINDEX1', ",
        "                               USER_INDEX_LIBRARY => 'STORE42')",
        "    );"
      ]
    },
    {
      "name": "Application - QCMDEXC scalar function",
      "content": [
        "--",
        "",
        "--",
        "-- Hold any jobs that started running an SQL statement more than 2 hours ago.",
        "--",
        "select JOB_NAME,",
        "       case",
        "         when QSYS2.QCMDEXC('HLDJOB ' concat JOB_NAME) = 1 then 'Job Held'",
        "         else 'Job not held'",
        "       end as HLDJOB_RESULT",
        "  from table (",
        "      QSYS2.ACTIVE_JOB_INFO(DETAILED_INFO => 'ALL')",
        "    )",
        "  where SQL_STATEMENT_START_TIMESTAMP < current timestamp - 2 hours;"
      ]
    },
    {
      "name": "Application - Program info - Activation Group analysis",
      "content": [
        "--",
        "--",
        "--  Summarize the activation group usage",
        "--",
        "select activation_group, count(*) as activation_group_name_count",
        "  from qsys2.program_info",
        "  where program_library = 'APPLIB'",
        "        and program_type = 'ILE'",
        "  group by activation_group",
        "  order by 2 desc;",
        ""
      ]
    },
    {
      "name": "Application - Program info - Ownership Summary",
      "content": [
        "--",
        "--",
        "--  Review adopted ownership (summary)",
        "--",
        "select program_owner, object_type, count(*) as application_owner_count",
        "  from qsys2.program_info",
        "  where program_library = 'APPLIB' and ",
        "        user_profile = '*OWNER'",
        "  group by program_owner, object_type",
        "  order by 2, 3 desc;",
        "  ",
        ""
      ]
    },
    {
      "name": "Application - Data Queues - Info and detail",
      "content": [
        "--",
        "",
        "--",
        "-- Review data queues, by percentage filled up",
        "--",
        "select data_queue_library, data_queue_name, data_queue_type, ",
        "       current_messages, maximum_messages, ",
        "       DEC(DEC(current_messages,19,2) / DEC(maximum_messages,19,2) * 100,19,2) AS percentage_used,",
        "       maximum_message_length, ",
        "       \"SEQUENCE\", key_length,",
        "       include_sender_id, specified_maximum_messages, initial_message_allocation,",
        "       current_message_allocation, force, automatic_reclaim, last_reclaim_timestamp,",
        "       enforce_data_queue_locks, text_description, remote_data_queue_library,",
        "       remote_data_queue, remote_location, relational_database_name,",
        "       appc_device_description, local_location, \"MODE\", remote_network_id",
        "  from qsys2.data_queue_info",
        "  order by 6 desc;",
        ""
      ]
    },
    {
      "name": "Application - Data Queues - Send and Receive",
      "content": [
        "--",
        "",
        "-- create a data queue",
        "cl: crtlib coolstuff;",
        "cl:CRTDTAQ DTAQ(COOLSTUFF/SQLCANDOIT) MAXLEN(32000) SENDERID(*YES);",
        "stop;",
        "",
        "-- review the state and status of the data queue",
        "select *",
        "  from qsys2.data_queue_info",
        "  where data_queue_library = 'COOLSTUFF';",
        "stop;",
        "",
        "-- Send a (character) message to the data queue",
        "call qsys2.send_data_queue(",
        "  message_data       => 'Hello World... today is ' concat current date, ",
        "  data_queue         => 'SQLCANDOIT',",
        "  data_queue_library => 'COOLSTUFF');",
        "",
        "stop;",
        "",
        "-- Retrieve the message from the data queue",
        "select *",
        "  from table (",
        "      qsys2.receive_data_queue(",
        "        data_queue => 'SQLCANDOIT', data_queue_library => 'COOLSTUFF')",
        "    );"
      ]
    },
    {
      "name": "Application - Data Queues - Keyed",
      "content": [
        "--",
        "",
        "cl:CRTDTAQ DTAQ(COOLSTUFF/KEYEDDQ) MAXLEN(64000) SEQ(*KEYED) KEYLEN(8) SENDERID(*YES) SIZE(*MAX2GB) TEXT('DQueue Time');",
        "",
        "select *",
        "  from qsys2.data_queue_info",
        "  where data_queue_library = 'COOLSTUFF';",
        "  ",
        "stop;",
        "-- Example of how to produce a key value",
        "values lpad(3, 8, 0);",
        "stop;",
        "",
        "call qsys2.send_data_queue(data_queue_library => 'COOLSTUFF',",
        "                           data_queue => 'KEYEDDQ',",
        "                           message_data => 'Keyed message 1',",
        "                           key_data => lpad(1, 8, 0) );  ",
        "                           ",
        "call qsys2.send_data_queue(data_queue_library => 'COOLSTUFF',",
        "                           data_queue => 'KEYEDDQ',",
        "                           message_data => 'Keyed message 2',",
        "                           key_data => lpad(2, 8, 0) );  ",
        "                           ",
        "call qsys2.send_data_queue(data_queue_library => 'COOLSTUFF',",
        "                           data_queue => 'KEYEDDQ',",
        "                           message_data => 'Keyed message 3',",
        "                           key_data => lpad(3, 8, 0) );",
        "",
        "stop;",
        "",
        "select *",
        "  from qsys2.data_queue_info",
        "  where data_queue_library = 'COOLSTUFF';",
        "                            ",
        "stop;",
        "",
        "select *",
        "  from table(qsys2.receive_data_queue(",
        "               data_queue_library => 'COOLSTUFF',",
        "               data_queue => 'KEYEDDQ',",
        "               key_data => lpad(3, 8, 0),",
        "               key_order => 'EQ'));",
        "",
        "",
        "select *",
        "  from table(qsys2.receive_data_queue(",
        "               data_queue_library => 'COOLSTUFF',",
        "               data_queue => 'KEYEDDQ',",
        "               key_data => lpad(99, 8, 0),",
        "               key_order => 'LT')); ",
        "",
        "",
        "select *",
        "  from table(qsys2.receive_data_queue(",
        "               data_queue_library => 'COOLSTUFF',",
        "               data_queue => 'KEYEDDQ',",
        "               key_data => lpad(0, 8, 0),",
        "               key_order => 'GT')); ",
        "               ",
        "                  "
      ]
    },
    {
      "name": "Application - Data Queues - UTF8 data",
      "content": [
        "--",
        "",
        "--",
        "-- Send unicode data to the data queue",
        "--",
        "call qsys2.send_data_queue_utf8(",
        "  message_data       => 'Hello World... today is ' concat current date, ",
        "  data_queue         => 'SQLCANDOIT',",
        "  data_queue_library => 'COOLSTUFF');",
        "",
        "stop;",
        "",
        "-- Retrieve the message from the data queue",
        "select message_data_utf8",
        "  from table (",
        "      qsys2.receive_data_queue(",
        "        data_queue => 'SQLCANDOIT', data_queue_library => 'COOLSTUFF')",
        "    );"
      ]
    },
    {
      "name": "Application - Data Queue Entries",
      "content": [
        "--",
        "",
        "--",
        "-- Data queue example",
        "--",
        "create schema TheQueen;",
        "cl:CRTDTAQ DTAQ(TheQueen/OrderDQ) MAXLEN(100) SEQ(*KEYED) KEYLEN(3);",
        "call qsys2.send_data_queue(message_data       => 'Sue - Dilly Bar',",
        "                           data_queue         => 'ORDERDQ', ",
        "                           data_queue_library => 'THEQUEEN',",
        "                           key_data           => '010');",
        "call qsys2.send_data_queue(message_data       => 'Sarah - Ice cream cake!',",
        "                           data_queue         => 'ORDERDQ', ",
        "                           data_queue_library => 'THEQUEEN',",
        "                           key_data           => '020');",
        "call qsys2.send_data_queue(message_data       => 'Scott - Strawberry Sundae',",
        "                           data_queue         => 'ORDERDQ', ",
        "                           data_queue_library => 'THEQUEEN',",
        "                           key_data           => '030');",
        "call qsys2.send_data_queue(message_data       => 'Scott - Pineapple Shake',",
        "                           data_queue         => 'ORDERDQ', ",
        "                           data_queue_library => 'THEQUEEN',",
        "                           key_data           => '030');",
        "stop;",
        "",
        "-- Search what's on the DQ",
        "select message_data, key_data from table",
        "     (qsys2.data_queue_entries('ORDERDQ', 'THEQUEEN', ",
        "                               selection_type => 'KEY',",
        "                               key_data       => '030',",
        "                               key_order      => 'EQ'));",
        "stop;",
        "",
        "-- Order fulfilled!",
        "select message_data, message_data_utf8, message_data_binary, key_data, sender_job_name, sender_current_user",
        "  from table (",
        "      qsys2.receive_data_queue(",
        "        data_queue => 'ORDERDQ', data_queue_library => 'THEQUEEN', ",
        "        remove => 'YES',",
        "        wait_time => 0, ",
        "        key_data => '030', ",
        "        key_order => 'EQ')",
        "    );",
        "stop;",
        "",
        "-- What remains on the queue?",
        "select * from table",
        "     (qsys2.data_queue_entries('ORDERDQ', 'THEQUEEN', ",
        "                               selection_type => 'KEY',",
        "                               key_data       => '030',",
        "                               key_order      => 'LE'));          "
      ]
    },
    {
      "name": "Application - Exit Point information",
      "content": [
        "--",
        "",
        "--",
        "-- What are the CL command exit programs?",
        "--",
        "select *",
        "  from qsys2.exit_point_info",
        "  where exit_point_name like 'QIBM_QCA_%_COMMAND%';"
      ]
    },
    {
      "name": "Application - Exit Program information",
      "content": [
        "--",
        "",
        "--",
        "-- What are the CL command exit programs?",
        "--",
        "select a.*, b.*",
        "  from qsys2.exit_program_info a, lateral ",
        "  (select * from table(qsys2.object_statistics(exit_program_library, '*PGM', exit_program))) b",
        "  where exit_point_name like 'QIBM_QCA_%_COMMAND%'",
        "  order by exit_point_name, exit_program_number;"
      ]
    },
    {
      "name": "Application - Watches",
      "content": [
        "--",
        "",
        "--",
        "-- What system watches exist?",
        "--",
        "select session_id, origin, origin_job, start_timestamp, user_id, status,",
        "       watch_session_type, job_run_priority, watched_message_count, watched_lic_log_count,",
        "       watched_pal_count, watch_program_library, watch_program, watch_program_call_start,",
        "       watch_program_call_end, time_limit, time_interval",
        "  from qsys2.watch_info order by session_id;"
      ]
    },
    {
      "name": "Application - Messages being Watched",
      "content": [
        "--",
        "",
        "--",
        "-- What messages are being watched?",
        "--",
        "select a.session_id, a.status, b.message_id, b.message_type,",
        "       b.message_queue_library, b.message_queue, b.message_job_name, b.message_job_user,",
        "       b.message_job_number, b.message_severity, b.message_relational_operator,",
        "       b.message_comparison_data, b.message_compare_against, b.comparison_data_ccsid",
        "  from qsys2.watch_info a, lateral (",
        "         select *",
        "           from table (",
        "               qsys2.watch_detail(session_id => a.session_id)",
        "             )",
        "       ) b",
        "  where watched_message_count > 0",
        "  order by session_id;"
      ]
    },
    {
      "name": "Application - Pending database transactions",
      "content": [
        "--",
        "",
        "select job_name, state_timestamp, user_name, t.*",
        "  from qsys2.db_transaction_info t",
        "  where local_changes_pending = 'YES'",
        "  order by t.state_timestamp;"
      ]
    }
  ],
  "Db2 for i Services": [
    {
      "name": "__ Where to find more detail __",
      "content": [
        "--",
        "--  Documentation can be found here:",
        "--  --------------------------------",
        "--  https://www.ibm.com/docs/en/i/7.5?topic=optimization-db2-i-services",
        "-- ",
        "--  Enabling Db2 PTF Group level and enhancement details can be found here:",
        "--  -----------------------------------------------------------------------",
        "--  https://ibm.biz/DB2foriServices",
        "--"
      ]
    },
    {
      "name": "Daily SQL Plan Cache management",
      "content": [
        "CL: CRTLIB SNAPSHOTS;",
        "CL: CRTLIB EVENTMONS;",
        "-- Purpose: This procedure captures detail on SQL queries.",
        "--          1) The 100 most expensive SQL queries are captured into a SQL Plan Cache Snapshot named SNAPSHOTS/SNP<julian-date>",
        "--          2) An SQL Plan Cache Event Monitor is started using a name SNAPSHOTS/EVT<julian-date>. The previous event monitor is ended.",
        "--          3) For both 1 & 2, only the 14 most recent days are kept online. ",
        "--          4) For both 1 & 2, the new monitor and snap shot are imported into System i Navigator / ACS SQL Performance Monitor",
        "CREATE OR REPLACE PROCEDURE SNAPSHOTS.DAILY_PC_MANAGEMENT()",
        "LANGUAGE SQL",
        "BEGIN",
        "DECLARE not_found CONDITION FOR '02000';",
        "DECLARE SNAP_NAME CHAR(10);",
        "DECLARE OLDEST_SNAP_NAME CHAR(10);",
        "DECLARE SNAP_COMMENT VARCHAR(100);",
        "DECLARE EVENT_MONITOR_NAME CHAR(10);",
        "DECLARE YESTERDAY_EVENT_MONITOR_NAME CHAR(10);",
        "DECLARE OLDEST_EVENT_MONITOR_NAME CHAR(10);",
        "DECLARE v_not_found BIGINT DEFAULT 0;",
        "",
        "-- A Julian date is the integer value representing a number of days",
        "-- from January 1, 4713 B.C. (the start of the Julian calendar) to ",
        "-- the date specified in the argument.",
        "SET SNAP_NAME = 'SNP' CONCAT JULIAN_DAY(current date);",
        "SET OLDEST_SNAP_NAME = 'SNP' CONCAT JULIAN_DAY(current date - 14 days);",
        "SET EVENT_MONITOR_NAME = 'EVT' CONCAT JULIAN_DAY(current date);",
        "SET OLDEST_EVENT_MONITOR_NAME = 'EVT' CONCAT JULIAN_DAY(current date - 14 days);",
        "SET YESTERDAY_EVENT_MONITOR_NAME = 'EVT' CONCAT JULIAN_DAY(current date - 1 day);",
        "---------------------------------------------------------------------------------------------------------",
        "-- Process the Top 100 most expensive queries",
        "---------------------------------------------------------------------------------------------------------",
        "-- Capture the topN queries and import the snapshot",
        "CALL QSYS2.DUMP_PLAN_CACHE_topN('SNAPSHOTS', SNAP_NAME, 100);",
        "",
        "-- Remove the oldest TOPN snapshot",
        "BEGIN",
        "  DECLARE CONTINUE HANDLER FOR not_found ",
        "     SET v_not_found = 1; ",
        "  CALL QSYS2.REMOVE_PC_SNAPSHOT('SNAPSHOTS', OLDEST_SNAP_NAME);",
        "END;",
        "",
        "---------------------------------------------------------------------------------------------------------",
        "-- Process prune plans using the SQL Plan Cache Event Monitor",
        "---------------------------------------------------------------------------------------------------------",
        "-- If we found yesterdays event monitor, end it ",
        "BEGIN",
        "  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION ",
        "     SET v_not_found = 1; ",
        "  CALL QSYS2.END_PLAN_CACHE_EVENT_MONITOR(YESTERDAY_EVENT_MONITOR_NAME);",
        "END;",
        "",
        "-- Start today's event monitor",
        "CALL QSYS2.START_PLAN_CACHE_EVENT_MONITOR('EVENTMONS', EVENT_MONITOR_NAME);",
        "",
        "-- Remove the oldest event monitor",
        "BEGIN",
        "  DECLARE CONTINUE HANDLER FOR not_found ",
        "     SET v_not_found = 1; ",
        "  CALL QSYS2.REMOVE_PC_EVENT_MONITOR('EVENTMONS', OLDEST_EVENT_MONITOR_NAME);",
        "END;",
        "END;",
        "",
        "",
        "--",
        "-- Add this call to a scheduled job that runs once per day",
        "--",
        "Call SNAPSHOTS.DAILY_PC_MANAGEMENT();"
      ]
    },
    {
      "name": "Automated index advice processor",
      "content": [
        "-- Purpose: This procedure using the index advice and find those indexes that have ",
        "--          been used by an MTI 500 times, and creates a permanent index.",
        "--          Also, the existing indexes that are at least 7 Days old are examined",
        "--          to determine if any of them should be removed due to lack of sufficient use.",
        "",
        "CL: CRTLIB DBESTUDY;",
        "",
        "CREATE OR REPLACE PROCEDURE DBESTUDY.WEEKLY_INDEX_MANAGEMENT()",
        "LANGUAGE SQL",
        "BEGIN",
        "",
        "CALL SYSTOOLS.ACT_ON_INDEX_ADVICE('TOYSTORE', NULL, NULL, 500, NULL);",
        "CALL SYSTOOLS.REMOVE_INDEXES('TOYSTORE', 500, ' 7 DAYS ');",
        "END;",
        "",
        "",
        "--",
        "-- Add this call to a scheduled job that runs once per day",
        "--",
        "Call DBESTUDY.WEEKLY_INDEX_MANAGEMENT();"
      ]
    },
    {
      "name": "Index Advice - Analyzing advice since last IPL",
      "content": [
        "-- Examine the condensed index advice where the index advice has occurred since the last IPL",
        "WITH last_ipl(ipl_time)",
        "   AS (SELECT job_entered_system_time",
        "          FROM TABLE(qsys2.job_info(job_status_filter => '*ACTIVE', ",
        "                                    job_user_filter   => 'QSYS')) x",
        "            WHERE job_name = '000000/QSYS/SCPF')",
        "   SELECT",
        "      * from  last_ipl, qsys2.condidxa where last_advised > ipl_time;",
        "      ",
        "--",
        "-- Examine the condensed index advice where Maintained Temporary Indexes (MTI)",
        "-- have been used since the last IPL",
        "--      ",
        "WITH last_ipl(ipl_time)",
        "   AS (SELECT job_entered_system_time",
        "          FROM TABLE(qsys2.job_info(job_status_filter => '*ACTIVE', ",
        "                                    job_user_filter   => 'QSYS')) x",
        "            WHERE job_name = '000000/QSYS/SCPF')",
        "   SELECT",
        "      * from  last_ipl, qsys2.condidxa ",
        "        where last_mti_used > ipl_time or last_mti_used_for_stats > ipl_time;",
        "      "
      ]
    },
    {
      "name": "Reset indexes statistics while in production",
      "content": [
        "-- This procedure resets QUERY_USE_COUNT and QUERY_STATISTICS_COUNT.",
        "-- The LAST_QUERY_USE, LAST_STATISTICS_USE, LAST_USE_DATE and ",
        "-- NUMBER_DAYS_USED are not affected.",
        "-- ",
        "-- Reset Query statistics over TOYSTORE/EMPLOYEE",
        "--",
        "CALL QSYS2.RESET_TABLE_INDEX_STATISTICS('TOYSTORE', 'EMPLOYEE');",
        "",
        "--",
        "-- Reset Query statistics over all tables in the TOYSTORE library",
        "--",
        "CALL QSYS2.RESET_TABLE_INDEX_STATISTICS('TOYSTORE','%');"
      ]
    },
    {
      "name": "Compare SYSROUTINE across two IBM i partitions",
      "content": [
        "-- Given a remote IBM i partition name and a library name",
        "-- Search for procedure and function differences ",
        "-- Receive a result set with any differences",
        "CALL SYSTOOLS.CHECK_SYSROUTINE('MYREMOTE', 'TOYSTORE', default);",
        "",
        "-- Search for procedure and function differences ",
        "-- Query SESSION.SYSRTNDIFF to see the differences",
        "CALL SYSTOOLS.CHECK_SYSROUTINE('MYREMOTE', 'TOYSTORE', 1);",
        "SELECT * FROM SESSION.SYSRTNDIFF;"
      ]
    },
    {
      "name": "Compare database constraints across two IBM i partitions",
      "content": [
        "-- Given a remote IBM i partition name and a library name",
        "-- Search for constraint differences ",
        "-- Receive a result set with any differences",
        "CALL SYSTOOLS.CHECK_SYSCST('MYREMOTE', 'TOYSTORE', default);",
        "",
        "-- Search for constraint differences ",
        "-- Query SESSION.SYSCSTDIFF to see the differences",
        "CALL SYSTOOLS.CHECK_SYSCST('MYREMOTE', 'TOYSTORE', 1);",
        "SELECT * FROM SESSION.SYSCSTDIFF;"
      ]
    },
    {
      "name": "Collect and study database statistics",
      "content": [
        "CL: CRTLIB dbestudy;",
        "--",
        "-- Capture point-in-time database file detail ",
        "-- for all files in the TOYSTORE library",
        "--",
        "CREATE OR REPLACE TABLE dbestudy.toystore_tables_runtime_details (table_schema,TABLE_NAME,",
        "   table_partition, partition_type, number_deleted_rows, number_rows, data_size, overflow,",
        "   variable_length_size, maintained_temporary_index_size, open_operations, close_operations,",
        "   insert_operations, update_operations, delete_operations, physical_reads, sequential_reads,",
        "   random_reads, keep_in_memory, media_preference, capture_time)",
        "     as (select table_schema, table_name, table_partition, partition_type, number_deleted_rows,",
        "           number_rows, data_size, overflow, variable_length_size,",
        "           maintained_temporary_index_size, open_operations, close_operations, insert_operations,",
        "           update_operations, delete_operations, physical_reads, sequential_reads, random_reads,",
        "           varchar(case keep_in_memory when '1' then 'yes' else 'no' end, default, 37),",
        "           varchar(case media_preference when 255 then 'ssd' else 'any' end, default, 37),",
        "           CURRENT TIMESTAMP",
        "          FROM qsys2.syspartitionstat",
        "          WHERE table_schema = 'TOYSTORE') WITH DATA ON REPLACE DELETE ROWS;",
        "  ",
        "--        ",
        "-- Identify candidates for physical file reorganization",
        "-- Only examine those files with more than a million rows deleted",
        "--",
        "SELECT TABLE_SCHEMA,",
        "       TABLE_NAME,",
        "       NUMBER_ROWS AS VALID_ROWS,",
        "       NUMBER_DELETED_ROWS AS DELETED_ROWS,",
        "       DATA_SIZE AS DATA_SPACE_SIZE_IN_BYTES,",
        "       DEC(DEC(NUMBER_DELETED_ROWS,19,2) / DEC(NUMBER_ROWS + NUMBER_DELETED_ROWS,19,2) *",
        "          100,19,2) AS DELETED_ROW_PERCENTAGE",
        "   FROM dbestudy.toystore_tables_runtime_details A",
        "   WHERE NUMBER_DELETED_ROWS > 1000000",
        "   ORDER BY DELETED_ROW_PERCENTAGE DESC;"
      ]
    },
    {
      "name": "Review the distribution of deleted records",
      "content": [
        "SELECT 1000000 - COUNT(*) AS DELETEDCNT",
        "   FROM star100g.item_fact A",
        "   GROUP BY BIGINT(RRN(A) / 1000000)",
        "   ORDER BY BIGINT(RRN(A) / 1000000);",
        "   "
      ]
    },
    {
      "name": "Enable alerts for files which are growing near the maximum",
      "content": [
        "CL: ALCOBJ OBJ((QSYS2/SYSLIMTBL *FILE *EXCL)) CONFLICT(*RQSRLS) ;",
        "CL: DLCOBJ OBJ((QSYS2/SYSLIMTBL *FILE *EXCL));",
        "",
        "CREATE OR REPLACE TRIGGER SCOTTF.SYSTEM_LIMITS_LARGE_FILE",
        "\tAFTER INSERT ON QSYS2.SYSLIMTBL ",
        "\tREFERENCING NEW AS N FOR EACH ROW MODE DB2ROW ",
        "SET OPTION USRPRF=*OWNER, DYNUSRPRF=*OWNER",
        "BEGIN ATOMIC ",
        "DECLARE V_CMDSTMT VARCHAR(200) ;",
        "DECLARE V_ERROR INTEGER;",
        "",
        "DECLARE EXIT HANDLER FOR SQLEXCEPTION ",
        "   SET V_ERROR = 1;",
        "",
        "/* ------------------------------------------------------------------ */",
        "/* If a table has exceeded 80% of this limit, alert the operator     */",
        "/* ------------------------------------------------------------------ */",
        "/* 15000 == MAXIMUM NUMBER OF ALL ROWS IN A PARTITION                 */",
        "/*          (max size = 4,294,967,288)                                */",
        "/* ------------------------------------------------------------------ */",
        "IF (N.LIMIT_ID = 15000 AND",
        "    N.CURRENT_VALUE > ((select supported_value from qsys2.sql_sizing where sizing_id = 15000) * 0.8)) THEN ",
        "",
        "SET V_CMDSTMT = 'SNDMSG MSG(''Table: ' ",
        "     CONCAT N.SYSTEM_SCHEMA_NAME CONCAT '/' CONCAT N.SYSTEM_OBJECT_NAME",
        "     CONCAT ' (' CONCAT N.SYSTEM_TABLE_MEMBER CONCAT ",
        "     ') IS GETTING VERY LARGE - ROW COUNT =  '",
        "     CONCAT CURRENT_VALUE CONCAT ' '') TOUSR(*SYSOPR) MSGTYPE(*INFO) ';",
        " CALL QSYS2.QCMDEXC( V_CMDSTMT );",
        "END IF;",
        "END;",
        "",
        "commit;",
        "",
        "-- Description: Determine if any user triggers have been created over the System Limits table",
        "SELECT * FROM QSYS2.SYSTRIGGERS ",
        "  WHERE EVENT_OBJECT_SCHEMA = 'QSYS2' AND EVENT_OBJECT_TABLE = 'SYSLIMTBL';"
      ]
    },
    {
      "name": "Interrogate interactive jobs",
      "content": [
        "WITH INTERACTIVE_JOBS(JOBNAME, STATUS, CPU, IO) AS (",
        "  SELECT job_name, job_status, cpu_time, total_disk_io_count ",
        "    FROM TABLE(qsys2.active_job_info('YES', 'QINTER', '*ALL')) AS a",
        "    WHERE JOB_STATUS IN ('LCKW', 'RUN') ",
        ")",
        "  SELECT JOBNAME, STATUS, CPU, IO, ",
        "         PROGRAM_LIBRARY_NAME,  PROGRAM_NAME,                       ",
        "         MODULE_LIBRARY_NAME,   MODULE_NAME,                        ",
        "         HEX(BIGINT(STATEMENT_IDENTIFIERS)) AS STMT,",
        "         PROCEDURE_NAME,        ACTIVATION_GROUP_NAME,",
        "         OBJTEXT,               v_client_ip_address",
        "     FROM INTERACTIVE_JOBS I,",
        "     LATERAL  ",
        "     (SELECT * FROM TABLE(qsys2.stack_info(JOBNAME)) j",
        "       WHERE program_library_name not like 'Q%'",
        "         order by ordinal_position desc",
        "           LIMIT 1) x,",
        "     LATERAL ",
        "     (SELECT OBJTEXT from table(qsys2.object_statistics(x.PROGRAM_LIBRARY_NAME, ",
        "                                                        '*PGM *SRVPGM',",
        "                                                        x.PROGRAM_NAME)) AS c) AS Y, ",
        "     LATERAL ",
        "     (SELECT v_client_ip_address from table(qsys2.get_job_info(JOBNAME)) AS d) AS z",
        "  ORDER BY CPU DESC;"
      ]
    },
    {
      "name": "Compare IFS details across 2 partitions",
      "content": [
        "--                (existence, not contents or attributes)",
        "",
        "-- Note: Replace <remote-rdb> with the remote RDB name of the target IBM i",
        "",
        "call              qsys2.qcmdexc('crtlib ifsinfo');",
        "call <remote-rdb>.qsys2.qcmdexc('crtlib ifsinfo');",
        "",
        "--",
        "-- Generate the IFS object detail",
        "--",
        "call              qsys2.qcmdexc('RTVDIRINF DIR(''/'') INFFILEPFX(IFSINFO2) INFLIB(IFSINFO)');",
        "call <remote-rdb>.qsys2.qcmdexc('RTVDIRINF DIR(''/'') INFFILEPFX(IFSINFO2) INFLIB(IFSINFO)');",
        "",
        "stop;",
        "",
        "--",
        "-- List all objects and directories",
        "--",
        "SELECT QEZDIRNAM1 as IFS_DIRECTORY, QEZOBJNAM as IFS_OBJECT_NAME, QEZOBJTYPE AS IFS_OBJECT_TYPE",
        "FROM IFSINFO.IFSINFO2O O",
        "     INNER JOIN  IFSINFO.IFSINFO2D D ON O.QEZDIRIDX = D.QEZDIRIDX",
        "ORDER BY 1,3,2 desc;",
        "",
        "--",
        "-- Formalize the IFS detail from the local partition",
        "--",
        "CREATE TABLE IFSINFO.local_IFS_objects",
        "   (IFS_DIRECTORY, IFS_OBJECT_NAME, IFS_OBJECT_TYPE)",
        "   AS (SELECT QEZDIRNAM1 as IFS_DIRECTORY, ",
        "              QEZOBJNAM  as IFS_OBJECT_NAME, ",
        "              QEZOBJTYPE AS IFS_OBJECT_TYPE",
        "          FROM IFSINFO.IFSINFO2O O",
        "               INNER JOIN  ",
        "               IFSINFO.IFSINFO2D D ",
        "               ON O.QEZDIRIDX = D.QEZDIRIDX)",
        "WITH DATA;",
        "",
        "",
        "--",
        "-- Bring over the IFS detail from the remote partition",
        "--",
        "CREATE TABLE IFSINFO.remote_IFS_objects",
        "   (IFS_DIRECTORY, IFS_OBJECT_NAME, IFS_OBJECT_TYPE)",
        "   AS (SELECT QEZDIRNAM1 as IFS_DIRECTORY, ",
        "              QEZOBJNAM  as IFS_OBJECT_NAME, ",
        "              QEZOBJTYPE AS IFS_OBJECT_TYPE",
        "          FROM <remote-rdb>.IFSINFO.IFSINFO2O O",
        "               INNER JOIN  ",
        "               <remote-rdb>.IFSINFO.IFSINFO2D D ",
        "               ON O.QEZDIRIDX = D.QEZDIRIDX)",
        "WITH DATA;",
        "",
        "-- Raw count of objects",
        "select count(*) from IFSINFO.local_IFS_objects;",
        "select count(*) from IFSINFO.remote_IFS_objects;",
        "",
        "--",
        "-- Compare and contrast the two partitions. ",
        "-- Any rows returned represent an IFS difference",
        "--",
        "SELECT 'Production' AS \"System Name\", ",
        "     a.IFS_DIRECTORY, a.IFS_OBJECT_NAME, a.IFS_OBJECT_TYPE",
        "     FROM IFSINFO.local_IFS_objects a LEFT EXCEPTION JOIN ",
        "          IFSINFO.remote_IFS_objects b ",
        "          ON a.IFS_DIRECTORY   IS NOT DISTINCT FROM b.IFS_DIRECTORY   AND",
        "             a.IFS_OBJECT_NAME IS NOT DISTINCT FROM b.IFS_OBJECT_NAME AND",
        "             a.IFS_OBJECT_TYPE IS NOT DISTINCT FROM b.IFS_OBJECT_TYPE  ",
        "UNION ALL",
        "SELECT 'Failover' AS \"System Name\", ",
        "     b.IFS_DIRECTORY, b.IFS_OBJECT_NAME, b.IFS_OBJECT_TYPE",
        "     FROM IFSINFO.local_IFS_objects a RIGHT EXCEPTION JOIN ",
        "          IFSINFO.remote_IFS_objects b ",
        "          ON b.IFS_DIRECTORY   IS NOT DISTINCT FROM a.IFS_DIRECTORY   AND",
        "             b.IFS_OBJECT_NAME IS NOT DISTINCT FROM a.IFS_OBJECT_NAME AND",
        "             b.IFS_OBJECT_TYPE IS NOT DISTINCT FROM a.IFS_OBJECT_TYPE",
        "  ORDER BY IFS_DIRECTORY, IFS_OBJECT_NAME,IFS_OBJECT_TYPE;"
      ]
    },
    {
      "name": "Find and fix SQL DYNUSRPRF setting",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "-- Which SQL programs or services have a mismatch between user profile and dynamic user profile (full)",
        "--",
        "select user_profile, dynamic_user_profile, program_schema, program_name, program_type,",
        "       module_name, program_owner, program_creator, creation_timestamp, default_schema,",
        "       \"ISOLATION\", concurrentaccessresolution, number_statements, program_used_size,",
        "       number_compressions, statement_contention_count, original_source_file,",
        "       original_source_file_ccsid, routine_type, routine_body, function_origin,",
        "       function_type, number_external_routines, extended_indicator, c_nul_required,",
        "       naming, target_release, earliest_possible_release, rdb, consistency_token,",
        "       allow_copy_data, close_sql_cursor, lob_fetch_optimization, decimal_point,",
        "       sql_string_delimiter, date_format, date_separator, time_format, time_separator,",
        "       dynamic_default_schema, current_rules, allow_block, delay_prepare, user_profile,",
        "       dynamic_user_profile, sort_sequence, language_identifier, sort_sequence_schema,",
        "       sort_sequence_name, rdb_connection_method, decresult_maximum_precision,",
        "       decresult_maximum_scale, decresult_minimum_divide_scale, decfloat_rounding_mode,",
        "       decfloat_warning, sqlpath, dbgview, dbgkey, last_used_timestamp, days_used_count,",
        "       last_reset_timestamp, system_program_name, system_program_schema, iasp_number,",
        "       system_time_sensitive",
        "  from qsys2.sysprogramstat",
        "  where system_program_schema = 'SCOTTF'",
        "        and dynamic_user_profile = '*USER' and program_type in ('*PGM', '*SRVPGM')",
        "        and ((user_profile = '*OWNER')",
        "          or (user_profile = '*NAMING'",
        "            and naming = '*SQL'))",
        "  order by program_name;",
        "stop;",
        "",
        "--",
        "-- Which SQL programs or services have a mismatch between user profile and dynamic user profile (full)",
        "--",
        "select qsys2.delimit_name(system_program_schema) as lib, ",
        "       qsys2.delimit_name(system_program_name) as pgm, ",
        "       program_type as type",
        "  from qsys2.sysprogramstat",
        "  where system_program_schema = 'SCOTTF'",
        "        and dynamic_user_profile = '*USER' ",
        "        and program_type in ('*PGM', '*SRVPGM')",
        "        and ((user_profile = '*OWNER')",
        "          or (user_profile = '*NAMING'",
        "            and naming = '*SQL'))",
        "  order by program_name;",
        "",
        "stop;  ",
        "",
        "  ",
        "",
        "--",
        "-- Find misaligned use of SQL's Dynamic User Profile and swap the setting",
        "--",
        "CREATE OR REPLACE PROCEDURE coolstuff.swap_dynusrprf(target_library varchar(10))",
        "   BEGIN",
        "      DECLARE v_eof INTEGER DEFAULT 0;",
        "      DECLARE Prepare_Attributes VARCHAR(100) default ' ';",
        "      declare sql_statement_text clob(10K) ccsid 37;",
        "      declare v_lib varchar(10) ccsid 37;",
        "      declare v_pgm varchar(10) ccsid 37;",
        "      declare v_type varchar(7) ccsid 37;",
        "      DECLARE obj_cursor CURSOR FOR ",
        "select qsys2.delimit_name(system_program_schema) as lib, ",
        "       qsys2.delimit_name(system_program_name) as pgm, ",
        "       program_type as type",
        "  from qsys2.sysprogramstat",
        "  where program_schema = target_library",
        "        and dynamic_user_profile = '*USER'",
        "        and program_type in ('*PGM', '*SRVPGM')",
        "        and ((user_profile = '*OWNER')",
        "          or (user_profile = '*NAMING'",
        "            and naming = '*SQL'))",
        "  order by program_name;",
        " ",
        "      OPEN obj_cursor;",
        "      loop_through_data: BEGIN",
        "                            DECLARE CONTINUE HANDLER FOR SQLSTATE '02000'",
        "                               BEGIN",
        "                               SET v_eof = 1;",
        "                         END;                                                       ",
        "       l3 : LOOP",
        "           FETCH obj_cursor INTO v_lib, v_pgm, v_type;",
        "           IF (v_eof = 1)",
        "           THEN",
        "              LEAVE l3;",
        "           END IF;",
        "           ",
        "           -- Swap the SQL DYNUSRPRF setting",
        "           CALL QSYS2.SWAP_DYNUSRPRF(v_lib, v_pgm, v_type);",
        "           call systools.lprintf('DYNUSRPRF swapped for: ' concat v_lib concat '/' concat v_pgm concat ' ' concat v_type);",
        "",
        "        END LOOP; /* L3 */",
        "      CLOSE obj_cursor;",
        "   END loop_through_data;",
        "END;",
        "",
        "stop;",
        "",
        "-- Process all the misaligned SQL DynUsrPrf settings for a specific library",
        "call coolstuff.swap_dynusrprf('SCOTTF');",
        "",
        "  "
      ]
    },
    {
      "name": "Utilities - Database Catalog analyzer",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "--  Find all database files in the QGPL library and validate that associated ",
        "--  Database Cross Reference file entries contain the correct and complete detail",
        "--",
        "select *",
        "  from table (",
        "      qsys2.analyze_catalog(option => 'DBXREF', library_name => 'QGPL')",
        "    );",
        "stop;  ",
        ""
      ]
    },
    {
      "name": "Utilities - Database file data validation",
      "content": [
        "--  Note: If no rows are returned, there are no instances of invalid data",
        "--  minvrm: V7R3M0",
        "--",
        "--",
        "-- Validate all rows within the last member of one file",
        "--",
        "select *",
        "  from table (",
        "      systools.validate_data(",
        "        library_name => 'MARYNA', file_name => 'BADDATA', member_name => '*LAST')",
        "    );",
        "stop;",
        "",
        "--",
        "-- Validate all rows within all members of one file",
        "--",
        "select *",
        "  from table (",
        "      systools.validate_data_file(",
        "        library_name => 'MARYNA', file_name => 'BADDATA')",
        "    );",
        "stop;",
        "",
        "--",
        "-- Validate all rows within all members of all files within a library",
        "--",
        "select *",
        "  from table (",
        "      systools.validate_data_library(",
        "        library_name => 'MARYNA')",
        "    );",
        "stop;"
      ]
    },
    {
      "name": "Utilities - Compare Database files",
      "content": [
        "--  Note: If no rows are returned, there are no miscompares",
        "--  minvrm: V7R4M0",
        "--",
        "",
        "--  For evaluation purposes, create two sample databases",
        "call qsys.create_sql_sample('DOORSTORE1');",
        "call qsys.create_sql_sample('DOORSTORE2');",
        "",
        "--",
        "-- Compare will find no differences and return an empty result set",
        "--",
        "select *",
        "  from table (",
        "      qsys2.compare_file(",
        "        library1 => 'DOORSTORE1', ",
        "        file1 => 'SALES', ",
        "        library2 => 'DOORSTORE2',",
        "        file2 => 'SALES', ",
        "        compare_attributes => 'YES', ",
        "        compare_data => 'YES')",
        "    );",
        "stop;  ",
        "",
        "-- Change one of the files to introduce a difference",
        "update doorstore2.sales set sales = sales + 1 limit 3;",
        "",
        "--",
        "-- Compare will find 3 rows differ",
        "--",
        "select *",
        "  from table (",
        "      qsys2.compare_file(",
        "        library1 => 'DOORSTORE1', ",
        "        file1 => 'SALES', ",
        "        library2 => 'DOORSTORE2',",
        "        file2 => 'SALES', ",
        "        compare_attributes => 'YES', ",
        "        compare_data => 'YES')",
        "    );",
        "stop;    ",
        "",
        "",
        "--",
        "-- Compare will return as soon as the first difference is found",
        "--",
        "select *",
        "  from table (",
        "      qsys2.compare_file(",
        "        library1 => 'DOORSTORE1', ",
        "        file1 => 'SALES', ",
        "        library2 => 'DOORSTORE2',",
        "        file2 => 'SALES', ",
        "        compare_attributes => 'QUICK', ",
        "        compare_data => 'QUICK')",
        "    );",
        "stop;  "
      ]
    },
    {
      "name": "SQE - Query Supervisor - Add a threshold",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "",
        "--",
        "-- Add a threshold for elapsed time of queries coming in over QZDA jobs",
        "--",
        "CALL QSYS2.ADD_QUERY_THRESHOLD(THRESHOLD_NAME  => 'ZDA QUERY TIME > 30',",
        "                               THRESHOLD_TYPE  => 'ELAPSED TIME',",
        "                               THRESHOLD_VALUE => 30,",
        "                               SUBSYSTEMS      => 'QUSRWRK',",
        "                               JOB_NAMES       =>  'QZDA*', ",
        "                               LONG_COMMENT    => 'ZDA Queries running longer than 30 seconds');",
        "",
        "--",
        "-- Review configured Query Supervisor thresholds",
        "--",
        "select *",
        "  from qsys2.query_supervisor;"
      ]
    },
    {
      "name": "SQE - Query Supervisor - Exit programs",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "",
        "--",
        "-- Review the Query Supervisor exit programs",
        "--  ",
        "select *",
        "  from QSYS2.EXIT_PROGRAM_INFO where EXIT_POINT_NAME = 'QIBM_QQQ_QRY_SUPER';"
      ]
    },
    {
      "name": "SQE - Query Supervisor - Remove a threshold",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "",
        "--",
        "-- Remove a Query Supervisor threshold ",
        "--",
        "CALL QSYS2.REMOVE_QUERY_THRESHOLD(THRESHOLD_NAME  => 'ZDA QUERY TIME > 30');",
        "",
        "--",
        "-- Review configured Query Supervisor thresholds",
        "--",
        "select *",
        "  from qsys2.query_supervisor;"
      ]
    },
    {
      "name": "SQE - Query Supervisor - Working example",
      "content": [
        "--  minvrm: V7R3M0",
        "--",
        "",
        "--",
        "-- This example shows how to establish a Query Supervisor threshold",
        "-- that is looking at job name of QZDA* and supervising queries that",
        "-- are taking longer than 30 seconds of elapsed time to complete.",
        "-- ",
        "-- When such a query is encountered, the exit program sends an",
        "-- SQL7064 message to QSYSOPR and then directs SQE to ",
        "-- terminate the query.",
        "--",
        "stop;",
        "",
        "call qsys2.qcmdexc('CRTSRCPF FILE(QTEMP/ZDA_ELAP1) RCDLEN(140)');",
        "call qsys2.qcmdexc('addpfm file(qtemp/ZDA_ELAP1) mbr(ZDA_ELAP1)');",
        "insert into qtemp.ZDA_ELAP1",
        "  values",
        " (1, 010101, '#include <stdlib.h>'),",
        " (2, 010101, '#include <string.h>'),",
        " (3, 010101, '#include <stddef.h> '),",
        " (4, 010101, '#include <iconv.h>'),",
        " (5, 010101, '#include <stdio.h>'),",
        " (6, 010101, '#include <except.h>'), ",
        " (7, 010101, '#include <eqqqrysv.h>'),",
        " (8, 010101, 'static void convertThresholdNameToJobCCSID(const char* input, char* output)'),",
        " (9, 010101, '{'),",
        " (10,010101, '  iconv_t converter;'),",
        " (11,010101, '  char from_code[32], to_code[32];'),",
        " (12,010101, '  size_t input_bytes, output_bytes;'),",
        " (13,010101, '  int iconv_rc;'),",
        " (14,010101, '  memset(from_code, 0, sizeof(from_code));'),",
        " (15,010101, '  memset(to_code, 0, sizeof(to_code));'),",
        " (16,010101, '  memcpy(from_code, \"IBMCCSID012000000000\", 20);'),",
        " (17,010101, '  memcpy(to_code, \"IBMCCSID00000\", 13);'),",
        " (18,010101, '  converter = iconv_open(to_code, from_code);'),",
        " (19,010101, '  if (converter.return_value == 0) {'),",
        " (20,010101, '    input_bytes = 60;'),",
        " (21,010101, '   output_bytes = 30;'),",
        " (22,010101, '    iconv_rc = iconv(converter,'),",
        " (23,010101, '                     &input, &input_bytes,'),",
        " (24,010101, '                     &output, &output_bytes);'),",
        " (25,010101, '    iconv_close(converter);'),",
        " (26,010101, '    if (iconv_rc >= 0)'),",
        " (27,010101, '      return; /* Conversion was successful. */'),",
        " (28,010101, '  }'),",
        " (29,010101, '  sprintf(output, \"iconv_open() failed with: %d\", converter.return_value);'),",
        " (30,010101, '}'),",
        " (31,010101, 'int trimmed_length(const char* str, int len)'),",
        " (32,010101, '{'),",
        " (33,010101, '  const char* first_blank = memchr(str, '' '', len);'),",
        " (34,010101, '  if (first_blank)'),",
        " (35,010101, '    return first_blank - str;'),",
        " (36,010101, '  return len;'),",
        " (37,010101, '}'),",
        " (38,010101, 'int main(int argc, char* argv[])'),",
        " (39,010101, '{'),",
        " (40,010101, '  char length_string[10];'),",
        " (41,010101, '  char cmd[600];'),",
        " (42,010101, '  char thresholdNameInJobCCSID[31];'),",
        " (43,010101, '  char msg[512];'),",
        " (44,010101, '  const QQQ_QRYSV_QRYS0100_t* input = (QQQ_QRYSV_QRYS0100_t*)argv[1];'),",
        " (45,010101, '  int* rc = (int*)argv[2];'),",
        " (46,010101, '  memset(thresholdNameInJobCCSID, 0, sizeof(thresholdNameInJobCCSID));'),",
        " (47,010101, '  convertThresholdNameToJobCCSID(input->Threshold_Name,thresholdNameInJobCCSID);'),",
        " (48,010101, '  if (memcmp(\"ZDA QUERY TIME > 30\", thresholdNameInJobCCSID, 19) != 0) '),",
        " (49,010101, '    { return; } '),",
        " (50,010101, '  *rc = 1; /* terminate the query */'),",
        " (51,010101, '  memset(msg, 0, sizeof(msg));'),",
        " (52,010101, '  strcat(msg, \"Query Supervisor: \");'),",
        " (53,010101, '  strcat(msg, thresholdNameInJobCCSID);'),",
        " (54,010101, '  strcat(msg,\" REACHED IN JOB \");'),",
        " (55,010101, '  strncat(msg, input->Job_Number, trimmed_length(input->Job_Number,6));'),",
        " (56,010101, '  strcat(msg, \"/\");'),",
        " (57,010101, '  strncat(msg, input->Job_User, trimmed_length(input->Job_User,10));'),",
        " (58,010101, '  strcat(msg, \"/\");'),",
        " (59,010101, '  strncat(msg, input->Job_Name, trimmed_length(input->Job_Name,10));'),",
        " (60,010101, '  strcat(msg, \" FOR USER: \");'),",
        " (61,010101, '  strncat(msg, input->User_Name, 10);'),",
        " (62,010101, '  memset(length_string, 0, sizeof(length_string));'),",
        " (63,010101, '  sprintf(length_string,\"%d\",strlen(msg));'),",
        " (64,010101, '  memset(cmd, 0, sizeof(cmd));'),",
        " (65,010101, '  strcat(cmd, \"SBMJOB CMD(RUNSQL SQL(''call qsys2.send_message(''''SQL7064'''',\");'),",
        " (66,010101, '  strcat(cmd,length_string);'),",
        " (67,010101, '  strcat(cmd,\",''''\");'),",
        " (68,010101, '  strcat(cmd, msg);'),",
        " (69,010101, '  strcat(cmd, \"'''')''))\");'),",
        " (70,010101, '  system(cmd);'),",
        " (71,010101, '}');",
        " ",
        "cl: crtlib supervisor;",
        "",
        "call qsys2.qcmdexc('CRTCMOD MODULE(QTEMP/ZDA_ELAP1) SRCFILE(QTEMP/ZDA_ELAP1)  OUTPUT(*print)  ');",
        "call qsys2.qcmdexc('CRTPGM PGM(SUPERVISOR/ZDA_ELAP1) MODULE(QTEMP/ZDA_ELAP1) ACTGRP(*CALLER) USRPRF(*OWNER) DETAIL(*NONE)');",
        " ",
        "call qsys2.qcmdexc('ADDEXITPGM EXITPNT(QIBM_QQQ_QRY_SUPER) FORMAT(QRYS0100) PGMNBR(*LOW) PGM(SUPERVISOR/ZDA_ELAP1) THDSAFE(*YES) TEXT(''ZDA Elapsed Time > 30 seconds'')') ;",
        "",
        "",
        "--",
        "-- Review any instances where the Query Supervisor exit program terminated a ZDA query",
        "--",
        "select *",
        "  from table (",
        "      QSYS2.MESSAGE_QUEUE_INFO(MESSAGE_FILTER => 'ALL')",
        "    )",
        "  where message_id = 'SQL7064'",
        "  order by MESSAGE_TIMESTAMP desc; ",
        "  ",
        ""
      ]
    }
  ],
  "SYSTOOLS for you": [
    {
      "name": "Return Work Management Class info",
      "content": [
        "call qsys2.override_qaqqini(1, '', '');",
        "call qsys2.override_qaqqini(2,  ",
        "                            'SQL_GVAR_BUILD_RULE', ",
        "                            '*EXIST');",
        "--",
        "CREATE OR REPLACE FUNCTION systools.class_info (",
        "         p_library_name VARCHAR(10)",
        "      )",
        "   RETURNS TABLE (",
        "      library VARCHAR(10) CCSID 1208, class VARCHAR(10) CCSID 1208, class_text VARCHAR(",
        "      100) CCSID 1208, last_use TIMESTAMP, use_count INTEGER, run_priority INTEGER,",
        "      timeslice_seconds INTEGER, default_wait_time_seconds INTEGER",
        "   )",
        "   NOT DETERMINISTIC",
        "   EXTERNAL ACTION",
        "   MODIFIES SQL DATA",
        "   NOT FENCED",
        "   SET OPTION COMMIT = *NONE",
        "BEGIN",
        "   DECLARE v_print_line CHAR(133);",
        "   DECLARE local_sqlcode INTEGER;",
        "   DECLARE local_sqlstate CHAR(5);",
        "   DECLARE v_message_text VARCHAR(70);",
        "   DECLARE v_dspcls VARCHAR(300);",
        "   --",
        "   -- DSPCLS detail",
        "   --",
        "   DECLARE v_class CHAR(10);",
        "   DECLARE v_class_library CHAR(10);",
        "   DECLARE v_run_priority INTEGER;",
        "   DECLARE v_timeslice_seconds INTEGER;",
        "   DECLARE v_default_wait_time_seconds INTEGER;",
        "   --",
        "   -- OBJECT_STATISTICS detail",
        "   --",
        "   DECLARE find_classes_query_text VARCHAR(500);",
        "   DECLARE v_class_text CHAR(100);",
        "   DECLARE v_job_name VARCHAR(28);",
        "   DECLARE v_last_use TIMESTAMP;",
        "   DECLARE v_use_count INTEGER;",
        "   DECLARE c_find_classes CURSOR FOR find_classes_query;",
        "   DECLARE c_find_dspcls_output CURSOR FOR SELECT job_name",
        "      FROM qsys2.output_queue_entries_basic",
        "      WHERE user_name = SESSION_USER AND",
        "            spooled_file_name = 'QPDSPCLS' AND",
        "            user_data = 'DSPCLS'",
        "      ORDER BY create_timestamp DESC",
        "      LIMIT 1;",
        "   DECLARE c_dspcls_output CURSOR FOR SELECT c1",
        "      FROM SESSION.splf x",
        "      WHERE RRN(x) > 4",
        "      ORDER BY RRN(x);",
        "   DECLARE CONTINUE HANDLER FOR SQLEXCEPTION",
        "   BEGIN",
        "      GET DIAGNOSTICS CONDITION 1",
        "            local_sqlcode = db2_returned_sqlcode, local_sqlstate = returned_sqlstate;",
        "      SET v_message_text = 'systools.class_info() failed with: ' CONCAT local_sqlcode",
        "               CONCAT '  AND ' CONCAT local_sqlstate;",
        "      SIGNAL SQLSTATE 'QPC01' SET MESSAGE_TEXT = v_message_text;",
        "   END;",
        "   DECLARE GLOBAL TEMPORARY TABLE splf (c1 CHAR(133))",
        "      WITH REPLACE;",
        "   SET find_classes_query_text =",
        "   'select OBJNAME  , rtrim(OBJTEXT)  , LAST_USED_TIMESTAMP  , DAYS_USED_COUNT  FROM TABLE (OBJECT_STATISTICS('''",
        "            CONCAT p_library_name CONCAT ''',''CLS    '')) AS a ';",
        "   PREPARE find_classes_query FROM find_classes_query_text;",
        "   OPEN c_find_classes;",
        "   l1: LOOP",
        "      FETCH FROM c_find_classes INTO v_class, v_class_text, v_last_use, v_use_count;",
        "      GET DIAGNOSTICS CONDITION 1 local_sqlcode = db2_returned_sqlcode,",
        "                  local_sqlstate = returned_sqlstate;",
        "      IF (local_sqlstate = '02000') THEN",
        "         CLOSE c_find_classes;",
        "         RETURN;",
        "      END IF;",
        "      SET v_dspcls = 'DSPCLS CLS(' CONCAT RTRIM(p_library_name) CONCAT '/' CONCAT",
        "               RTRIM(v_class) CONCAT ') OUTPUT(*PRINT)';",
        "      CALL qsys2.qcmdexc(v_dspcls);",
        "      OPEN c_find_dspcls_output;",
        "      FETCH FROM c_find_dspcls_output INTO v_job_name;",
        "      CLOSE c_find_dspcls_output;",
        "      CALL qsys2.qcmdexc('CPYSPLF FILE(QPDSPCLS) TOFILE(QTEMP/SPLF) SPLNBR(*LAST) JOB('",
        "            CONCAT v_job_name CONCAT ') ');",
        "      OPEN c_dspcls_output;",
        "      FETCH FROM c_dspcls_output INTO v_print_line;",
        "      SET v_run_priority = INT(SUBSTR(v_print_line, 56, 10));",
        "      FETCH FROM c_dspcls_output INTO v_print_line;",
        "      SET v_timeslice_seconds = INT(SUBSTR(v_print_line, 56, 10)) / 1000;",
        "      FETCH FROM c_dspcls_output INTO v_print_line; /* skip eligible for purge */",
        "      FETCH FROM c_dspcls_output INTO v_print_line;",
        "      IF SUBSTR(v_print_line, 56, 6) = '*NOMAX' THEN",
        "         SET v_default_wait_time_seconds = NULL;",
        "      ELSE SET v_default_wait_time_seconds = INT(SUBSTR(v_print_line, 56, 10));",
        "      END IF;",
        "      CLOSE c_dspcls_output;",
        "      CALL qsys2.qcmdexc('DLTSPLF FILE(QPDSPCLS)  SPLNBR(*LAST) JOB(' CONCAT v_job_name",
        "            CONCAT ') ');",
        "      PIPE (",
        "         p_library_name,",
        "         v_class, v_class_text, v_last_use, v_use_count, v_run_priority,",
        "         v_timeslice_seconds, v_default_wait_time_seconds);",
        "   END LOOP; /* L1 */",
        "   CLOSE c_find_classes;",
        "END;",
        "",
        "",
        "create or replace table classtoday.cdetail as (",
        "SELECT *",
        "   FROM TABLE (",
        "         systools.class_info('QSYS')",
        "      )) with data on replace delete rows;",
        "      ",
        "select * from classtoday.cdetail;"
      ]
    }
  ],
  "SQL Built-in Functions": [
    {
      "name": "INTERPRET - Simple examples",
      "content": [
        "--  minvrm:  v7r3m0",
        "",
        "-- Interpret binary as varying character",
        "values interpret(x'0003C1C2C3' as varchar(3)); ",
        "-- returns ABC",
        "",
        "-- Interpret binary as integer",
        "VALUES INTERPRET(X'00000011' AS integer);",
        "-- 17",
        "",
        "-- Interpret binary as smallint",
        "VALUES INTERPRET(BX'000A' as SMALLINT);"
      ]
    },
    {
      "name": "INTERPRET - Blob containing character data",
      "content": [
        "--  minvrm:  v7r3m0",
        "",
        "-- Interpret binary large object (BLOB) as character",
        "create table qtemp.tempblob ( jblob blob(100) );",
        "insert into qtemp.tempblob (jblob) values(BX'F1F2F3F4');",
        "select * from qtemp.tempblob;",
        "select interpret(substr(jblob,1,4) as char(4)) from qtemp.tempblob; "
      ]
    },
    {
      "name": "INTERPRET - Data Journal ESD",
      "content": [
        "--  minvrm:  v7r3m0",
        "",
        "-- Interpret journal entry specific data (ESD)",
        "create schema demo;",
        "set schema demo;",
        "create table interpret1 (ddate date, ttime time, sint smallint, iint integer, bint bigint);",
        "insert into interpret1",
        "  values (current date, current time, 1, 2, 3);",
        "",
        "select date(interpret(substr(entry_data, 1, 10) as char(10))) as ddate,",
        "       time(interpret(substr(entry_data, 11, 8) as char(8))) as ttime,",
        "       interpret(substr(entry_data, 19, 2) as smallint) as sint,",
        "       interpret(substr(entry_data, 21, 4) as int) as iint,",
        "       interpret(substr(entry_data, 25, 8) as bigint) as bint",
        "  from table (",
        "      qsys2.display_journal('DEMO', 'QSQJRN', journal_entry_types => 'PT')",
        "    );",
        "    "
      ]
    }
  ],
  "Geospatial Analytics": [
    {
      "name": "ST_Area",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Create a table with a polygon column and insert several polygons that represent different New York City Parks",
        "CREATE TABLE sample_parks (park_name VARCHAR(50), geometry QSYS2.ST_POLYGON);",
        "INSERT INTO sample_parks (park_name, geometry) VALUES",
        "  ('Central Park', QSYS2.ST_POLYGON('polygon((-73.9817 40.7682, -73.9581 40.8005, -73.9495 40.7968, -73.9732 40.7644, -73.9817 40.7682))')),",
        "  ('Washington Square Park', QSYS2.ST_POLYGON('polygon((-73.9995 40.7310, -73.9986 40.7321, -73.9957 40.7307, -73.9966 40.7297, -73.9995 40.7310))'));",
        "",
        "-- Find the area of each New York City Park in square meters",
        "SELECT park_name, ",
        "       QSYS2.ST_AREA(geometry) as area_square_meters, ",
        "       QSYS2.ST_AREA(geometry) * 0.000247 as area_acres",
        " FROM sample_parks;"
      ]
    },
    {
      "name": "ST_AsBinary",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Create a table with a polygon column and insert several polygons that represent different New York City Parks",
        "CREATE TABLE sample_parks (park_name VARCHAR(50), geometry QSYS2.ST_POLYGON);",
        "INSERT INTO sample_parks (park_name, geometry) VALUES",
        "  ('Central Park', QSYS2.ST_POLYGON('polygon((-73.9817 40.7682, -73.9581 40.8005, -73.9495 40.7968, -73.9732 40.7644, -73.9817 40.7682))')),",
        "  ('Washington Square Park', QSYS2.ST_POLYGON('polygon((-73.9995 40.7310, -73.9986 40.7321, -73.9957 40.7307, -73.9966 40.7297, -73.9995 40.7310))'));",
        " ",
        "-- Find the area of each New York City Park in square meters",
        "SELECT park_name, ",
        "       QSYS2.ST_AREA(geometry) as area_square_meters, ",
        "       QSYS2.ST_AREA(geometry) * 0.000247 as area_acres",
        " FROM sample_parks;"
      ]
    },
    {
      "name": "ST_AsText",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Create a table with a geometry column and insert the geometries of various New York City landmarks",
        "CREATE TABLE sample_geometries(location_name VARCHAR(50), geo QSYS2.ST_GEOMETRY);",
        "INSERT INTO sample_geometries VALUES",
        " ('Empire State Building', QSYS2.ST_POINT('point(-73.9854 40.7488)')),",
        " ('Brooklyn Bridge', QSYS2.ST_LINESTRING('linestring (-73.9993 40.7081,-73.9937 40.7035)')),",
        " ('Central Park', QSYS2.ST_POLYGON('polygon((-73.9817 40.7682, -73.9581 40.8005, -73.9495 40.7968, -73.9732 40.7644, -73.9817 40.7682))'));",
        "",
        "-- Convert the geometry back into readable text",
        "SELECT location_name, QSYS2.ST_ASTEXT(geo) AS geometry",
        "  FROM sample_geometries;"
      ]
    },
    {
      "name": "ST_Buffer",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "",
        "-- Create a new geometry that is a 1 kilometer buffer around a polygon",
        "VALUES QSYS2.ST_ASTEXT(QSYS2.ST_BUFFER(QSYS2.ST_POLYGON('polygon((-73.9995 40.7310, -73.9986 40.7321, -73.9957 40.7307, -73.9966 40.7297, -73.9995 40.7310))'), 1000));"
      ]
    },
    {
      "name": "ST_Contains",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Create a table with a point column and insert various New York City landmarks",
        "CREATE TABLE sample_points(location_name VARCHAR(50), point QSYS2.ST_POINT);",
        "INSERT INTO sample_points VALUES",
        " ('Empire State Building', QSYS2.ST_POINT(-73.9854, 40.7488)),",
        " ('Central Park Castle', QSYS2.ST_POINT(-73.9753, 40.7703)),",
        " ('Chrysler Building', QSYS2.ST_POINT(-73.9755, 40.7516)),",
        " ('Belvidere Castle', QSYS2.ST_POINT(-73.9690, 40.7797));",
        "",
        "-- Create a polygon variable ",
        "-- Set the variables default value to the polygon the defines the boundary for New York City's Central Park",
        "CREATE VARIABLE central_park_geometry QSYS2.ST_POLYGON DEFAULT(QSYS2.ST_POLYGON('polygon((-73.9817 40.7682, -73.9581 40.8005, -73.9495 40.7968, -73.9732 40.7644, -73.9817 40.7682))'));",
        "",
        "-- Query to find out if Central Park contains any New York City landmarks in the table ",
        "SELECT location_name, QSYS2.ST_CONTAINS(central_park_geometry, point) AS central_park_contains",
        "  FROM sample_points;",
        "  "
      ]
    },
    {
      "name": "ST_Covers",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Create a table with a polygon column and insert several example polygons that define the boundaries of different parks in New York City",
        "DROP TABLE sample_parks;",
        "CREATE TABLE sample_parks (park_name VARCHAR(50), park_geometry QSYS2.ST_POLYGON);",
        "INSERT INTO sample_parks (park_name, park_geometry) VALUES",
        "  ('Central Park', QSYS2.ST_POLYGON('polygon((-73.9817 40.7682, -73.9581 40.8005, -73.9495 40.7968, -73.9732 40.7644, -73.9817 40.7682))')),",
        "  ('Washington Square Park', QSYS2.ST_POLYGON('polygon((-73.9995 40.7310, -73.9986 40.7321, -73.9957 40.7307, -73.9966 40.7297, -73.9995 40.7310))'));",
        "",
        "-- Create a ST_Polygon variable and set the default value to the polygon that defines the boundary of the Central Park Tennis Center",
        "CREATE VARIABLE central_park_tennis_center QSYS2.ST_POLYGON;",
        "SET central_park_tennis_center = QSYS2.ST_POLYGON('polygon((-73.9631 40.7900, -73.9610 40.7903, -73.9609 40.7897, -73.9630 40.7894))');",
        "",
        "-- Query to find if one of the parks fully covers the Tennis Center",
        "SELECT park_name, QSYS2.ST_COVERS(park_geometry, central_park_tennis_center) AS covers",
        "  FROM sample_parks;"
      ]
    },
    {
      "name": "ST_Crosses",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Create a table with a polygon column and insert several example polygons that define the boundaries of different parks in New York City",
        "CREATE TABLE sample_parks (park_name VARCHAR(50), park_geometry QSYS2.ST_POLYGON);",
        "INSERT INTO sample_parks (park_name, park_geometry) VALUES",
        "  ('Central Park', QSYS2.ST_POLYGON('polygon((-73.9817 40.7682, -73.9581 40.8005, -73.9495 40.7968, -73.9732 40.7644, -73.9817 40.7682))')),",
        "  ('Washington Square Park', QSYS2.ST_POLYGON('polygon((-73.9995 40.7310, -73.9986 40.7321, -73.9957 40.7307, -73.9966 40.7297, -73.9995 40.7310))'));",
        "",
        "-- Create a linestring that defines the path of a street and set it to 97th Street in New York City",
        "CREATE VARIABLE sample_street QSYS2.ST_LINESTRING;",
        "SET sample_street = QSYS2.ST_LINESTRING('linestring(-73.9743 40.7966, -73.9436 40.7837)');",
        "",
        "-- Query to find if the street crosses one of the parks",
        "SELECT park_name, QSYS2.ST_CROSSES(sample_street, park_geometry) AS covers",
        "  FROM sample_parks;"
      ]
    },
    {
      "name": "ST_Difference",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Find the difference between two disjoint polygons.",
        "VALUES QSYS2.ST_ASTEXT(",
        "   QSYS2.ST_DIFFERENCE(QSYS2.ST_POLYGON('polygon((10 10, 20 10, 20 20, 10 20, 10 10))'),",
        "                       QSYS2.ST_POLYGON('polygon((30 30, 50 30, 50 50, 30 50, 30 30))')));",
        "                       ",
        "-- Find the difference between two intersecting polygons.",
        "VALUES QSYS2.ST_ASTEXT(",
        "   QSYS2.ST_DIFFERENCE(QSYS2.ST_POLYGON('polygon((30 30, 50 30, 50 50, 30 50, 30 30))'),",
        "                       QSYS2.ST_POLYGON('polygon((40 40, 60 40, 60 60, 40 60, 40 40))')));"
      ]
    },
    {
      "name": "ST_Disjoint",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Determine if two polygons are disjoint",
        "VALUES QSYS2.ST_DISJOINT(QSYS2.ST_POLYGON('polygon((10 10, 20 10, 20 20, 10 20, 10 10))'),",
        "                         QSYS2.ST_POLYGON('polygon((30 30, 50 30, 50 50, 30 50, 30 30))'));",
        "                       ",
        "-- Determine if two polygons are disjoint",
        "VALUES QSYS2.ST_DISJOINT(QSYS2.ST_POLYGON('polygon((30 30, 50 30, 50 50, 30 50, 30 30))'),",
        "                         QSYS2.ST_POLYGON('polygon((40 40, 60 40, 60 60, 40 60, 40 40))'));"
      ]
    },
    {
      "name": "ST_Distance",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Create a table with a point column and insert into it different geometries ",
        "-- that represent points of interest in New York City",
        "CREATE TABLE sample_points(location_name VARCHAR(50), location_point QSYS2.ST_POINT);",
        "INSERT INTO sample_points VALUES",
        " ('Empire State Building', QSYS2.ST_POINT(-73.9854, 40.7488)),",
        " ('Chrysler Building', QSYS2.ST_POINT(-73.9755, 40.7516)),",
        " ('Rockefeller Center', QSYS2.ST_POINT(-73.9787, 40.7587));",
        "",
        "-- Create a table with a polygon column and insert several example polygons that define the boundaries of different parks in New York City",
        "CREATE TABLE sample_parks (park_name VARCHAR(50), park_geometry QSYS2.ST_POLYGON);",
        "INSERT INTO sample_parks (park_name, park_geometry) VALUES",
        "  ('Central Park', QSYS2.ST_POLYGON('polygon((-73.9817 40.7682, -73.9581 40.8005, -73.9495 40.7968, -73.9732 40.7644, -73.9817 40.7682))')),",
        "  ('Washington Square Park', QSYS2.ST_POLYGON('polygon((-73.9995 40.7310, -73.9986 40.7321, -73.9957 40.7307, -73.9966 40.7297, -73.9995 40.7310))'));",
        "",
        "-- Find the distance from Washington Square Park to different points of interest in New York City",
        "SELECT location_name, QSYS2.ST_DISTANCE(location_point, park_geometry) as distance_meters",
        "  FROM sample_points, sample_parks",
        "  WHERE park_name = 'Washington Square Park';"
      ]
    },
    {
      "name": "ST_GeometryType",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Create a table and insert a variety of different geometries into it",
        "CREATE TABLE sample_geometries (id INTEGER, geometry QSYS2.ST_GEOMETRY);",
        "INSERT INTO sample_geometries(id, geometry) VALUES",
        "  (7101, QSYS2.ST_GEOMETRY('point(1 2)')),",
        "  (7102, QSYS2.ST_GEOMETRY('linestring(33 2, 34 3, 35 6)')),",
        "  (7103, QSYS2.ST_GEOMETRY('polygon((3 3, 4 6, 5 3, 3 3))')),",
        "  (7104, QSYS2.ST_GEOMETRY('multipoint((1 2), (4 3))')),",
        "  (7105, QSYS2.ST_GEOMETRY('multilinestring((10 10, 20 20),(-10 -10, -20 -20))')),",
        "  (7106, QSYS2.ST_GEOMETRY('multipolygon(((10 10, 10 20, 20 20, 20 15, 10 10)),((60 60, 70 70, 80 60, 60 60 )))')),",
        "  (7107, QSYS2.ST_GEOMETRY('GeometryCollection(POINT (10 10), POINT (30 30), LINESTRING (15 15, 20 20))'));",
        "",
        "-- Find the type of each geometry in the table",
        "SELECT id, QSYS2.ST_GEOMETRYTYPE(geometry) AS geometry_type",
        "  FROM sample_geometries;"
      ]
    },
    {
      "name": "ST_Intersection",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Find the intersection of two overlapping polygons",
        "VALUES QSYS2.ST_ASTEXT(",
        "  QSYS2.ST_INTERSECTION(QSYS2.ST_POLYGON('polygon((30 30, 50 30, 50 50, 30 50, 30 30))'),",
        "                        QSYS2.ST_POLYGON('polygon((40 40, 60 40, 60 60, 40 60, 40 40))')));",
        "",
        "-- Find the intersection of two disjoint polygons",
        "VALUES QSYS2.ST_ASTEXT(",
        "  QSYS2.ST_INTERSECTION(QSYS2.ST_POLYGON('polygon((10 10, 20 10, 20 20, 10 20, 10 10))'),",
        "                        QSYS2.ST_POLYGON('polygon((30 30, 50 30, 50 50, 30 50, 30 30))')));"
      ]
    },
    {
      "name": "ST_Intersects",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Determine if two polygons intersect",
        "VALUES ",
        "  QSYS2.ST_INTERSECTS(QSYS2.ST_POLYGON('polygon((30 30, 50 30, 50 50, 30 50, 30 30))'),",
        "                      QSYS2.ST_POLYGON('polygon((40 40, 60 40, 60 60, 40 60, 40 40))'));",
        "",
        "-- Determine if two polygons intersect",
        "VALUES",
        "  QSYS2.ST_INTERSECTS(QSYS2.ST_POLYGON('polygon((10 10, 20 10, 20 20, 10 20, 10 10))'),",
        "                      QSYS2.ST_POLYGON('polygon((30 30, 50 30, 50 50, 30 50, 30 30))'));"
      ]
    },
    {
      "name": "ST_IsSimple",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Create a table with a geometry column and insert different geometries",
        "DROP TABLE sample_geometries;",
        "CREATE TABLE sample_geometries (id INTEGER, geometry QSYS2.ST_GEOMETRY);",
        "INSERT INTO sample_geometries VALUES",
        " (1, QSYS2.ST_GEOMETRY('point EMPTY')),",
        " (2, QSYS2.ST_POINT('point (21 33)')),",
        " (3, QSYS2.ST_MULTIPOINT('multipoint((10 10), (20 20), (30 30))')),",
        " (4, QSYS2.ST_MULTIPOINT('multipoint((10 10), (20 20), (30 30), (20 20))')),",
        " (5, QSYS2.ST_LINESTRING('linestring(60 60, 70 60, 70 70)')),",
        " (6, QSYS2.ST_LINESTRING('linestring(20 20, 30 30, 30 20, 20 30)')),",
        " (7, QSYS2.ST_POLYGON('polygon((40 40, 50 40, 50 50, 40 40))'));",
        "",
        "-- Determine if the geometries in the table are simple or not",
        "SELECT id,",
        "    CASE QSYS2.ST_ISSIMPLE(geometry)",
        "      WHEN 0 THEN 'Geometry is not simple'",
        "      WHEN 1 THEN 'Geometry is simple'",
        "    END AS simple",
        "  FROM sample_geometries;"
      ]
    },
    {
      "name": "ST_IsValid",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Create a table with a geometry column and insert different geometries into it",
        "-- Insert one invalid row that does not use a function to construct a geometry",
        "CREATE TABLE sample_geometries (id INTEGER, geometry QSYS2.ST_GEOMETRY);",
        "INSERT INTO sample_geometries VALUES",
        "  (1, QSYS2.ST_GEOMETRY('point EMPTY')),",
        "  (2, QSYS2.ST_POLYGON('polygon((40 20, 90 20, 90 50, 40 50, 40 20))')),",
        "  (3, QSYS2.ST_MULTIPOINT('multipoint((10 10), (50 10), (10 30))')),",
        "  (4, QSYS2.ST_LINESTRING('linestring (10 10, 20 10)')),",
        "  (5, CAST('point(10 20)' AS BLOB(2G)));",
        "",
        "-- Determine if any of the rows are invalid",
        "SELECT id, QSYS2.ST_ISVALID(geometry) Is_Valid",
        "  FROM sample_geometries;"
      ]
    },
    {
      "name": "ST_MaxX, ST_MaxY, ST_MinX, ST_MinY",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Create a table with a polygon column and insert several polygons that represent different New York City Parks",
        "DROP TABLE sample_parks;",
        "CREATE TABLE sample_parks (park_name VARCHAR(50), geometry QSYS2.ST_POLYGON);",
        "INSERT INTO sample_parks (park_name, geometry) VALUES",
        "  ('Central Park', QSYS2.ST_POLYGON('polygon((-73.9817 40.7682, -73.9581 40.8005, -73.9495 40.7968, -73.9732 40.7644, -73.9817 40.7682))')),",
        "  ('Washington Square Park', QSYS2.ST_POLYGON('polygon((-73.9995 40.7310, -73.9986 40.7321, -73.9957 40.7307, -73.9966 40.7297, -73.9995 40.7310))'));",
        "",
        "-- Find the maximum and minimum x and y coordinate for various New York City parks",
        "SELECT park_name, ",
        "       QSYS2.ST_MAXX(geometry) AS max_x,",
        "       QSYS2.ST_MAXY(geometry) AS max_y,",
        "       QSYS2.ST_MINX(geometry) AS min_x,",
        "       QSYS2.ST_MINY(geometry) AS min_y",
        " FROM sample_parks;"
      ]
    },
    {
      "name": "ST_NumPoints",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Create a table with a geometry column and insert sample geometries of different types",
        "DROP TABLE sample_geometries;",
        "CREATE TABLE sample_geometries (id VARCHAR(18), geometry QSYS2.ST_GEOMETRY);",
        "INSERT INTO sample_geometries (id, geometry)",
        "  VALUES (1, QSYS2.ST_POINT('point (44 14)')),",
        "         (2, QSYS2.ST_LINESTRING('linestring (0 0, 20 20)')),",
        "         (3, QSYS2.ST_POLYGON('polygon((0 0, 0 40, 40 40, 40 0, 0 0))')),",
        "         (4, QSYS2.ST_MULTIPOINT('multipoint((0 0), (10 20), (15 20), (30 30))')),",
        "         (5, QSYS2.ST_MULTILINESTRING('MultiLineString((10 10, 20 20), (15 15, 30 15))')),",
        "         (6, QSYS2.ST_MULTIPOLYGON('MultiPolygon(((10 10, 10 20, 20 20, 20 15, 10 10)),",
        "                                                 ((60 60, 70 70, 80 60, 60 60 )))'));",
        "",
        "-- Find how many points each geometries has",
        "SELECT id, QSYS2.ST_GEOMETRYTYPE(geometry) AS spatial_type, ",
        "       QSYS2.ST_NUMPOINTS (geometry) AS num_points",
        "  FROM sample_geometries;"
      ]
    },
    {
      "name": "ST_Overlap",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Determine if two polygons overlap",
        "VALUES QSYS2.ST_OVERLAPS(QSYS2.ST_POLYGON('polygon((30 30, 50 30, 50 50, 30 50, 30 30))'),",
        "                         QSYS2.ST_POLYGON('polygon((40 40, 60 40, 60 60, 40 60, 40 40))'));",
        "",
        "-- Determine if two polygons overlap (polygons are disjoint)",
        "VALUES QSYS2.ST_OVERLAPS(QSYS2.ST_POLYGON('polygon((10 10, 20 10, 20 20, 10 20, 10 10))'),",
        "                         QSYS2.ST_POLYGON('polygon((30 30, 50 30, 50 50, 30 50, 30 30))'));",
        "                       ",
        "-- Determine if two polygons overlap (polygons are the same)",
        "VALUES QSYS2.ST_OVERLAPS(QSYS2.ST_POLYGON('polygon((10 10, 20 10, 20 20, 10 20, 10 10))'),",
        "                         QSYS2.ST_POLYGON('polygon((10 10, 20 10, 20 20, 10 20, 10 10))'));"
      ]
    },
    {
      "name": "ST_Point",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- This example shows how to create a table with a ST_POINT column, insert into the table, ",
        "-- and query the table.",
        "",
        "CREATE TABLE NATIONAL_PARKS",
        "  (ID INT,",
        "   NAME VARCHAR(30),",
        "   LOCATION QSYS2.ST_POINT);",
        "",
        "-- The point at the center of Yosemite National Park in the USA, using (longitude, latitude)",
        "INSERT INTO NATIONAL_PARKS VALUES ",
        "  (101, 'Yosemite National Park', QSYS2.ST_POINT(-119.539, 37.865));",
        "  ",
        "-- A point at the center of Yellowstone National Park in the USA, using Well-Known Text (WKT)",
        "INSERT INTO NATIONAL_PARKS VALUES",
        "  (201, 'Yellowstone National Park', QSYS2.ST_POINT('point (-110.40 44.45)'));",
        "",
        "-- The center of the Grand Canyon in the USA, using WKT",
        "INSERT INTO NATIONAL_PARKS VALUES",
        "  (301, 'Grand Canyon National Park', QSYS2.ST_POINT('point (-112.1129 36.1213)'));",
        "",
        "-- Query the table, converting the ST_POINT value into a readable text format",
        "SELECT ID, NAME, QSYS2.ST_ASTEXT(LOCATION)",
        "  FROM NATIONAL_PARKS;"
      ]
    },
    {
      "name": "ST_Touches",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Determine if two linestrings touch",
        "VALUES QSYS2.ST_TOUCHES(QSYS2.ST_LINESTRING('linestring(0 0, 1 1)'),",
        "                        QSYS2.ST_LINESTRING('linestring(1 1, 2 2)'));",
        "                        ",
        "-- Determine if a linestring and polygon touch",
        "VALUES QSYS2.ST_TOUCHES(QSYS2.ST_LINESTRING('linestring(0 0, 5 5)'),",
        "                        QSYS2.ST_POLYGON('polygon((1 1, 1 2, 2 2, 2 1, 1 1))'));"
      ]
    },
    {
      "name": "ST_Union",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Get the union of two intersecting polygons",
        "VALUES QSYS2.ST_ASTEXT(",
        "  QSYS2.ST_UNION(QSYS2.ST_POLYGON('polygon((30 30, 50 30, 50 50, 30 50, 30 30))'),",
        "                 QSYS2.ST_POLYGON('polygon((40 40, 60 40, 60 60, 40 60, 40 40))')));",
        "",
        "-- Get the union of two disjoint polygons",
        "VALUES QSYS2.ST_ASTEXT(",
        "  QSYS2.ST_UNION(QSYS2.ST_POLYGON('polygon((10 10, 20 10, 20 20, 10 20, 10 10))'),",
        "                 QSYS2.ST_POLYGON('polygon((30 30, 50 30, 50 50, 30 50, 30 30))')));"
      ]
    },
    {
      "name": "ST_Within",
      "content": [
        "-- minvrm:  v7r4m0",
        "",
        "-- Create a table with a polygon column and insert several example polygons that define the boundaries of different parks in New York City",
        "DROP TABLE sample_parks;",
        "CREATE TABLE sample_parks (park_name VARCHAR(50), park_geometry QSYS2.ST_POLYGON);",
        "INSERT INTO sample_parks (park_name, park_geometry) VALUES",
        "  ('Central Park', QSYS2.ST_POLYGON('polygon((-73.9817 40.7682, -73.9581 40.8005, -73.9495 40.7968, -73.9732 40.7644, -73.9817 40.7682))')),",
        "  ('Washington Square Park', QSYS2.ST_POLYGON('polygon((-73.9995 40.7310, -73.9986 40.7321, -73.9957 40.7307, -73.9966 40.7297, -73.9995 40.7310))'));",
        "",
        "-- Create a ST_Polygon variable ",
        "-- Set the value to the polygon that defines the boundary of the Central Park Tennis Center",
        "CREATE VARIABLE central_park_tennis_center QSYS2.ST_POLYGON;",
        "SET central_park_tennis_center = QSYS2.ST_POLYGON('polygon((-73.9631 40.7900, -73.9610 40.7903, -73.9609 40.7897, -73.9630 40.7894))');",
        "",
        "-- Query to find if the Tennis Center is fully within one of the parks",
        "SELECT park_name, QSYS2.ST_WITHIN(central_park_tennis_center, park_geometry) AS within",
        "  FROM sample_parks;"
      ]
    }
  ]
}