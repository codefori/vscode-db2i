import { languages, workspace } from "vscode";
import { getSqlDocument } from "./logic/parse";
import { JobManager } from "../../config";
import Statement from "../../database/statement";
import { remoteAssistIsEnabled } from "./logic/available";
import Schemas, {  } from "../../database/schemas";


export const peekProvider = languages.registerDefinitionProvider({ language: `sql` }, {
  async provideDefinition(document, position, token) {
    if (!remoteAssistIsEnabled()) return;

    const currentJob = JobManager.getSelection();

    if (!currentJob) return;

    const defaultSchema = currentJob.job.getCurrentSchema();
    const naming = currentJob.job.getNaming();

    const sqlDoc = getSqlDocument(document);
    const offset = document.offsetAt(position);

    const tokAt = sqlDoc.getTokenByOffset(offset);
    const statementAt = sqlDoc.getStatementByOffset(offset);

    if (statementAt) {
      const refs = statementAt.getObjectReferences();

      const ref = refs.find(ref => ref.tokens[0].range.start && offset <= ref.tokens[ref.tokens.length - 1].range.end);

      if (ref) {
        const name = Statement.noQuotes(Statement.delimName(ref.object.name, true));

        // Schema is based on a few things:
        // If it's a fully qualified path, use the schema path
        // Otherwise:
        //  - if SQL naming is in use, then use the default schema
        //  - if system naming is in use, then don't pass a library and the library list will be used
        const schema = ref.object.schema ? Statement.noQuotes(Statement.delimName(ref.object.schema, true)) : naming === `sql` ? defaultSchema : undefined;

        const possibleObjects = await Schemas.resolveObjects([{name, schema}]);

        if (possibleObjects.length === 1) {
          const obj = possibleObjects[0];
          const content = await Schemas.generateSQL(obj.schema, obj.name, obj.sqlType, true);

          const document = await workspace.openTextDocument({ content, language: `sql` });

          return {
            uri: document.uri,
            range: document.lineAt(1).range,
          };
        }

      }
    }
  }
});