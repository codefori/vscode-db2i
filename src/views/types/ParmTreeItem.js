
const vscode = require(`vscode`);

const icons = {
  IN: `arrow-left`,
  OUT: `arrow-right`,
  INOUT: `arrow-both`,
}

module.exports = class extends vscode.TreeItem {
  /**
   * @param {string} schema
   * @param {string} table
   * @param {SQLParm} data 
   */
  constructor(schema, table, data) {
    super(data.PARAMETER_NAME.toLowerCase(), vscode.TreeItemCollapsibleState.None);

    this.contextValue = `parameter`;
    this.schema = schema;
    this.table = table;
    this.name = data.PARAMETER_NAME;

    let detail, length;
    if ([`DECIMAL`, `ZONED`].includes(data.DATA_TYPE)) {
      length = data.NUMERIC_PRECISION || null;
      detail = `${data.DATA_TYPE}${length ? `(${length}${data.NUMERIC_PRECISION ? `, ${data.NUMERIC_SCALE}` : ``})` : ``}`
    } else {
      length = data.CHARACTER_MAXIMUM_LENGTH || null;
      detail = `${data.DATA_TYPE}${length ? `(${length})` : ``}`
    }

    const descriptionParts = [
      data.PARAMETER_MODE,
      detail,
      data.IS_NULLABLE === `Y` ? `nullable` : ``,
      data.DEFAULT,
      data.LONG_COMMENT,
    ]

    this.description = descriptionParts.filter(part => part && part !== ``).join(`, `);

    this.iconPath = new vscode.ThemeIcon(icons[data.PARAMETER_MODE]);
  }
}