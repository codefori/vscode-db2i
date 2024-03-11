import { CompletionItem, CompletionItemKind } from "vscode";
import Callable from "../../database/callable";
import { ObjectRef, CallableReference } from "../sql/types";
import Statement from "../../database/statement";
import { completionItemCache, createCompletionItem, getParmAttributes } from "./completion";

/**
 * Checks if the ref exists as a procedure or function. Then,
 * stores the parameters in the completionItemCache
 */
export async function isCallableType(ref: ObjectRef) {
  if (ref.object.schema && ref.object.name && ref.object.name.toUpperCase() !== `TABLE`) {
    ref.object.schema = Statement.delimName(ref.object.schema, true);
    ref.object.name = Statement.delimName(ref.object.name, true);

    const databaseObj = (ref.object.schema + ref.object.name);

    if (completionItemCache.has(databaseObj)) {
      return true;
    }

    const callableType = await Callable.getType(ref.object.schema, ref.object.name);

    if (callableType) {
      const parms = await Callable.getParms(ref.object.schema, ref.object.name, true);
      completionItemCache.set(databaseObj, parms);
      return true;
    } else {
      // Not callable, let's just cache it as empty to stop spamming the db
      completionItemCache.set(databaseObj, []);
    }
  }

  return false;
}

/**
 * Gets completion items that are stored in the cache
 * for a specific procedure
 */
export function getCallableParameters(ref: CallableReference): CompletionItem[] {
  const sqlObj = ref.parentRef.object;
  const parms = getCachedParameters(ref);
  if (parms) {
    // Find any already referenced parameters in this list
    const usedParms = ref.tokens.filter((token) => parms.some((parm) => parm.PARAMETER_NAME === token.value?.toUpperCase()));

    // Get a list of the available parameters
    const availableParms = parms.filter((parm, i) => 
      (parm.DEFAULT !== null || parm.PARAMETER_MODE === `OUT`) &&
      (!usedParms.some((usedParm) => usedParm.value?.toUpperCase() === parm.PARAMETER_NAME.toUpperCase()))
    );

    return availableParms.map((parm) => createCompletionItem(
      Statement.prettyName(parm.PARAMETER_NAME),
      parm.DEFAULT ? CompletionItemKind.Variable : CompletionItemKind.Constant,
      getParmAttributes(parm),
      [
        `Comment: ${parm.LONG_COMMENT}`,
        `Schema: ${sqlObj.schema}`,
        `Object: ${sqlObj.name}`,
      ].join(`\n`),
      String(parm.ORDINAL_POSITION)
    ));
  }
  return [];
}

export function getCachedParameters(ref: CallableReference): SQLParm[]|undefined {
  const sqlObj = ref.parentRef.object;
  const databaseObj = (sqlObj.schema + sqlObj.name).toUpperCase();
  if (completionItemCache.has(databaseObj)) {
    const parms: SQLParm[] = completionItemCache.get(databaseObj);
    return parms;
  }
}