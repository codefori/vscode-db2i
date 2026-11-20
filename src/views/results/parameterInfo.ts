import Document from "../../language/sql/document";
import type { SqlParameter } from "./resultSetPanelProvider";

/** Writes the values into the statement as literals */
export function inlineParameters(sql: string, values: SqlParameter[] = []): string {
  if (values.length === 0) return sql;

  try {
    const document = new Document(sql);
    if (document.statements.length !== 1) return sql;
    return document.removeEmbeddedAreas(document.statements[0], { replacement: `values`, values }).content;
  } catch {
    return sql;
  }
}

/** One line per parameter, labelled like the bind prompt */
export function describeParameters(values: SqlParameter[], names: (string | undefined)[] = []): string | undefined {
  if (values.length === 0) return undefined;

  const lines = [`Parameters:`];
  const listed = new Set<string>();
  let positionalCount = 0;

  values.forEach((value, i) => {
    const name = names[i];
    if (name) {
      const key = name.toUpperCase();
      if (listed.has(key)) return;
      listed.add(key);
    }

    const label = name ? `:${name}` : `Parameter marker ${++positionalCount}`;
    const text = value === null || value === undefined ? `NULL` : typeof value === `string` ? `'${value}'` : String(value);
    lines.push(`  ${label} = ${text}`);
  });

  return lines.join(`\n`);
}
