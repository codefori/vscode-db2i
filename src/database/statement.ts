
import {format} from "sql-formatter"

export default class Statement {
  static format(sql: string) {
    return format(sql, {
      language: `db2`, // Defaults to "sql" (see the above list of supported dialects)
      linesBetweenQueries: 2, // Defaults to 1
    });
  }

  /**
   * 
   * @param name Value which should be normalised
   * @param fromUser If the value is true, then we likely need to normalise. Items from the database are usually normalised already
   * @returns 
   */
  static delimName(name: string, fromUser = false) {
    if (fromUser && name.startsWith(`"`) && name.endsWith(`"`)) return name;
    if (fromUser === false && name.includes(` `)) return `"${name}"`;
    if (name.length <= 10) return name.toUpperCase();
    else if (fromUser) return `"${name}"`;
    else return name;
  }

  static noQuotes(name: string) {
    if (name.startsWith(`"`) && name.endsWith(`"`)) return name.substring(1, name.length-1);
    return name;
  }
}