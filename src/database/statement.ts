
import {format} from "sql-formatter"

export default class Statement {
  static format(sql: string) {
    return format(sql, {
      language: `db2`, // Defaults to "sql" (see the above list of supported dialects)
      linesBetweenQueries: 2, // Defaults to 1
    });
  }
}