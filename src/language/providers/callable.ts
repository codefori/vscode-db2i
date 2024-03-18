import { CompletionItem, CompletionItemKind, SnippetString } from "vscode";
import Callable, { CallableSignature, CallableType } from "../../database/callable";
import { ObjectRef, QualifiedObject, CallableReference } from "../sql/types";
import Statement from "../../database/statement";
import { completionItemCache, createCompletionItem, getParmAttributes } from "./completion";

/**
 * Checks if the ref exists as a procedure or function. Then,
 * stores the parameters in the completionItemCache
 */
export async function isCallableType(ref: ObjectRef, type: CallableType) {
  if (ref.object.schema && ref.object.name && ref.object.name.toUpperCase() !== `TABLE`) {
    ref.object.schema = Statement.noQuotes(Statement.delimName(ref.object.schema, true));
    ref.object.name = Statement.noQuotes(Statement.delimName(ref.object.name, true));

    const cacheKey = toCacheKey(ref.object);

    if (completionItemCache.has(cacheKey)) {
      return true;
    }

    const callableRoutine = await Callable.getType(ref.object.schema, ref.object.name, type);

    if (callableRoutine) {
      const parms = await Callable.getSignaturesFor(ref.object.schema, callableRoutine.specificNames);
      completionItemCache.set(cacheKey, parms);
      return true;
    } else {
      // Not callable, let's just cache it as empty to stop spamming the db
      completionItemCache.set(cacheKey, []);
    }
  }

  return false;
}

/**
 * Gets completion items that are stored in the cache
 * for a specific procedure
 */
export function getCallableParameters(ref: CallableReference, offset: number): CompletionItem[] {
  const signatures = getCachedSignatures(ref);
  if (signatures) {
    // find signature with the most parameters
    const parms = signatures.reduce((acc, val) => acc.length > val.parms.length ? acc : val.parms, []);

    // Find any already referenced parameters in this list
    const usedParms = ref.tokens.filter((token) => parms.some((parm) => parm.PARAMETER_NAME === token.value?.toUpperCase()));

    // When named parameters are used, the signature doesn't really apply
    const { currentParm, firstNamedParameter } = getPositionData(ref, offset);

    // Get a list of the available parameters
    const availableParms = parms.filter((parm, i) => 
      (i >= Math.max(currentParm, firstNamedParameter || -1)) && // Hide fixed parameters that have already been used
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

export function getPositionData(ref: CallableReference, offset: number) {
  const paramCommas = ref.tokens.filter(token => token.type === `comma`);
    
  let currentParm = paramCommas.findIndex(t => offset < t.range.end);

  if (currentParm === -1) {
    currentParm = paramCommas.length;
  }

  const firstNamedPipe = ref.tokens.find((token, i) => token.type === `rightpipe`);
  let firstNamedParameter = firstNamedPipe ? paramCommas.findIndex((token, i) => token.range.start > firstNamedPipe.range.start) : undefined;

  if (firstNamedParameter === -1) {
    firstNamedParameter = undefined;
  }

  return {
    currentParm,
    currentCount: paramCommas.length + 1,
    firstNamedParameter
  };
}

export function getCachedSignatures(ref: CallableReference): CallableSignature[]|undefined {
  const key = toCacheKey(ref.parentRef.object);
  if (completionItemCache.has(key)) {
    return completionItemCache.get(key);
  }
}

function toCacheKey(sqlObj: QualifiedObject): string {
  return sqlObj.schema + sqlObj.name;
}