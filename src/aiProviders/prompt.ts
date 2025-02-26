import { JobManager } from "../config";
import Configuration from "../configuration";
import { JobInfo } from "../connection/manager";
import Schemas from "../database/schemas";
import Statement from "../database/statement";
import { buildSchemaDefinition, canTalkToDb, getContentItemsForRefs, getSqlContextItems } from "./context";
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

export interface BuildResult {
  context: Db2ContextItems[];
  followUps: string[];
}

export async function buildPrompt(input: string, options: PromptOptions = {}): Promise<BuildResult> {
  const currentJob: JobInfo = JobManager.getSelection();
  
  let contextItems: Db2ContextItems[] = [];
  let followUps = [];

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
    const context = await getSqlContextItems(input);

    if (options.history) {
      contextItems.push(...options.history);
    }

    for (const sqlObj of context.items) {
      contextItems.push({
        name: `${sqlObj.type.toLowerCase()} definition for ${sqlObj.id}`,
        content: sqlObj.content,
        description: `${sqlObj.type} definition`,
        type: `assistant`
      });
    }

    if (context.refs.filter(r => r.sqlType === `TABLE`).length >= 2) {
      const randomIndexA = Math.floor(Math.random() * context.refs.length);
      const randomIndexB = Math.floor(Math.random() * context.refs.length);
      const tableA = context.refs[randomIndexA].name;
      const tableB = context.refs[randomIndexB].name;

      if (tableA !== tableB) {
        followUps.push(`How can I join ${tableA} and ${tableB}?`);
      }
    }

    // If the user only requests one reference, then let's find related objects
    if (context.refs.length === 1) {
      const ref = context.refs[0];
      const prettyNameRef = Statement.prettyName(ref.name);
      progress(`Finding objects related to ${prettyNameRef}...`);

      const relatedObjects = await Schemas.getRelatedObjects(ref);
      const contentItems = await getContentItemsForRefs(relatedObjects);

      if (relatedObjects.length === 1) {
        followUps.push(`How is ${prettyNameRef} related to ${Statement.prettyName(relatedObjects[0].name)}?`);
      } else if (ref.sqlType === `TABLE`) {
        followUps.push(`What are some objects related to that table?`);
      }

      for (const sqlObj of contentItems) {
        contextItems.push({
          name: `${sqlObj.type.toLowerCase()} definition for ${sqlObj.id}`,
          content: sqlObj.content,
          description: `${sqlObj.type} definition`,
          type: `assistant`
        });
      }

    } else if (context.refs.length > 1) {
      const randomRef = context.refs[Math.floor(Math.random() * context.refs.length)];
      const prettyNameRef = Statement.prettyName(randomRef.name);
      
      followUps.push(`What are some objects related to ${prettyNameRef}?`);
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

  return {
    context: contextItems,
    followUps
  };
}