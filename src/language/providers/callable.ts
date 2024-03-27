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
 * Gets completion items for named paramaters
 * that are stored in the cache for a specific procedure
 */
export function getCallableParameters(ref: CallableReference, offset: number): CompletionItem[] {
  const signatures = getCachedSignatures(ref);
  if (signatures) {
    const { firstNamedParameter } = getPositionData(ref, offset);

    // find signature with the most parameters
    const parms: SQLParm[] = signatures.reduce((acc, val) => acc.length > val.parms.length ? acc : val.parms, []);

    // Find any already referenced parameters in this list
    const usedParms = ref.tokens.filter((token) => parms.some((parm) => parm.PARAMETER_NAME === token.value?.toUpperCase()));

    //call ifs_write(a, b, ifs => '')

    // Get a list of the available parameters
    const availableParms = parms.filter((parm, i) =>
      (!usedParms.some((usedParm) => usedParm.value?.toUpperCase() === parm.PARAMETER_NAME.toUpperCase())) && // Hide parameters that have already been named
      parm.ORDINAL_POSITION >= ((firstNamedParameter + 1) || 1) // Hide parameters that are before the first named parameter
    );

    return availableParms.map((parm) => {
      const item = createCompletionItem(
        Statement.prettyName(parm.PARAMETER_NAME),
        parm.DEFAULT ? CompletionItemKind.Variable : CompletionItemKind.Constant,
        getParmAttributes(parm),
        parm.LONG_COMMENT,
        `p@` + String(parm.ORDINAL_POSITION)
      );

      switch (parm.PARAMETER_MODE) {
        case `IN`:
        case `INOUT`:

          let defaultSnippetValue = `\${0}`;

          if (parm.DEFAULT) {
            defaultSnippetValue = `\${0:${parm.DEFAULT}}`;
          }

          if (parm.LONG_COMMENT) {
            // This logic can take a LONG_COMMENT such as this:
            //   A, B, C - some comment
            //   0=no, 1=yes - some comment
            // and turn it into a snippet of options for a parameter

            const splitIndex = parm.LONG_COMMENT.indexOf(`-`);
            if (splitIndex !== -1) {
              const possibleItems = parm.LONG_COMMENT.substring(0, splitIndex).trim();
              if (possibleItems.includes(`,`)) {
                const literalValues = possibleItems
                  .split(`,`)
                  .map((item) => item.includes(`=`) ? item.split(`=`)[0].trim() : item.trim())
                  .map((item) => parm.CHARACTER_MAXIMUM_LENGTH !== null ? `${item.trim()}` : item.trim())

                // If there are no spaces in the literal values, then it's likely to be a good candidate for a snippet
                if (literalValues.some((item) => item.includes(` `)) === false) {
                  defaultSnippetValue = `'\${1|` + literalValues.join(`,`) + `|}'\${0}`;
                }
              }
            }
          }

          item.insertText = new SnippetString(item.label + ` => ${defaultSnippetValue}`);
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

export function getCachedSignatures(ref: CallableReference): CallableSignature[] | undefined {
  const key = toCacheKey(ref.parentRef.object);
  if (completionItemCache.has(key)) {
    return completionItemCache.get(key);
  }
}

function toCacheKey(sqlObj: QualifiedObject): string {
  return sqlObj.schema + sqlObj.name;
}