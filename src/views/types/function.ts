
import Function from "../../database/callable";
import ParmTreeItem from "./ParmTreeItem";

export async function getChildren (schema: string, name: string): Promise<ParmTreeItem[]> {
  const columns = await Function.getParms(schema, name);

  return columns.map(column => new ParmTreeItem(schema, name, column));
}