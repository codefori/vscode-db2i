
import Procedure from "../../database/callable";
import ParmTreeItem from "./ParmTreeItem";

export async function getChildren(schema: string, specificName: string): Promise<ParmTreeItem[]> {
  const parms = await Procedure.getParms(schema, specificName);

  return parms.map(parm => new ParmTreeItem(schema, specificName, parm));
}