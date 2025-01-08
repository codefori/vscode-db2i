
export function getIndexesStatement(schema: string, name: string) {
return `
--
with X as (
    select max(INDEX_NAME) NAME, SYSTEM_INDEX_NAME SYSNAME, max(INDEX_SCHEMA) SCHEMA,
           SYSTEM_INDEX_SCHEMA SYSSCHEMA,
           case count(distinct INDEX_PARTITION)
             when 1 then max(INDEX_PARTITION)
             else NULL
           end PARTITION, max(INDEX_TYPE) TYPE, max(INDEX_OWNER) OWNER, max(INDEX_VALID) VALID,
           min(CREATE_TIMESTAMP) CREATED, max(LAST_BUILD_TIMESTAMP) BUILT, max(LAST_QUERY_USE) LQU,
           max(LAST_STATISTICS_USE) LSU, sum(QUERY_USE_COUNT) QUC, sum(QUERY_STATISTICS_COUNT) QSC,
           max(LAST_USED_TIMESTAMP) USED, max(DAYS_USED_COUNT) DUC, max(LAST_RESET_TIMESTAMP) RESET,
           max(NUMBER_KEYS) KEYS, max(INDEX_SIZE) SIZE, max(NUMBER_PAGES) PAGES,
           max(LOGICAL_PAGE_SIZE) PAGESIZE, max(UNIQUE) UNIQUE, max(MAXIMUM_KEY_LENGTH) MAXKEYLEN,
           max(NUMBER_KEY_COLUMNS) KEYCOLCOUNT, max(COLUMN_NAMES) COLUMNS,
           max(UNIQUE_PARTIAL_KEY_VALUES) UPKV, max(OVERFLOW_VALUES) OVERFLOW,
           max(EVI_CODE_SIZE) EVISIZE, max(SPARSE) SPARSE, max(DERIVED_KEY) DERIVEDKEY,
           max(PARTITIONED) PARTITIONED, max(ACCPTH_TYPE) ACCPTHTYPE, max(SORT_SEQUENCE) SORTSEQ,
           max(LANGUAGE_IDENTIFIER) LANGID, max(ESTIMATED_BUILD_TIME) ESTBUILDTIME,
           max(INDEX_HELD) HELD, max(MAINTENANCE) MAINTENANCE,
           max(DELAYED_MAINT_KEYS) DELAYEDMAINTKEYS, max(RECOVERY) RECOVERY,
           max(LOGICAL_READS) LOGICALREADS, 0 PHYSICALREADS, max(INDEX_TEXT) TEXT,
           max(SEARCH_CONDITION) SEARCHCOND, max(SEARCH_CONDITION_HAS_UDF) SEARCHCONDHASUDF,
           case
             when max(TABLE_NAME) = min(TABLE_NAME) then max(TABLE_NAME)
             else NULL
           end TABNAME,
           case
             when max(SYSTEM_TABLE_SCHEMA) = min(SYSTEM_TABLE_SCHEMA) then max(SYSTEM_TABLE_SCHEMA)
             else NULL
           end SYSTABSCHEMA,
           case
             when max(TABLE_PARTITION) = min(TABLE_PARTITION) then max(TABLE_PARTITION)
             else NULL
           end TABPART,
           case
             when max(SYSTEM_TABLE_NAME) = min(SYSTEM_TABLE_NAME) then max(SYSTEM_TABLE_NAME)
             else NULL
           end SYSTABNAME, max(TABLE_SCHEMA) TABSCHEMA, max(SORT_SEQUENCE_NAME) SORTSEQNAME,
           max(SORT_SEQUENCE_SCHEMA) SORTSEQSCHEMA, max(MEDIA_PREFERENCE) MEDIAPREF,
           max(KEEP_IN_MEMORY) KIM, sum(RANDOM_READS) RANDOMREADS,
           max(LAST_BUILD_TIME) LASTBUILDTIME, max(LAST_BUILD_KEYS) LASTBUILDKEYS,
           max(LAST_BUILD_DEGREE) LASTBUILDDEGREE, sum(SEQUENTIAL_READS) SEQREADS,
           max(INCLUDE_EXPRESSION) INCEXPR,
           case
             when max(PARTITIONED) = 'YES' then count(*)
             else 1
           end IDXCOUNT
      from QSYS2.SYSPARTITIONINDEXES
      where

      TABLE_SCHEMA = '${schema}' and
      TABLE_NAME = '${name}' and 

      INDEX_NAME not like '%MAINTAINED TEMPORARY INDEXES%'
      group by SYSTEM_INDEX_SCHEMA, INDEX_NAME, SYSTEM_INDEX_NAME
      union all
      select MTI_NAME, cast(null as char(10)), cast(null as varchar(128)), cast(null as char(10)), cast(null as varchar(128)),
       'TEMPORARY', 'SQL QUERY ENGINE', case state when 'VALID' then 'YES' else 'NO' end, 
       CREATE_TIME, LAST_BUILD_START_TIME, cast(null as timestamp), cast(null as timestamp),
       cast(null as bigint), cast(null as bigint), cast(null as timestamp), 
       cast(null as integer), cast(null as timestamp), KEYS, MTI_SIZE, cast(null as bigint),
       cast(null as integer), cast(null as varchar(21)), cast(null as integer), KEYS,
       varchar(KEY_DEFINITION, 1024), cast(null as varchar(96)), cast(null as integer), cast(null as integer),
       SPARSE, cast(null as varchar(3)), cast(null as varchar(20)), cast(null as varchar(4)),
       cast(null as varchar(12)), cast(null as char(3)), case when LAST_BUILD_START_TIME is not null
       and LAST_BUILD_END_TIME is not null then 
       integer(timestampdiff_big(2, cast(LAST_BUILD_END_TIME - LAST_BUILD_START_TIME as char(22))))
       else cast(null as integer) end, cast(null as varchar(3)), cast(null as varchar(11)),
       cast(null as integer), cast(null as varchar(10)), cast(null as bigint), cast(null as integer),
       cast(null as vargraphic(50)), cast(null as vargraphic(1024)), cast(null as varchar(3)),
       TABLE_NAME, LIBRARY_NAME, cast(null as varchar(128)), cast(null as char(10)), TABLE_SCHEMA, 
       cast(null as char(10)), cast(null as char(10)), cast(null as varchar(3)), cast(null as varchar(3)),
       cast(null as bigint), case when LAST_BUILD_START_TIME is not null
       and LAST_BUILD_END_TIME is not null then 
       integer(timestampdiff_big(2, cast(LAST_BUILD_END_TIME - LAST_BUILD_START_TIME as char(22))))
       else cast(null as integer) end, cast(null as bigint), cast(null as smallint),
       cast(null as bigint), cast(null as vargraphic(1024)), cast(null as integer)
  from table (
      qsys2.mti_info(TABLE_SCHEMA => '${schema}', TABLE_NAME => '${name}')
    )
  )
  select QSYS2.DELIMIT_NAME(NAME) "Index Name", 
         case TYPE
           when 'INDEX' then 'Index'
           when 'LOGICAL' then 'Keyed Logical File'
           when 'PHYSICAL' then 'Keyed Physical File'
           when 'PRIMARY KEY' then 'Primary Key Constraint'
           when 'UNIQUE' then 'Unique Key Constraint'
           when 'FOREIGN KEY' then 'Foreign Key Constraint'
           when 'TEMPORARY' then 'Temporary Index'
           else cast(TYPE as varchar(11))
         end "Type", 
         COLUMNS "Key Columns",
         trim(VARCHAR_FORMAT(SIZE, '999G999G999G999G999')) "Size",
         case VALID
           when 'YES' then 'Yes'
           when 'NO' then 'No'
           else cast(VALID as varchar(3))
         end "Valid", 
         OWNER "Owner",
         VARCHAR_FORMAT(CREATED, 'MM/DD/YYYY HH:MI:SS AM') "Date Created",
         VARCHAR_FORMAT(BUILT, 'MM/DD/YYYY HH:MI:SS AM') "Last Build",
         case
           when PARTITION is NULL then ''
           else QSYS2.DELIMIT_NAME(PARTITION)
         end "Partition",
         VARCHAR_FORMAT(LQU, 'MM/DD/YYYY HH:MI:SS AM') "Last Query Use",
         VARCHAR_FORMAT(LSU, 'MM/DD/YYYY HH:MI:SS AM') "Last Query Statistics Use",
         trim(VARCHAR_FORMAT(QUC, '999G999G999G999G999')) "Query Use Count",
         trim(VARCHAR_FORMAT(QSC, '999G999G999G999G999')) "Query Statistics Use Count",
         VARCHAR_FORMAT(USED, 'MM/DD/YYYY HH:MI:SS AM') "Last Used",
         trim(VARCHAR_FORMAT(DUC, '999G999G999G999G999')) "Days Used Count",
         VARCHAR_FORMAT(RESET, 'MM/DD/YYYY') "Days Used Count Reset Date", 
         ACCPTHTYPE "Maximum Size",
         case
           when UNIQUE is NULL then ''
           when UNIQUE = 'UNIQUE' then 'Unique'
           when UNIQUE = 'UNIQUE WHERE NOT NULL' then 'Unique where not null'
           else cast(UNIQUE as varchar(21))
         end "Duplicate Key Order",
         trim(VARCHAR_FORMAT(PAGESIZE, '999G999G999G999G999')) "Logical Page Size",
         case
           when EVISIZE is NULL then ''
           when EVISIZE = 1 then '255'
           when EVISIZE = 2 then '65,535'
           when EVISIZE = 4 then '2,147,483,647'
           else cast(EVISIZE as varchar(128))
         end "EVI Distinct Values",
         case SORTSEQ
           when 'BY HEX VALUE' then 'By hex value'
           else cast(SORTSEQ as varchar(12))
         end "Sort Sequence", LANGID "Language Identifier",
         case
           when PARTITIONED is NULL then ''
           when PARTITIONED = 'NO' then 'Yes'
           when PARTITIONED = 'YES' then 'No'
           else cast(PARTITIONED as varchar(20))
         end "Spanning",
         case KIM
           when 'YES' then 'Yes'
           when 'NO' then 'No'
           else cast(KIM as varchar(3))
         end "Keep in Memory",
         case MEDIAPREF
           when 'ANY' then 'Any'
           else cast(MEDIAPREF as varchar(3))
         end "Media Preference", RANDOMREADS "Random Reads", SEQREADS "Sequential Reads",
         ESTBUILDTIME "Estimated Rebuild Time", LASTBUILDTIME "Last Rebuild Time",
         KEYS "Current Key Values", LASTBUILDKEYS "Last Rebuild Key Count",
         LASTBUILDDEGREE "Last Rebuild Parallel Degree",
         case
           when TABNAME is NULL then NULL
           else QSYS2.DELIMIT_NAME(TABNAME)
         end "Table Name", SYSTABNAME "Table System Name",
         case
           when TABSCHEMA is NULL then NULL
           else QSYS2.DELIMIT_NAME(TABSCHEMA)
         end "Table Schema", SYSTABSCHEMA "Table System Schema", TABPART "Table Partition",
         trim(VARCHAR_FORMAT(PAGES, '999G999G999G999G999')) "Current Allocated Pages",
         DELAYEDMAINTKEYS "Delayed Maintenance Keys",
         case DERIVEDKEY
           when 'YES' then 'Yes'
           when 'NO' then 'No'
           else cast(DERIVEDKEY as varchar(3))
         end "Derived Key",
         case HELD
           when 'YES' then 'Yes'
           when 'NO' then 'No'
           else cast(HELD as varchar(3))
         end "Held",
         case INCEXPR
           when 'YES' then 'Yes'
           when 'NO' then 'No'
           else cast(INCEXPR as varchar(3))
         end "INCLUDE Expression", LOGICALREADS "Index Logical Reads",
         case
           when MAINTENANCE is NULL then ''
           when MAINTENANCE = 'REBUILD' then 'Rebuild'
           when MAINTENANCE = 'DELAYED' then 'Delayed'
           when MAINTENANCE = 'DO NOT WAIT' then 'Do not wait'
           else cast(MAINTENANCE as varchar(11))
         end "Maintenance", MAXKEYLEN "Maximum Key Length", KEYCOLCOUNT "Key Column Count",
         OVERFLOW "Overflow Values",
         case
           when RECOVERY is NULL then ''
           when RECOVERY = 'AFTER IPL' then 'After IPL'
           when RECOVERY = 'DURING IPL' then 'During IPL'
           when RECOVERY = 'NEXT OPEN' then 'Next open'
           else cast(RECOVERY as varchar(10))
         end "Recovery", SORTSEQNAME "Sort Sequence Name", SORTSEQSCHEMA "Sort Sequence Schema",
         case SPARSE
           when 'YES' then 'Yes'
           when 'NO' then 'No'
           else cast(SPARSE as varchar(3))
         end "Sparse", UPKV "Unique Partial Key Values", SEARCHCOND "WHERE Clause",
         SEARCHCONDHASUDF "WHERE Clause Has UDF",
         case
           when TEXT is NULL then ''
           else trim(TEXT)
         end "Text",
         SYSNAME "Index System Name",
         case
           when SCHEMA is NULL then NULL
           else QSYS2.DELIMIT_NAME(SCHEMA)
         end "Schema", SYSSCHEMA "System Schema"

    from X
    order by 1 asc
`;
}

export function getAdvisedIndexesStatement(schema: string, name?: string) {
  return [
    `select KEY_COLUMNS_ADVISED, Times_Advised, Most_Expensive_Query, Average_Query_Estimate,`,
    `   Last_Advised, MTI_USED_FOR_STATS, LAST_MTI_USED_FOR_STATS, Table_Size, MTI_USED, MTI_CREATED,`,
    `   LAST_MTI_USED, System_Table_Schema, Estimated_Creation_Time, Logical_Page_Size, INDEX_TYPE,`,
    `   TABLE_NAME, TABLE_SCHEMA, SYSTEM_TABLE_NAME, PARTITION_NAME, LOGICAL_PAGE_SIZE,`,
    `   NLSS_TABLE_NAME, NLSS_TABLE_SCHEMA, MAX_ROW`,
    `from qsys2.condidxa where`,
    ...(name ? [`TABLE_NAME = '${name}' and`] : []),
    `    Table_Schema = '${schema}'`,
    `    order by Times_Advised desc`,
  ].join(` `);
}

export function getMTIStatement(schema: string, table: string = `*ALL`) {
  return [
    `select * `,
    `from table (`,
    `  qsys2.mti_info(TABLE_SCHEMA => '${schema}', TABLE_NAME => '${table}')`,
    `)`,
    `order by key_definition`,
  ].join(` `);
}

export function getAuthoritiesStatement(schema: string, table: string, objectType: string, tableType: string): string {
  let sql: string = `
    select 
      authorization_name "User profile name", 
      object_authority "Object authority", 
      owner "Object owner", 
      authorization_list "Authorization list", 
      primary_group "Primary group", 
      authorization_list_management "Authorization list management", 
      object_owner "User is object owner", 
      object_operational "Object operational authority", 
      object_management "Object management authority", 
      object_existence "Object existence authority", 
      object_alter "Object alter authority", 
      object_reference "Object reference authority", 
      data_read "Data read authority", 
      data_add "Data add authority", 
      data_update "Data update authority", 
      data_delete "Data delete authority", 
      data_execute "Data execute authority", 
      text_description "Description"
    from qsys2.object_privileges
    where object_schema = '${schema}' 
      and object_name = '${table}'
  `;
  if (objectType === 'TABLE' && tableType != 'T') {
    sql += ` and object_type = '*FILE'`;
  } else {
    sql += ` and sql_object_type = '${objectType}'`;    
  }
  return sql;
}