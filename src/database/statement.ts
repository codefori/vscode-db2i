
import {format} from "sql-formatter"

export default class Statement {
  static format(sql: string) {
    return format(sql, {
      language: `db2`, // Defaults to "sql" (see the above list of supported dialects)
      linesBetweenQueries: 2, // Defaults to 1
    });
  }

  static delimName(name: string) {
    if (name.startsWith(`"`) && name.endsWith(`"`)) name = name.substring(1, name.length-1);
    if (name.includes(` `)) return `"${name}"`;
    if (name.length <= 10) return name.toUpperCase();
    else if (name !== name.toUpperCase()) return `"${name}"`
    else return name;
  }

  static noQuotes(name: string) {
    if (name.startsWith(`"`) && name.endsWith(`"`)) return name.substring(1, name.length-1);
    return name;
  }
}