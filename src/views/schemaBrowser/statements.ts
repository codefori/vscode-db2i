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