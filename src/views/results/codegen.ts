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
  name = name.replace(/\u00fc/g, "u")  // ü -> u
    .replace(/\u00e4/g, "a")  // ä -> a
    .replace(/\u00f6/g, "o")  // ö -> o
    .replace(/\u00df/g, "s")  // sharp s/Eszett -> s
    .replace(/\u00e6/g, "ae")  // æ -> ae
    .replace(/\u00f8/g, "oe")  // ø -> oe
    .replace(/\u00e5/g, "aa")  // å -> aa
    .replace(/[ .:]+$/g, "")  // remove trailing space, "." and ":"
    .replace(/[.]/g, "_")  // "." between words to underscore
    .replace(/\s+/g, "_")  // remaining whitespaces to underscore
    .replace(/[^a-zA-Z0-9_]/g, "")  // remove non-alphanumeric chars
    .replace(/\_+/i, "_")  // replace multiple underscores with single underscore
    .trim();  
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
