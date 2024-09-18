import { env, Hover, languages, MarkdownString, workspace } from "vscode";
import { getSqlDocument } from "./logic/parse";
import { DbCache, LookupResult, RoutineDetail } from "./logic/cache";
import { JobManager } from "../../config";
import Statement from "../../database/statement";
import { getParmAttributes, prepareParamType } from "./logic/completion";
import { StatementType } from "../sql/types";
import { remoteAssistIsEnabled } from "./logic/available";
import { getPositionData } from "./logic/callable";
import { CallableSignature } from "../../database/callable";
import Schemas, { AllSQLTypes, InternalTypes, SQLType } from "../../database/schemas";

const standardObjects: SQLType[] = AllSQLTypes.filter(type => ![`functions`, `procedures`].includes(type));

export const peekProvider = languages.registerDefinitionProvider({ language: `sql` }, {
  async provideDefinition(document, position, token) {
    if (!remoteAssistIsEnabled()) return;
    console.log(`peekProvider`);

    const defaultSchema = getDefaultSchema();
    const sqlDoc = getSqlDocument(document);
    const offset = document.offsetAt(position);

    const tokAt = sqlDoc.getTokenByOffset(offset);
    const statementAt = sqlDoc.getStatementByOffset(offset);

    if (statementAt) {
      const refs = statementAt.getObjectReferences();
      const possibleNames = refs.map(ref => ref.object.name).filter(name => name);

      const ref = refs.find(ref => ref.tokens[0].range.start && offset <= ref.tokens[ref.tokens.length - 1].range.end);

      if (ref) {
        const name = Statement.noQuotes(Statement.delimName(ref.object.name, true));
        const schema = Statement.noQuotes(Statement.delimName(ref.object.schema || defaultSchema, true));

        let types: SQLType[] = standardObjects;

        if (ref.isUDTF) {
          types = [`functions`];
        } else if (statementAt.type === StatementType.Call) {
          types = [`procedures`];
        }

        const possibleObjects = await Schemas.getObjects(schema, types, {filter: name});

        if (possibleObjects.length) {
          const lines: string[] = [];
          for (const obj of possibleObjects) {
            const type = InternalTypes[obj.type];
            if (type) {
              const contents = await Schemas.generateSQL(obj.schema, obj.name, type.toUpperCase());
              lines.push(contents, ``, ``);
            }
          }

          const document = await workspace.openTextDocument({ content: lines.join(`\n`), language: `sql` });

          return {
            uri: document.uri,
            range: document.lineAt(0).range,
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