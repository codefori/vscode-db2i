import { ColumnMetaData, QueryResult } from "@ibm/mapepire-js";

export function queryResultToRpgDs(result: QueryResult<any>, source: string = 'Name') : string {
  let content = `dcl-ds row_t qualified template;\n`;
  for (let i = 0; i < result.metadata.column_count; i++) {
    const name = columnToRpgFieldName(result.metadata.columns[i], source);
    content += `  ${name} ${columnToRpgDefinition(result.metadata.columns[i])};\n`;
  }
  content += `end-ds;\n`;
  return content;
}

export function columnToRpgFieldName(column: ColumnMetaData, source: string = 'Name') : string {
  let name = source === 'Label' ? column.label.toLowerCase().trim() : column.name.toLowerCase().trim();
  name = name.replace(/\u00fc/g, "u");  // ü
  name = name.replace(/\u00e4/g, "a");  // ä
  name = name.replace(/\u00e4/g, "o");  // ö
  name = name.replace(/\u00df/g, "s");  // sharp s/Eszett
  name = name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, '').trim();  // space to underscore and remove non-alphanumeric chars
  if (!isNaN(+name.charAt(0))) {
    name = `col` + name;
  }
  return name;
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
