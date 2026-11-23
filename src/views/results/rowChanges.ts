import type { UpdatableInfo } from "../html/dataTable";
import type { SqlParameter } from "./resultSetPanelProvider";

/** Row action ids of an updatable result set. Each needs a `webview/context` entry on `dtAction_<id>`. */
export const RESULT_ROW_ACTIONS = {
  delete: `resultDeleteRow`,
};

/** Builds the `DELETE` for one result row, keyed like a cell update (primary or unique key, identity column or RRN). Undefined when the result lacks a key column. */
export function buildDeleteStatement(updatable: UpdatableInfo, columnNames: string[], row: unknown[]): { statement: string; bindings: SqlParameter[] } | undefined {
  const keyColumns = updatable.columns.filter(column => column.useInWhere);
  const useRrn = keyColumns.length === 1 && keyColumns[0].name === `RRN`;
  const conditions: string[] = [];
  const bindings: SqlParameter[] = [];

  for (const keyColumn of keyColumns) {
    // Without every key column the WHERE could match other rows too
    const index = columnNames.indexOf(keyColumn.name);
    if (index < 0) return undefined;

    const target = useRrn ? `RRN(t)` : keyColumn.name;
    const value = row[index];
    if (value === null || value === undefined) {
      conditions.push(`${target} IS NULL`);
    } else {
      conditions.push(`${target} = ?`);
      bindings.push(keyColumn.jsType === `number` ? Number(value) : String(value));
    }
  }

  // Never send a DELETE that would hit every row
  if (conditions.length === 0) return undefined;

  return { statement: `DELETE FROM ${updatable.table} t WHERE ${conditions.join(` AND `)}`, bindings };
}
