
const vscode = require(`vscode`);
const Table = require(`../../database/table`);

exports.getChildren = async (schema, name) => {
  const columns = await Table.getItems(schema, name);

  return columns.map(column => new this.ColumnTreeItem(schema, name, column));
}

exports.ColumnTreeItem = class extends vscode.TreeItem {
  /**
   * @param {string} schema
   * @param {string} table
   * @param {TableColumn} data 
   */
  constructor(schema, table, data) {
    super(data.COLUMN_NAME, vscode.TreeItemCollapsibleState.None);

    this.contextValue = `column`;
    this.schema = schema;
    this.table = table;
    this.name = data.COLUMN_NAME;

    let detail, length;
    if ([`DECIMAL`, `ZONED`].includes(data.DATA_TYPE)) {
      length = data.NUMERIC_PRECISION || null;
      detail = `${data.DATA_TYPE}${length ? `(${length}${data.NUMERIC_PRECISION ? `, ${data.NUMERIC_SCALE}` : ``})` : ``}`
    } else {
      length = data.CHARACTER_MAXIMUM_LENGTH || null;
      detail = `${data.DATA_TYPE}${length ? `(${length})` : ``}`
    }

    const descriptionParts = [
      detail,
      data.IS_IDENTITY === `Y` ? `Identity` : ``,
      data.IS_NULLABLE === `Y` ? `nullable` : ``,
      data.HAS_DEFAULT === `Y` ? `${data.COLUMN_DEFAULT} def.` : ``,
      data.COLUMN_TEXT,
    ]

    this.description = descriptionParts.filter(part => part && part !== ``).join(`, `);

    this.iconPath = new vscode.ThemeIcon(data.CONSTRAINT_NAME ? `key` : `symbol-field`);
  }
}