
const Table = require(`../../database/table`);

const ColumnTreeItem = require(`./ColumnTreeItem`);

exports.getChildren = async (schema, name) => {
  const columns = await Table.getItems(schema, name);

  return columns.map(column => new ColumnTreeItem(schema, name, column));
}