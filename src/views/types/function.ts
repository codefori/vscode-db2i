
import Function from "../../database/callable";
import ParmTreeItem from "./ParmTreeItem";

export async function getChildren(schema: string, specificName: string): Promise<ParmTreeItem[]> {
  const signatures = await Function.getSignaturesFor(schema, [specificName]);
  const allParms = signatures.map(signature => signature.parms).flat();
  const removedDupes = allParms.filter((parm, index) => allParms.findIndex(p => p.PARAMETER_NAME === parm.PARAMETER_NAME && p.DATA_TYPE === parm.DATA_TYPE && p.ORDINAL_POSITION === parm.ORDINAL_POSITION) === index);

  return removedDupes.map(parm => new ParmTreeItem(schema, specificName, parm));
}