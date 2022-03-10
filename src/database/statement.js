
const { format } = require(`sql-formatter`);

module.exports = class Statement {
  static format(sql) {
    return format(sql, {
      language: `db2`, // Defaults to "sql" (see the above list of supported dialects)
      linesBetweenQueries: 2, // Defaults to 1
    });
  }
}