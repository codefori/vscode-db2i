import { Hover, languages, MarkdownString } from "vscode";
import { getSqlDocument } from "./logic/parse";
import { DbCache, LookupResult } from "./logic/cache";
import { JobManager } from "../../config";
import Statement from "../../database/statement";
import { getParmAttributes, prepareParamType } from "./logic/completion";

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
          const result = lookupSymbol(ref.object.name, ref.object.schema || defaultSchema);
          if (result) {
            addSymbol(md, result);
            return new Hover(md);
          }
        }
      }
    }

    if (tokAt && tokAt.value) {
      const result = lookupSymbol(tokAt.value, defaultSchema);
      if (result) {
        addSymbol(md, result);
        return new Hover(md);
      }
    }
  }
});

const systemSchemas = [`QSYS`, `QSYS2`, `SYSTOOLS`];

function addSearch (base: MarkdownString, value: string) {
  base.appendMarkdown([
    ``,
    `---`,
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
      base.appendCodeblock(`${routineName}(${signature.parms.map(p => `${Statement.prettyName(p.PARAMETER_NAME)}${p.DEFAULT !== undefined ? `?` : ``}`).join(', ')})`, `sql`);
    }

    if (systemSchemas.includes(symbol.routine.schema)) {
      addSearch(base, symbol.routine.name);
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

    if (systemSchemas.includes(symbol.schema)) {
      addSearch(base, symbol.name);
    }
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