
import View from "../../database/view";
import ColumnTreeItem from "./ColumnTreeItem";

export async function getChildren (schema: string, name: string): Promise<ColumnTreeItem[]> {
  const columns = await View.getColumns(schema, name);

  return columns.map(column => new ColumnTreeItem(schema, name, column));
}