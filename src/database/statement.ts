
import { getInstance } from "../base";

import {format} from "sql-formatter"

export default class Statement {
  static format(sql: string) {
    return format(sql, {
      language: `db2`, // Defaults to "sql" (see the above list of supported dialects)
      linesBetweenQueries: 2, // Defaults to 1
      keywordCase: "lower"
    });
  }

  static validQsysName(name: string) {
    const instance = getInstance();
    const connection = instance ? instance.getConnection() : undefined;

    if (instance && connection) {
      // We know the encoding specific variants
      const variant_chars_local = connection.variantChars.local;
      const validQsysName = new RegExp(`^[A-Z0-9${variant_chars_local}][A-Z0-9_${variant_chars_local}.]{0,9}$`);
      return validQsysName.test(name);
    } else {
      // Fall back with standard variants
      return name.match(`[^A-Z0-9_@#$]`);
    }
  }

  /**
   * 
   * @param name Value which should be normalised
   * @param fromUser If the value is true, then we likely need to normalise. Items from the database are usually normalised already
   * @returns 
   */
  static delimName(name: string, fromUser = false) {
    if (fromUser) { // The name was input by the user
      // If already delimited, return it as-is
      if (name.startsWith(`"`) && name.endsWith(`"`)) return name;
      // If the value contains a space or decimal it needs to be delimited
      if (name.includes(` `) || name.includes(`.`)) return `"${name}"`;
      // Otherwise, fold to uppercase.  The user should have explicitly delimited if that was their intention.
      return name.toUpperCase();
    } else { // The name came from a catalog file query
      // If the name contains characters other than the valid variants, uppercase, digits, or underscores, it must be delimited
      if (Statement.validQsysName(name)) return name;
      else {
        if (name.includes(` `) || name.includes(`.`) || name !== name.toUpperCase()) {
          return `"${name}"`;
        } else {
          return name;
        }
      }
    }
  }

  /**
   * Converts a catalog name to a pretty name for UI purposes
   * @param name Catalog name
   */
  static prettyName(name: string) {
      // If the name contains characters other than the valid variants, uppercase, digits, or underscores, it must be delimited
      if (Statement.validQsysName(name)) return name.toLowerCase();
      else {
        // Delimited name
        if (name.includes(` `) || name.includes(`.`) || name !== name.toUpperCase()) {
          return `"${name}"`;
        } else {
          return name.toLowerCase();
        }
      }
  }

  static noQuotes(name: string) {
    if (name.startsWith(`"`) && name.endsWith(`"`)) return name.substring(1, name.length-1);
    return name;
  }

  static escapeString(value: string) {
    value = value.replace(/[\0\n\r\b\t'\x1a]/g, function (s) {
      switch (s) {
        case `\0`:
          return `\\0`;
        case `\n`:
          return `\\n`;
        case `\r`:
          return ``;
        case `\b`:
          return `\\b`;
        case `\t`:
          return `\\t`;
        case `\x1a`:
          return `\\Z`;
        case `'`:
          return `''`;
        default:
          return `\\` + s;
      }
    });
  
    return value;
  }
}