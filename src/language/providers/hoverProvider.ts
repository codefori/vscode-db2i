import { Hover, languages, MarkdownString, workspace } from "vscode";
import { getSqlDocument } from "./logic/parse";
import { DbCache, LookupResult, RoutineDetail } from "./logic/cache";
import { JobManager } from "../../config";
import Statement from "../../database/statement";
import { getParmAttributes, prepareParamType } from "./logic/completion";
import { StatementType } from "../sql/types";
import { remoteAssistIsEnabled } from "./logic/available";
import { getPositionData } from "./logic/callable";
import { CallableSignature } from "../../database/callable";

// =================================
// We need to open provider to exist so symbols can be cached for hover support when opening files
// =================================

export const openProvider = workspace.onDidOpenTextDocument(async (document) => {
  if (document.languageId === `sql`) {
    if (remoteAssistIsEnabled()) {
      const sqlDoc = getSqlDocument(document);
      const defaultSchema = getDefaultSchema();

      if (!sqlDoc) return;

      for (const statement of sqlDoc.statements) {
        const refs = statement.getObjectReferences();
        if (refs.length) {
          if (statement.type === StatementType.Call) {
            const first = refs[0];
            if (first.object.name) {
              const name = Statement.noQuotes(Statement.delimName(first.object.name, true));
              const schema = Statement.noQuotes(Statement.delimName(first.object.schema || defaultSchema, true));
              const result = await DbCache.getRoutine(schema, name, `PROCEDURE`);
              if (result) {
                await DbCache.getSignaturesFor(schema, name, result.specificNames);
              }
            }

          } else {
            for (const ref of refs) {
              if (ref.object.name) {
                const name = Statement.noQuotes(Statement.delimName(ref.object.name, true));
                const schema = Statement.noQuotes(Statement.delimName(ref.object.schema || defaultSchema, true));
                if (ref.isUDTF) {
                  const result = await DbCache.getRoutine(schema, name, `FUNCTION`);
                  if (result) {
                    await DbCache.getSignaturesFor(schema, name, result.specificNames);
                  }
                } else {
                  await DbCache.getObjectColumns(schema, name);
                }
              }
            }
          }
        }
      }
    }

  }
});

export const hoverProvider = languages.registerHoverProvider({ language: `sql` }, {
  async provideHover(document, position, token) {
    if (!remoteAssistIsEnabled(true)) return;
    
    const defaultSchema = getDefaultSchema();
    const sqlDoc = getSqlDocument(document);
    const offset = document.offsetAt(position);

    if (!sqlDoc) return;

    const tokAt = sqlDoc.getTokenByOffset(offset);
    const statementAt = sqlDoc.getStatementByOffset(offset);

    const md = new MarkdownString();

    if (statementAt) {
      const refs = statementAt.getObjectReferences();
      const possibleNames = refs.map(ref => ref.object.name).filter(name => name);

      for (const ref of refs) {
        const atRef = offset >= ref.tokens[0].range.start && offset <= ref.tokens[ref.tokens.length - 1].range.end;

        if (atRef) {
          const schema = ref.object.schema || defaultSchema;
          const result = await lookupSymbol(ref.object.name, schema, possibleNames);


          if (result) {
            if ('routine' in result) {
              let signatures: CallableSignature[];
              let signature: CallableSignature | undefined;

              const lastToken = ref.tokens[ref.tokens.length-1];

              if (lastToken.type === `closebracket`) {
                let routineOffset: number = lastToken.range.start-1;
                const callableRef = statementAt.getCallableDetail(routineOffset, false);
                if (callableRef) {
                  const { currentCount } = getPositionData(callableRef, routineOffset);
                  signatures = await DbCache.getCachedSignatures(callableRef.parentRef.object.schema, callableRef.parentRef.object.name);
                  const possibleSignatures = signatures.filter((s) => s.parms.length >= currentCount).sort((a, b) => a.parms.length - b.parms.length);
                  signature = possibleSignatures.find((signature) => currentCount <= signature.parms.length);
                } 
              }
              
              if (!signature) {
                signatures = await DbCache.getCachedSignatures(result.routine.schema, result.routine.name);
                signature = signatures[0];
              }

              if (signature) {
                addRoutineMd(md, signature, result);
              }
            } else {
              addSymbol(md, result);
            }
          }

          if (systemSchemas.includes(schema.toUpperCase())) {
            addSearch(md, ref.object.name, md.value.length > 0);
          }
        }
      }

      // If no symbol found, check if we can find a symbol by name
      if (md.value.length === 0 && tokAt && tokAt.type === `word` && tokAt.value) {
        const result = await lookupSymbol(tokAt.value, undefined, possibleNames);
        if (result) {
          addSymbol(md, result);
        }
      }
    }

    return md.value ? new Hover(md) : undefined;
  }
});

const systemSchemas = [`QSYS`, `QSYS2`, `SYSTOOLS`];

function addRoutineMd(base: MarkdownString, signature: CallableSignature, result: RoutineDetail) {
  const returns = signature.returns.length > 0 ? `: ${signature.returns.length} column${signature.returns.length === 1 ? `` : `s`}` : '';

  let codeLines: string[] = [`${Statement.prettyName(result.routine.name)}(`];

  for (let i = 0; i < signature.parms.length; i++) {
    const parm = signature.parms[i];
    let parmString = `  ${Statement.prettyName(parm.PARAMETER_NAME || `parm${i + 1}`)} => ${prepareParamType(parm)}`;

    if (i < signature.parms.length - 1) {
      parmString += `,`;
    }

    codeLines.push(parmString);
  }

  codeLines.push(`)${returns}`);

  base.appendCodeblock(codeLines.join(`\n`), `sql`);

  let parmDetail = [``, `---`];

  for (let i = 0; i < signature.parms.length; i++) {
    const parm = signature.parms[i];
    const escapedAsterisk = parm.LONG_COMMENT ? parm.LONG_COMMENT.replace(/\*/g, `\\*`) : ``;
    parmDetail.push(``, `*@param* \`${Statement.prettyName(parm.PARAMETER_NAME || `parm${i}`)}\` ${escapedAsterisk}`);
  }

  parmDetail.push(``);

  base.appendMarkdown(parmDetail.join(`\n`));
}

function addSearch(base: MarkdownString, value: string, withGap = true) {
  if (withGap) {
    base.appendMarkdown([``, `---`, ``].join(`\n`));
  }

  base.appendMarkdown([
    `[Search on IBM Documentation](https://www.ibm.com/docs/en/search/${encodeURI(value)})`
  ].join(`\n\n`));
}

function addList(base: MarkdownString, items: string[]) {
  if (items.length) {
    base.appendMarkdown(`\n` + items.map(item => `- ${item}`).join(`\n`) + `\n`);
  }
}

function addSymbol(base: MarkdownString, symbol: LookupResult) {
  base.isTrusted = true;
  if ('PARAMETER_NAME' in symbol) {
    base.appendCodeblock(prepareParamType(symbol) + `\n`, `sql`);
  }
  else if ('COLUMN_NAME' in symbol) {
    base.appendCodeblock(prepareParamType(symbol) + `\n`, `sql`);
  }
  else if ('name' in symbol && symbol.text) {
    addList(base, [
      `**Description:** ${symbol.text}`,
    ]);
  }
}

function lookupSymbol(name: string, schema: string | undefined, possibleNames: string[]) {
  name = Statement.noQuotes(Statement.delimName(name, true));
  schema = schema ? Statement.noQuotes(Statement.delimName(schema, true)) : undefined

  return DbCache.lookupSymbol(name, schema, possibleNames);
}

const getDefaultSchema = (): string => {
  const currentJob = JobManager.getSelection();
  return currentJob && currentJob.job.options.libraries[0] ? currentJob.job.options.libraries[0] : `QGPL`;
}