
const View = require(`../../database/view`);
const ColumnTreeItem = require(`./ColumnTreeItem`);

exports.getChildren = async (schema, name) => {
  const columns = await View.getColumns(schema, name);

  return columns.map(column => new ColumnTreeItem(schema, name, column));
}