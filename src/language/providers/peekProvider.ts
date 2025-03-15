import { languages, workspace } from "vscode";
import { getSqlDocument } from "./logic/parse";
import { JobManager } from "../../config";
import Statement from "../../database/statement";
import { StatementType } from "../sql/types";
import { remoteAssistIsEnabled } from "./logic/available";
import Schemas, { AllSQLTypes, InternalTypes, SQLType } from "../../database/schemas";


export const peekProvider = languages.registerDefinitionProvider({ language: `sql` }, {
  async provideDefinition(document, position, token) {
    const standardObjects: SQLType[] = AllSQLTypes.filter(type => ![`functions`, `procedures`].includes(type));
    if (!remoteAssistIsEnabled()) return;

    const defaultSchema = getDefaultSchema();
    const sqlDoc = getSqlDocument(document);
    const offset = document.offsetAt(position);

    const tokAt = sqlDoc.getTokenByOffset(offset);
    const statementAt = sqlDoc.getStatementByOffset(offset);

    if (statementAt) {
      const refs = statementAt.getObjectReferences();

      const ref = refs.find(ref => ref.tokens[0].range.start && offset <= ref.tokens[ref.tokens.length - 1].range.end);

      if (ref) {
        const name = Statement.noQuotes(Statement.delimName(ref.object.name, true));
        const schema = Statement.noQuotes(Statement.delimName(ref.object.schema || defaultSchema, true));

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

const getDefaultSchema = (): string => {
  const currentJob = JobManager.getSelection();
  return currentJob && currentJob.job.options.libraries[0] ? currentJob.job.options.libraries[0] : `QGPL`;
}