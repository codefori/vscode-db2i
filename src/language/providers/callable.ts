import { CompletionItem, CompletionItemKind, SnippetString } from "vscode";
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
export function getCallableParameters(ref: CallableReference, offset: number): CompletionItem[] {
  const sqlObj = ref.parentRef.object;
  const parms = getCachedParameters(ref);
  if (parms) {
    // Find any already referenced parameters in this list
    const usedParms = ref.tokens.filter((token) => parms.some((parm) => parm.PARAMETER_NAME === token.value?.toUpperCase()));

    // When named parameters are used, the signature doesn't really apply
    const paramCommas = ref.tokens.filter(token => token.type === `comma`);
    
    let currentParm = paramCommas.findIndex(t => offset < t.range.end);

    if (currentParm === -1) {
      currentParm = paramCommas.length;
    }

    const firstNamedPipe = ref.tokens.find((token, i) => token.type === `rightpipe`);
    const firstNamedParameter = firstNamedPipe ? paramCommas.findIndex((token, i) => token.range.start > firstNamedPipe.range.start) : -1;

    // Get a list of the available parameters
    const availableParms = parms.filter((parm, i) => 
      (i >= Math.max(currentParm, firstNamedParameter)) && // Hide fixed parameters that have already been used
      (!usedParms.some((usedParm) => usedParm.value?.toUpperCase() === parm.PARAMETER_NAME.toUpperCase())) // Hide parameters that have already been named
    );

    return availableParms.map((parm) => {
      const item = createCompletionItem(
        Statement.prettyName(parm.PARAMETER_NAME),
        parm.DEFAULT ? CompletionItemKind.Variable : CompletionItemKind.Constant,
        getParmAttributes(parm),
        parm.LONG_COMMENT,
        String(parm.ORDINAL_POSITION)
      );

      switch (parm.PARAMETER_MODE) {
        case `IN`:
        case `INOUT`:
          if (parm.DEFAULT) {
            item.insertText = new SnippetString(item.label + ` => \${0:${parm.DEFAULT}}`);
          } else {
            item.insertText = new SnippetString(item.label + ` => \${0}`);
          }
          break;
        case `OUT`:
          item.insertText = item.label + ` => ?`;
          break;
      }

      return item;
    });
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