/** Column metadata for the header hover, like ACS. Nullable, table and auto increment come from newer Mapepire servers. */
export function resultColumnDetails(column: any): [string, string][] {
  const details: [string, string][] = [
    [`Name`, String(column.name)],
    [`Type`, String(column.type)],
    [`Precision`, String(column.precision)],
    [`Scale`, String(column.scale)],
  ];

  // JDBC isNullable: 0 = no nulls, 1 = nullable, 2 = unknown
  if (column.nullable === 0 || column.nullable === 1) details.push([`Nullable`, column.nullable === 1 ? `Yes` : `No`]);
  details.push([`Label`, String(column.label)]);
  if (column.table) details.push([`Table`, String(column.table)]);
  if (column.autoIncrement === true) details.push([`Auto increment`, `Yes`]);

  return details;
}
