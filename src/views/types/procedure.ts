
import Procedure from "../../database/callable";
import ParmTreeItem from "./ParmTreeItem";

export async function getChildren(schema: string, specificName: string): Promise<ParmTreeItem[]> {
  const signatures = await Procedure.getSignaturesFor(schema, [specificName]);
  const allParms = signatures.map(signature => signature.parms).flat();
  const removedDupes = allParms.filter((parm, index) => {
    return allParms.findIndex(p => p.PARAMETER_NAME === parm.PARAMETER_NAME && p.DATA_TYPE === p.DATA_TYPE) === index;
  });

  return removedDupes.map(parm => new ParmTreeItem(schema, specificName, parm));
}