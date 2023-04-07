
import Table from "../../database/table";
import ColumnTreeItem from "./ColumnTreeItem";

export async function getChildren(schema: string, name: string): Promise<ColumnTreeItem[]> {
  const columns = await Table.getItems(schema, name);

  return columns.map(column => new ColumnTreeItem(schema, name, column));
}