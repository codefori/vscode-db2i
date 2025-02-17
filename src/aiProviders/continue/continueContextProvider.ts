import * as vscode from "vscode";
import { JobManager } from "../../config";
import { JobInfo } from "../../connection/manager";
import { SelfCodeNode } from "../../views/jobManager/selfCodes/nodes";
import { buildSchemaSemantic, canTalkToDb, createContinueContextItems, findPossibleTables, generateTableDefinition, refsToMarkdown } from "../context";
import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
  ContextSubmenuItem,
  IContextProvider,
  LoadSubmenuItemsArgs,
} from "@continuedev/core";
import { DB2_SELF_PROMPT, DB2_SYSTEM_PROMPT } from "./prompts";
import { table } from "console";

export let isContinueActive = false;

const db2ContextProviderDesc: ContextProviderDescription = {
  title: "db2i",
  displayTitle: "Db2i",
  description: "Db2 for i Context Provider",
  type: "normal",
};

/**
 * - Get Existing Db2 connection from vscode
 * - Use connection to build query for database to add additional context
 *
 */
export class db2ContextProvider implements IContextProvider {
  get description(): ContextProviderDescription {
    return db2ContextProviderDesc;
  }

  getCurrentJob(): JobInfo {
    const currentJob: JobInfo = JobManager.getSelection();
    return currentJob;
  }

  private getDefaultSchema = (): string => {
    const currentJob: JobInfo = this.getCurrentJob();
    return currentJob?.job.options.libraries[0] || "QGPL";
  };

  tryParseJson(row: SelfCodeNode) {
    try {
      return JSON.parse(row.INITIAL_STACK as unknown as string);
    } catch (e) {
      return [];
    }
  }

  async getSelfCodes(selected: JobInfo): Promise<SelfCodeNode[] | undefined> {
    const current_job = selected.job.id;
    const content = `
    SELECT 
      job_name, 
      user_name, 
      reason_code, 
      logged_time, 
      logged_sqlstate, 
      logged_sqlcode, 
      matches, 
      stmttext, 
      message_text, 
      message_second_level_text,
      program_library, 
      program_name, 
      program_type, 
      module_name, 
      client_applname, 
      client_programid, 
      initial_stack
    FROM 
      qsys2.sql_error_log, 
      LATERAL (
        SELECT * 
        FROM TABLE(SYSTOOLS.SQLCODE_INFO(logged_sqlcode))
      )
    WHERE 
      job_name = '${current_job}'
    ORDER BY 
      logged_time DESC
  `;

    try {
      const result = await selected.job
        .query<SelfCodeNode>(content)
        .execute(10000);
      if (result.success && result.data) {
        const data: SelfCodeNode[] = result.data.map((row) => ({
          ...row,
          INITIAL_STACK: this.tryParseJson(row),
        }));

        return data;
      }
    } catch (e) {
      vscode.window.showErrorMessage(
        `An error occured fetching SELF code errors, and therefore will be disabled.`
      );
    }
  }

  async getContextItems(
    query: string,
    extras: ContextProviderExtras
  ): Promise<ContextItem[]> {
    const contextItems: ContextItem[] = [];
    if (canTalkToDb()) {
      const job: JobInfo = this.getCurrentJob();
      const schema = this.getDefaultSchema();
      const fullInput = extras.fullInput;
      const schemaSemantic = await buildSchemaSemantic(schema);
      contextItems.push({
        name: `SCHEMA Semantic`,
        description: `${schema} definition`,
        content: JSON.stringify(schemaSemantic),
      });
      try {
        switch (true) {
          case fullInput.includes(`*SELF`) || query?.includes(`*SELF`):
            // get current self code errors in job
            // build promt with error information
            // add to contextItems
  
            if (job) {
              const selfCodes = await this.getSelfCodes(job);
  
              let prompt = DB2_SELF_PROMPT.join(" ");
              prompt += JSON.stringify(selfCodes, null, 2);
  
              contextItems.push({
                name: `${job.name}-self`,
                description: `SELF code errors for ${job.name}`,
                content: prompt,
              });
            }

            return contextItems;
          default:
            // const contextItems: ContextItem[] = [];
            // const tableRefs = await findPossibleTables(
            //   null,
            //   schema,
            //   fullInput.split(` `)
            // );
            // const markdownRefs = refsToMarkdown(tableRefs);

            // contextItems.push(...createContinueContextItems(markdownRefs));

            const tablesRefs = await generateTableDefinition(schema, fullInput.split(` `));
            for (const table in tablesRefs) {
              contextItems.push({
                name: `table definition for ${table}`,
                content: tablesRefs[table],
                description: `Table definition`
              })
            }

            return contextItems;
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to query Db2i database: ${error}`);
        throw new Error(`Failed to query Db2i database: ${error}`);
      } finally {
      }
      
    } else {
      throw new Error(
        `Not connected to the database. Please check your configuration.`
      );
    }
    
  }
  async loadSubmenuItems(
    args: LoadSubmenuItemsArgs
  ): Promise<ContextSubmenuItem[]> {
    return [];
  }
}

export async function registerContinueProvider() {
  const provider = new db2ContextProvider();
  const continueID = `Continue.continue`;
  const continueEx = vscode.extensions.getExtension(continueID);
  if (continueEx) {
    if (!continueEx.isActive) {
      await continueEx.activate();
    }
  
    isContinueActive = true;
    const continueAPI = continueEx?.exports;
    continueAPI?.registerCustomContextProvider(provider);
    vscode.commands.executeCommand('setContext', 'vscode-db2i:continueExtensionActive', true);
  }
}
