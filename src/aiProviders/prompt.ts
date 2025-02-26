import { JobManager } from "../config";
import Configuration from "../configuration";
import { JobInfo } from "../connection/manager";
import Schemas from "../database/schemas";
import Statement from "../database/statement";
import { buildSchemaDefinition, canTalkToDb, getContentItemsForRefs, getSqlContextItems } from "./context";
import { DB2_SYSTEM_PROMPT } from "./prompts";

export interface PromptOptions {
  progress?: (text: string) => void;
  withDb2Prompt?: boolean;
}

export interface Db2ContextItems {
  name: string;
  description: string;
  content: string;
}

export interface BuildResult {
  context: Db2ContextItems[];
  followUps: string[];
}

export async function getContextItems(input: string, options: PromptOptions = {}): Promise<BuildResult> {
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

    // TODO: self?

    progress(`Finding objects to work with...`);
    const context = await getSqlContextItems(input);

    contextItems.push(...context.items);

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

      if (ref.sqlType === `SCHEMA`) {
        followUps.push(
          `What are some objects in that schema?`,
          `What is the difference between a schema and a library?`,
        );
      } else {
        progress(`Finding objects related to ${prettyNameRef}...`);

        const relatedObjects = await Schemas.getRelatedObjects(ref);
        const contentItems = await getContentItemsForRefs(relatedObjects);

        contextItems.push(...contentItems);

        if (relatedObjects.length === 1) {
          followUps.push(`How is ${prettyNameRef} related to ${Statement.prettyName(relatedObjects[0].name)}?`);
        } else if (ref.sqlType === `TABLE`) {
          followUps.push(`What are some objects related to that table?`);
        }
      }

    } else if (context.refs.length > 1) {
      const randomRef = context.refs[Math.floor(Math.random() * context.refs.length)];
      const prettyNameRef = Statement.prettyName(randomRef.name);
      
      followUps.push(`What are some objects related to ${prettyNameRef}?`);
    } else if (useSchemaDef) {
      progress(`Getting info for schema ${currentSchema}...`);
      const schemaSemantic = await buildSchemaDefinition(currentSchema);
      if (schemaSemantic) {
        contextItems.push({
          name: `SCHEMA Definition`,
          description: `${currentSchema} definition`,
          content: JSON.stringify(schemaSemantic)
        });
      }
    }

    if (options.withDb2Prompt) {
      contextItems.push({
        name: `system prompt`,
        content: DB2_SYSTEM_PROMPT,
        description: `system prompt`,
      });
    }
  }

  return {
    context: contextItems,
    followUps
  };
}