
import vscode from "vscode";
import Statement from "../../database/statement";

export default class ColumnTreeItem extends vscode.TreeItem {
  schema: string;
  table: string;
  name: string;

  constructor(schema: string, table: string, data: TableColumn) {
    super(Statement.prettyName(data.COLUMN_NAME), vscode.TreeItemCollapsibleState.None);

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
      data.IS_IDENTITY === `YES` ? `Identity` : ``,
      data.IS_NULLABLE === `Y` ? `nullable` : ``,
      data.HAS_DEFAULT === `Y` ? `${data.COLUMN_DEFAULT} def.` : ``,
      data.COLUMN_TEXT,
    ]

    this.description = descriptionParts.filter(part => part && part !== ``).join(`, `);

    this.iconPath = new vscode.ThemeIcon(data.CONSTRAINT_NAME ? `key` : `symbol-field`);
  }
}