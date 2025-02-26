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

    // First, let's take the user input and see if contains any references to SQL objects.
    // This returns a list of references to SQL objects, such as tables, views, schemas, etc,
    // and the context items that are related to those references.
    const userInput = await getSqlContextItems(input);

    contextItems.push(...userInput.items);

    // If the user referenced 2 or more tables, let's add a follow up
    if (userInput.refs.filter(r => r.sqlType === `TABLE`).length >= 2) {
      const randomIndexA = Math.floor(Math.random() * userInput.refs.length);
      const randomIndexB = Math.floor(Math.random() * userInput.refs.length);
      const tableA = userInput.refs[randomIndexA].name;
      const tableB = userInput.refs[randomIndexB].name;

      if (tableA !== tableB) {
        followUps.push(`How can I join ${tableA} and ${tableB}?`);
      }
    }

    // If the user only requests one reference, then let's do something
    if (userInput.refs.length === 1) {
      const ref = userInput.refs[0];
      const prettyNameRef = Statement.prettyName(ref.name);

      if (ref.sqlType === `SCHEMA`) {
        // If the only reference is a schema, let's just add follow ups
        followUps.push(
          `What are some objects in that schema?`,
          `What is the difference between a schema and a library?`,
        );

      } else {
        // If the user referenced a table, view, or other object, let's fetch related objects
        progress(`Finding objects related to ${prettyNameRef}...`);

        const relatedObjects = await Schemas.getRelatedObjects(ref);
        const contentItems = await getContentItemsForRefs(relatedObjects);

        contextItems.push(...contentItems);

        // Then also add some follow ups
        if (relatedObjects.length === 1) {
          followUps.push(`How is ${prettyNameRef} related to ${Statement.prettyName(relatedObjects[0].name)}?`);
        } else if (ref.sqlType === `TABLE`) {
          followUps.push(`What are some objects related to that table?`);
        }
      }

    } else if (userInput.refs.length > 1) {
      // If there are multiple references, let's just add a follow up
      const randomRef = userInput.refs[Math.floor(Math.random() * userInput.refs.length)];
      const prettyNameRef = Statement.prettyName(randomRef.name);
      
      followUps.push(`What are some objects related to ${prettyNameRef}?`);

    } else if (useSchemaDef) {
      // If the user didn't reference any objects, but we are using schema definitions, let's just add the schema definition
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