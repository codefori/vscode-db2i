import { Hover, languages, MarkdownString, workspace } from "vscode";
import { getSqlDocument } from "./logic/parse";
import { DbCache, LookupResult } from "./logic/cache";
import { JobManager } from "../../config";
import Statement from "../../database/statement";
import { getParmAttributes, prepareParamType } from "./logic/completion";
import { StatementType } from "../sql/types";
import { remoteAssistIsEnabled } from "./logic/available";

// =================================
// We need to open provider to exist so symbols can be cached for hover support when opening files
// =================================

export const openProvider = workspace.onDidOpenTextDocument(async (document) => {
  if (remoteAssistIsEnabled()) {
    if (document.languageId === `sql`) {
      const sqlDoc = getSqlDocument(document);
      const defaultSchema = getDefaultSchema();

      for (const statement of sqlDoc.statements) {
        const refs = statement.getObjectReferences();
        if (refs.length) {
          if (statement.type === StatementType.Call) {
            const first = refs[0];
            if (first.object.name) {
              const name = Statement.noQuotes(Statement.delimName(first.object.name, true));
              const schema = Statement.noQuotes(Statement.delimName(first.object.schema || defaultSchema, true));
              const result = await DbCache.getType(schema, name, `PROCEDURE`);
              if (result) {
                await DbCache.getRoutineResultColumns(schema, name, true);
                await DbCache.getSignaturesFor(schema, name, result.specificNames);
              }
            }

          } else {
            for (const ref of refs) {
              if (ref.object.name) {
                const name = Statement.noQuotes(Statement.delimName(ref.object.name, true));
                const schema = Statement.noQuotes(Statement.delimName(ref.object.schema || defaultSchema, true));
                if (ref.isUDTF) {
                  const result = await DbCache.getType(schema, name, `FUNCTION`);
                  if (result) {
                    await DbCache.getRoutineResultColumns(schema, name);
                    await DbCache.getSignaturesFor(schema, name, result.specificNames);
                  }
                } else {
                  await DbCache.getColumns(schema, name);
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
    const defaultSchema = getDefaultSchema();
    const sqlDoc = getSqlDocument(document);
    const offset = document.offsetAt(position);

    const tokAt = sqlDoc.getTokenByOffset(offset);
    const statementAt = sqlDoc.getStatementByOffset(offset);

    const md = new MarkdownString();

    if (statementAt) {
      const refs = statementAt.getObjectReferences();
      for (const ref of refs) {
        const atRef = offset >= ref.tokens[0].range.start && offset <= ref.tokens[ref.tokens.length - 1].range.end;

        if (atRef) {
          const schema = ref.object.schema || defaultSchema;
          const result = lookupSymbol(ref.object.name, schema);
          if (result) {
            addSymbol(md, result);
          }

          if (systemSchemas.includes(schema.toUpperCase())) {
            addSearch(md, ref.object.name, result !== undefined);
          }
        } else if (tokAt && tokAt.value) {
          const result = lookupSymbol(tokAt.value, defaultSchema);
          if (result) {
            addSymbol(md, result);
          }
        }
      }
    }

    return md.value ? new Hover(md) : undefined;
  }
});

const systemSchemas = [`QSYS`, `QSYS2`, `SYSTOOLS`];

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

  if ('routine' in symbol) {
    const routineName = Statement.prettyName(symbol.routine.name);
    for (const signature of symbol.signatures) {
      base.appendCodeblock(`${routineName}(\n${signature.parms.map(p => `  ${Statement.prettyName(p.PARAMETER_NAME)}${p.DEFAULT !== undefined ? `?` : ``}: ${prepareParamType(p)}`).join(',\n')}\n)`, `sql`);
    }
  }
  else if ('PARAMETER_NAME' in symbol) {
    base.appendCodeblock(prepareParamType(symbol) + `\n`, `sql`);
  }
  else if ('COLUMN_NAME' in symbol) {
    base.appendCodeblock(prepareParamType(symbol) + `\n`, `sql`);
  }
  else if ('name' in symbol) {
    addList(base, [
      `**Description:** ${symbol.text}`,
    ]);
  }
}

function lookupSymbol(name: string, schema: string) {
  name = Statement.noQuotes(Statement.delimName(name, true));
  schema = Statement.noQuotes(Statement.delimName(schema, true));

  return DbCache.lookupSymbol(name, schema);
}

const getDefaultSchema = (): string => {
  const currentJob = JobManager.getSelection();
  return currentJob && currentJob.job.options.libraries[0] ? currentJob.job.options.libraries[0] : `QGPL`;
}