
import vscode from "vscode";
import Statement from "../../database/statement";
import { SQLParm } from "../../types";

const icons = {
  IN: `arrow-right`,
  OUT: `arrow-left`,
  INOUT: `arrow-both`,
}

export default class ParmTreeItem extends vscode.TreeItem {
  schema: string;
  routine: string;
  name: string;

  constructor(schema: string, routine: string, data: SQLParm) {
    super(Statement.prettyName(data.PARAMETER_NAME || ``), vscode.TreeItemCollapsibleState.None);

    this.contextValue = `parameter`;
    this.schema = schema;
    this.routine = routine;
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
      data.IS_NULLABLE === `YES` ? `nullable` : ``,
      data.DEFAULT,
      data.LONG_COMMENT,
    ]

    this.description = descriptionParts.filter(part => part && part !== ``).join(`, `);

    this.iconPath = new vscode.ThemeIcon(icons[data.PARAMETER_MODE]);
  }
}