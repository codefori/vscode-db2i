
import { TableColumn } from "../types";
import Statement from "./statement";

export type CrudType = `INSERT` | `UPDATE` | `DELETE`;

/**
 * Generates an INSERT, UPDATE or DELETE statement for a table. No values are generated:
 * each value is left to the user, with the column it belongs to described in a comment.
 * @param schema Schema name, as it comes from the catalog
 * @param name Table name, as it comes from the catalog
 * @param columns All columns of the table, in ordinal position order
 * @param keyColumns Names of the columns which identify a row. Ignored for INSERT
 */
export function generateCrudStatement(type: CrudType, schema: string, name: string, columns: TableColumn[], keyColumns: string[] = []): string {
  switch (type) {
    case `INSERT`: return generateInsert(schema, name, columns);
    case `UPDATE`: return generateUpdate(schema, name, columns, keyColumns);
    case `DELETE`: return generateDelete(schema, name, columns, keyColumns);
  }
}

function generateInsert(schema: string, name: string, columns: TableColumn[]): string {
  const identityColumns = columns.filter(column => column.IS_IDENTITY === `YES`);
  const insertColumns = columns.filter(column => column.IS_IDENTITY !== `YES`);

  if (insertColumns.length === 0) {
    throw new Error(`No columns available to insert into ${qualify(schema, name)}`);
  }

  return [
    ...(identityColumns.length ? [`-- Identity ${identityColumns.length === 1 ? `column` : `columns`} omitted: ${identityColumns.map(column => Statement.delimName(column.COLUMN_NAME)).join(`, `)}`] : []),
    `INSERT INTO ${qualify(schema, name)} (`,
    ...insertColumns.map((column, index) => `  ${Statement.delimName(column.COLUMN_NAME)}${index < insertColumns.length - 1 ? `,` : ``}`),
    `)`,
    `VALUES (`,
    ...describeAll(insertColumns),
    `);`
  ].join(`\n`);
}

function generateUpdate(schema: string, name: string, columns: TableColumn[], keyColumns: string[]): string {
  const setColumns = columns.filter(column => column.IS_IDENTITY !== `YES` && !isKeyColumn(column, keyColumns));

  if (setColumns.length === 0) {
    throw new Error(`No columns available to update in ${qualify(schema, name)}`);
  }

  const where = whereClause(schema, name, columns, keyColumns);

  return [
    ...where.warnings,
    `UPDATE ${qualify(schema, name)}`,
    `SET`,
    ...describeAll(setColumns),
    `WHERE`,
    ...where.lines,
    `;`
  ].join(`\n`);
}

function generateDelete(schema: string, name: string, columns: TableColumn[], keyColumns: string[]): string {
  const where = whereClause(schema, name, columns, keyColumns);

  return [
    ...where.warnings,
    `DELETE FROM ${qualify(schema, name)}`,
    `WHERE`,
    ...where.lines,
    `;`
  ].join(`\n`);
}

function whereClause(schema: string, name: string, columns: TableColumn[], keyColumns: string[]) {
  // Without a key, every column is listed so the statement never matches more rows than intended
  const predicateColumns = keyColumns.length ? columns.filter(column => isKeyColumn(column, keyColumns)) : columns;

  if (predicateColumns.length === 0) {
    throw new Error(`No columns available to identify a row in ${qualify(schema, name)}`);
  }

  return {
    warnings: keyColumns.length ? [] : [`-- No primary or unique key found: every column is listed to identify the row. Adjust as needed.`],
    lines: describeAll(predicateColumns)
  };
}

function isKeyColumn(column: TableColumn, keyColumns: string[]) {
  return keyColumns.includes(column.COLUMN_NAME);
}

function qualify(schema: string, name: string) {
  return `${Statement.delimName(schema)}.${Statement.delimName(name)}`;
}

function describeAll(columns: TableColumn[], indent = `  `): string[] {
  return columns.map(column => `${indent}-- ${describe(column)}`);
}

function describe(column: TableColumn): string {
  const type = column.DATA_TYPE.toUpperCase();
  const parts = [Statement.delimName(column.COLUMN_NAME), type];

  if (column.CHARACTER_MAXIMUM_LENGTH) {
    parts[1] += `(${column.CHARACTER_MAXIMUM_LENGTH})`;
  } else if (column.NUMERIC_PRECISION && [`DECIMAL`, `NUMERIC`, `DECFLOAT`, `FLOAT`].includes(type)) {
    parts[1] += `(${column.NUMERIC_PRECISION}${column.NUMERIC_SCALE ? `, ${column.NUMERIC_SCALE}` : ``})`;
  }

  if (column.IS_NULLABLE === `N`) parts[1] += ` NOT NULL`;
  if (column.COLUMN_TEXT && column.COLUMN_TEXT.trim()) parts.push(column.COLUMN_TEXT.trim());

  return parts.join(` - `);
}
