/** A row of `QSYS2.SYSIXADV`, limited to what tells which condensed advice stands for it */
export interface RawAdvice {
  KEY_COLUMNS_ADVISED: string;
  /** The keys at the start of `KEY_COLUMNS_ADVISED` that can be in any order */
  LEADING_COLUMN_KEYS?: string | null;
}

/** e.g. `A, "B,1" DESC` -> [`A`, `"B,1" DESC`] */
export function splitKeys(list: string | null | undefined): string[] {
  const keys: string[] = [];
  let current = ``;
  let quoted = false;

  for (const char of list ?? ``) {
    if (char === `"`) quoted = !quoted;

    if (char === `,` && !quoted) {
      keys.push(current);
      current = ``;
    } else {
      current += char;
    }
  }
  keys.push(current);

  return keys.map(key => key.trim().replace(/\s+/g, ` `)).filter(key => key.length > 0);
}

function columnName(key: string): string {
  return key.replace(/ (ASC|DESC)$/i, ``);
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every(item => b.includes(item));
}

/**
 * The advised indexes list is condensed: one row stands for every raw advice that an index
 * with its keys satisfies. That is the advice for the same keys or for the first of them,
 * where the order independent ones may be in any order.
 */
export function coversAdvice(condensedKeys: string, raw: RawAdvice): boolean {
  const condensed = splitKeys(condensedKeys);
  const keys = splitKeys(raw.KEY_COLUMNS_ADVISED);
  if (keys.length === 0 || keys.length > condensed.length) return false;

  const leading = splitKeys(raw.LEADING_COLUMN_KEYS).map(columnName);
  const prefix = condensed.slice(0, keys.length);

  if (leading.length === 0) {
    return keys.every((key, index) => key === prefix[index]);
  }

  if (leading.length > keys.length) return false;

  return sameSet(prefix.slice(0, leading.length).map(columnName), leading)
    && sameSet(prefix.slice(leading.length), keys.slice(leading.length));
}

/** Whether the raw advice has exactly the keys of the condensed one, rather than only the first of them */
export function hasSameKeys(condensedKeys: string, raw: RawAdvice): boolean {
  return splitKeys(condensedKeys).length === splitKeys(raw.KEY_COLUMNS_ADVISED).length && coversAdvice(condensedKeys, raw);
}
