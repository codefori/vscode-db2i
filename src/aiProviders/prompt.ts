import { JobManager } from "../config";
import Configuration from "../configuration";
import { JobInfo } from "../connection/manager";
import { buildSchemaDefinition, canTalkToDb, generateTableDefinition } from "./context";

interface Db2ContextItems {
  name: string;
  description: string;
  content: string;
  type: "user"|"assistant"|"system";
  specific?: "copilot"|"continue";
}

export async function buildPrompt(input: string, history?: Db2ContextItems[]): Promise<Db2ContextItems[]> {
  const currentJob: JobInfo = JobManager.getSelection();
  let contextItems: Db2ContextItems[] = [];

  if (currentJob) {
    const currentSchema = currentJob?.job.options.libraries[0] || "QGPL";
    const schema = this.getDefaultSchema();

    const useSchemaDef: boolean = Configuration.get<boolean>(`ai.useSchemaDefinition`);

    if (useSchemaDef) {
      const schemaSemantic = await buildSchemaDefinition(schema);
      if (schemaSemantic) {
        contextItems.push({
          name: `SCHEMA Definition`,
          description: `${schema} definition`,
          content: JSON.stringify(schemaSemantic),
          type: "user"
        });
      }
    }

    // TODO: self?

    const refs = await generateTableDefinition(
      currentSchema,
      input.split(` `)
    );

    if (history) {
      contextItems.push(...history);
    }

    for (const table of refs) {
      contextItems.push({
        name: `table definition for ${table.id}`,
        content: table.content,
        description: `${table.type} definition`,
        type: `assistant`
      });
    }
  }

  return contextItems;
}