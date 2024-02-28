import { ContextType, ExplainTree } from "./nodes";

export function generateSqlForAdvisedIndexes(explainTree: ExplainTree): string {
  let script: string[] = [];
  // Get the advised indexes and generate SQL for each
  explainTree.getContextObjects([ContextType.ADVISED_INDEX]).forEach(ai => {
    let tableSchema = ai.properties[1].value;
    let tableName = ai.properties[2].value;
    // Index type is either BINARY RADIX or EVI
    let type = (ai.properties[3].value as string).startsWith(`E`) ? ` ENCODED VECTOR ` : ` `;
    // Number of distinct values (only required for EVI type indexes, otherwise will be empty or 0)
    let distinctValues = (ai.properties[4]?.value as number);
    let keyColumns = ai.properties[5].value;
    let sortSeqSchema = ai.properties[6];
    let sortSeqTable = ai.properties[7];
    let sql: string = ``;
    // If sort sequence is specified, add a comment to indicate the connection settings that should be used when creating the index
    if (sortSeqSchema?.value != `*N` && sortSeqTable?.value != `*HEX`) {
      sql += `-- Use these connection properties when creating this index\n`;
      sql += `-- ${sortSeqSchema.title}: ${sortSeqSchema.value}\n`;
      sql += `-- ${sortSeqTable.title}: ${sortSeqTable.value}\n`;
    }
    sql += `CREATE${type}INDEX ${tableSchema}.${tableName}_IDX ON ${tableSchema}.${tableName} (${keyColumns})`;
    if (!isNaN(distinctValues) && distinctValues > 0) {
      sql += ` WITH ${distinctValues} VALUES`;
    }
    script.push(sql);
  });
  
  return `-- Visual Explain - Advised Indexes\n\n` + script.join(`;\n\n`);
}