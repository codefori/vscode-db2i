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

    const defaultSchema = await currentJob.job.getCurrentSchema();
    const naming = currentJob.job.getNaming();

    const sqlDoc = getSqlDocument(document);
    const offset = document.offsetAt(position);

    const tokAt = sqlDoc.getTokenByOffset(offset);
    const statementAt = sqlDoc.getStatementByOffset(offset);

    if (statementAt) {
      const refs = statementAt.getObjectReferences();

      const ref = refs.find(ref => ref.tokens[0].range.start && offset <= ref.tokens[ref.tokens.length - 1].range.end);

      if (ref) {
        const name = Statement.delimName(ref.object.name, true);

        // Schema is based on a few things:
        // If it's a fully qualified path, use the schema path
        // Otherwise:
        //  - if SQL naming is in use, then use the default schema
        //  - if system naming is in use, then don't pass a library and the library list will be used
        const schema = ref.object.schema ? Statement.delimName(ref.object.schema, true) : naming === `sql` ? Statement.delimName(defaultSchema) : undefined;

        const possibleObjects = await Schemas.resolveObjects([{name, schema}], [`*LIB`]);

        let totalBlocks: string[] = [];

        if (possibleObjects.length > 0) {
          if (possibleObjects.length > 1) {
            totalBlocks.push(
              `-- Multiple objects found with the same name.`
            );
          }

          for (const posObj of possibleObjects) {
            const newContent = await Schemas.generateSQL(posObj.schema, posObj.name, posObj.sqlType, true);
            totalBlocks.push(newContent);
          }

          const document = await workspace.openTextDocument({ content: totalBlocks.join(`\n\n`), language: `sql` });

          return {
            uri: document.uri,
            range: document.lineAt(0).range,
          };
        }

      }
    }
  }
});