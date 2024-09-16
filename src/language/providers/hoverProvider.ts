import { Hover, languages, MarkdownString } from "vscode";
import { getSqlDocument } from "./logic/parse";
import { DbCache } from "./logic/cache";
import { JobManager } from "../../config";
import Statement from "../../database/statement";

export const hoverProvider = languages.registerHoverProvider({ language: `sql` }, {
  async provideHover(document, position, token) {
    const defaultSchema = getDefaultSchema();
    const sqlDoc = getSqlDocument(document);
    const offset = document.offsetAt(position);

    const tokAt = sqlDoc.getTokenByOffset(offset);
    const statementAt = sqlDoc.getStatementByOffset(offset);

    if (statementAt) {
      const refs = statementAt.getObjectReferences();
      for (const ref of refs) {
        const atRef = offset >= ref.tokens[0].range.start && offset <= ref.tokens[ref.tokens.length - 1].range.end;

        if (atRef) {
          const result = lookupSymbol(ref.object.name, ref.object.schema || defaultSchema);
          return new Hover(new MarkdownString().appendCodeblock(JSON.stringify(result, null, 2), `json`));
        }
      }
    }

    if (tokAt && tokAt.value) {
      const result = lookupSymbol(tokAt.value, defaultSchema);
      return new Hover(new MarkdownString().appendCodeblock(JSON.stringify(result, null, 2), `json`));
    }

    return;
  }
});

function lookupSymbol(name: string, schema: string) {
  name = Statement.noQuotes(Statement.delimName(name, true));
  schema = Statement.noQuotes(Statement.delimName(schema, true));

  return DbCache.lookupSymbol(name, schema);
}

const getDefaultSchema = (): string => {
  const currentJob = JobManager.getSelection();
  return currentJob && currentJob.job.options.libraries[0] ? currentJob.job.options.libraries[0] : `QGPL`;
}