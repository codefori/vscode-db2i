import { JobManager } from "../config";
import Configuration from "../configuration";
import { JobInfo } from "../connection/manager";
import { buildSchemaDefinition, canTalkToDb, getSqlContextItems } from "./context";
import { DB2_SYSTEM_PROMPT } from "./prompts";

export interface PromptOptions {
  history?: Db2ContextItems[];
  progress?: (text: string) => void;
}

export interface Db2ContextItems {
  name: string;
  description: string;
  content: string;
  type: "user"|"assistant"|"system";
  specific?: "copilot"|"continue";
}

export async function buildPrompt(input: string, options: PromptOptions = {}): Promise<Db2ContextItems[]> {
  const currentJob: JobInfo = JobManager.getSelection();
  let contextItems: Db2ContextItems[] = [];

  const progress = (message: string) => {
    if (options.progress) {
      options.progress(message);
    }
  };

  if (currentJob) {
    const currentSchema = currentJob?.job.options.libraries[0] || "QGPL";

    const useSchemaDef: boolean = Configuration.get<boolean>(`ai.useSchemaDefinition`);

    if (useSchemaDef) {
      progress(`Building schema definition for ${currentSchema}...`);
      const schemaSemantic = await buildSchemaDefinition(currentSchema);
      if (schemaSemantic) {
        contextItems.push({
          name: `SCHEMA Definition`,
          description: `${currentSchema} definition`,
          content: JSON.stringify(schemaSemantic),
          type: "user"
        });
      }
    }

    // TODO: self?

    progress(`Finding objects to work with...`);
    const refs = await getSqlContextItems(input);

    if (options.history) {
      contextItems.push(...options.history);
    }

    for (const table of refs) {
      contextItems.push({
        name: `table definition for ${table.id}`,
        content: table.content,
        description: `${table.type} definition`,
        type: `assistant`
      });
    }

    if (!options.history) {
      contextItems.push({
        name: `system prompt`,
        content: DB2_SYSTEM_PROMPT,
        description: `system prompt`,
        type: `system`
      });
    }

    contextItems.push({
      name: `user prompt`,
      content: input,
      description: `user prompt`,
      type: `user`
    });
  }

  return contextItems;
}