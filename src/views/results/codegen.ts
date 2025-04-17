import { ColumnMetaData, QueryResult } from "@ibm/mapepire-js";

export function queryResultToRpgDs(result: QueryResult<any>) : string {
  let content = `dcl-ds row_t qualified template;\n`;
  for (let i = 0; i < result.metadata.column_count; i++) {
    const name = `${isNaN(+result.metadata.columns[i].label.charAt(0)) ? '' : 'col'}${result.metadata.columns[i].label.toLowerCase()}`
    content += `  ${name} ${columnToRpgDefinition(result.metadata.columns[i])};\n`;
  }
  content += `end-ds;\n`;
  return content;
}

export function columnToRpgDefinition(column: ColumnMetaData) : string {
  switch (column.type) {
    case `NUMERIC`:
      return `zoned(${column.precision}${column.scale > 0 ? ' : ' + column.scale : ''})`;
    case `DECIMAL`:
      return `packed(${column.precision}${column.scale > 0 ? ' : ' + column.scale : ''})`;
    case `CHAR`:
      return `char(${column.precision})`;
    case `VARCHAR`:
      return `varchar(${column.precision})`;
    case `DATE`:
      return `date`;
    case `TIME`:
      return `time`;
    case `TIMESTAMP`:
      return `timestamp`;
    case `SMALLINT`:
      return `int(5)`;
    case `INTEGER`:
      return `int(10)`;
    case `BIGINT`:
      return `int(20)`;
    case `BOOLEAN`:
      return `ind`;
    default:
      return `// type:${column.type} precision:${column.precision} scale:${column.scale}`;
  }
}
