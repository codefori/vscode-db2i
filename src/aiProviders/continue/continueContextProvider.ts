import * as vscode from "vscode";
import { JobManager } from "../../config";
import { JobInfo, SQLJobManager } from "../../connection/manager";
import Statement from "../../database/statement";
import { table } from "console";
import { selfCodesResultsView } from "../../views/jobManager/selfCodes/selfCodesResultsView";
import { SelfCodeNode } from "../../views/jobManager/selfCodes/nodes";
import { SQLJob } from "../../connection/sqlJob";

const db2ContextProviderDesc: ContextProviderDescription = {
  title: "db2i",
  displayTitle: "Db2i",
  description: "Db2 for i Context Provider",
  type: "normal",
};

type TableRefs = { [key: string]: TableColumn[]}

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

  async findPossibleTables(schema: string, words: string[]) {
    // let refSchema: string = "";
    // let table: string = "";
    // words.forEach(item => {
    //   if (item.includes(`.`)) {
    //     refSchema = item.split(`.`)[0];
    //     table = item.split(`.`)[1];
    //   }
    // })

    words = words.map((word) =>
      word.replace(/[.,\/#!?$%\^&\*;:{}=\-_`~()]/g, "")
    );

    // Add extra words for words with S at the end, to ignore possible plurals
    words.forEach((item) => {
      if (item.endsWith(`s`)) {
        words.push(item.slice(0, -1));
      }
    });

    const validWords = words
      .filter((item) => item.length > 2 && !item.includes(`'`))
      .map((item) => `'${Statement.delimName(item, true)}'`);

    const objectFindStatement = [
      `SELECT `,
      `  column.TABLE_NAME,`,
      `  column.COLUMN_NAME,`,
      `  key.CONSTRAINT_NAME,`,
      `  column.DATA_TYPE, `,
      `  column.CHARACTER_MAXIMUM_LENGTH,`,
      `  column.NUMERIC_SCALE, `,
      `  column.NUMERIC_PRECISION,`,
      `  column.IS_NULLABLE, `,
      // `  column.HAS_DEFAULT, `,
      // `  column.COLUMN_DEFAULT, `,
      `  column.COLUMN_TEXT, `,
      `  column.IS_IDENTITY`,
      `FROM QSYS2.SYSCOLUMNS2 as column`,
      `LEFT JOIN QSYS2.syskeycst as key`,
      `  on `,
      `    column.table_schema = key.table_schema and`,
      `    column.table_name = key.table_name and`,
      `    column.column_name = key.column_name`,
      `WHERE column.TABLE_SCHEMA = '${schema}'`,
      ...[
        words.length > 0
          ? `AND column.TABLE_NAME in (${validWords.join(`, `)})`
          : ``,
      ],
      `ORDER BY column.ORDINAL_POSITION`,
    ].join(` `);

    // TODO
    const result: TableColumn[] = await JobManager.runSQL(objectFindStatement);

    const tables: TableRefs = {};

    for (const row of result) {
      if (!tables[row.TABLE_NAME]) {
        tables[row.TABLE_NAME] = [];
      }

      tables[row.TABLE_NAME].push(row);
    }

    return tables;
  }

  async findAllTables(schema: string) {
    const objectFindStatement = [
      `SELECT `,
      `  column.TABLE_NAME,`,
      `  column.COLUMN_NAME,`,
      `  key.CONSTRAINT_NAME,`,
      `  column.DATA_TYPE, `,
      `  column.CHARACTER_MAXIMUM_LENGTH,`,
      `  column.NUMERIC_SCALE, `,
      `  column.NUMERIC_PRECISION,`,
      `  column.IS_NULLABLE, `,
      // `  column.HAS_DEFAULT, `,
      // `  column.COLUMN_DEFAULT, `,
      `  column.COLUMN_TEXT, `,
      `  column.IS_IDENTITY`,
      `FROM QSYS2.SYSCOLUMNS2 as column`,
      `LEFT JOIN QSYS2.syskeycst as key`,
      `  on `,
      `    column.table_schema = key.table_schema and`,
      `    column.table_name = key.table_name and`,
      `    column.column_name = key.column_name`,
      `WHERE column.TABLE_SCHEMA = '${schema}'`,
    ].join(` `);

    const result: TableColumn[] = await JobManager.runSQL(objectFindStatement);

    const tables: TableRefs = {};

    for (const row of result) {
      if (!tables[row.TABLE_NAME]) {
        tables[row.TABLE_NAME] = [];
      }

      tables[row.TABLE_NAME].push(row);
    }

    return tables;
  }
  async getSelfCodes(selected: JobInfo): Promise<SelfCodeNode[]|undefined> {
    const current_job = selected.job.id;
    const content = `SELECT 
                      job_name, user_name, reason_code, logged_time, logged_sqlstate, logged_sqlcode, matches, stmttext, message_text, message_second_level_text,
                      program_library, program_name, program_type, module_name, client_applname, client_programid, initial_stack
                    FROM qsys2.sql_error_log, lateral (select * from TABLE(SYSTOOLS.SQLCODE_INFO(logged_sqlcode)))
                    where job_name = '${current_job}'
                    order by logged_time desc`;

    try {
      const result = await selected.job.query<SelfCodeNode>(content).run(10000);
      if (result.success) {
        const data: SelfCodeNode[] = result.data.map((row) => ({
          ...row,
          INITIAL_STACK: JSON.parse(row.INITIAL_STACK as unknown as string)
        }));

      
        return data;
      }
    } catch (e) {
      vscode.window.showErrorMessage(`An error occured fetching SELF code errors, and therefore will be disabled.`);
    }
  }

  async getContextItems(
    query: string,
    extras: ContextProviderExtras
  ): Promise<ContextItem[]> {
    const job: JobInfo = this.getCurrentJob();
    const schema = this.getDefaultSchema();
    const fullInput = extras.fullInput;
    const contextItems: ContextItem[] = [];
    try {
      switch (true) {
        case fullInput.includes(`/self`):
          // get current self code errors in job
          // build promt with error information
          // add to contextItems

          if (job) {
            const selfCodes = await this.getSelfCodes(job);
            
            let prompt = `Db2 for i  self code errors\n`;
            prompt += `Summarize the SELF code errors provided. The SQL Error Logging Facility (SELF) provides a mechanism that can be used to understand when SQL statements are encountering specific SQL errors or warnings. SELF is built into Db2 for i and can be enabled in specific jobs or system wide. Provide additional details about the errors and how to fix them.\n`;
            prompt += `Errors:\n`;
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
          const tableRefs = await this.findPossibleTables(
            schema,
            fullInput.split(` `)
          );
          for (const table of Object.keys(tableRefs)) {
            const columnData: TableColumn[] = tableRefs[table];

            // create context item
            let prompt = `Db2 for i schema ${schema} table ${table}\n`;
            prompt += `Column Info: ${JSON.stringify(columnData)}\n\n`;

            contextItems.push({
              name: `${job.name}-${schema}-${table}`,
              description: `Schema and table information or ${table}`,
              content: prompt,
            });
          }

          return contextItems;
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to query Db2i database: ${error}`);
      throw new Error(`Failed to query Db2i database: ${error}`);
    } finally {
    }
  }
  async loadSubmenuItems(
    args: LoadSubmenuItemsArgs
  ): Promise<ContextSubmenuItem[]> {
    return [];
    // const job = this.getCurrentJob();
    // const schema = this.getDefaultSchema();
    // try {
    //   const tableRefs = await this.findAllTables(schema);
    //   const contextItems: ContextSubmenuItem[] = [];
    //   for (const table of Object.keys(tableRefs)) {
    //     const columnData = tableRefs[table];

    //     contextItems.push({
    //       id: table,
    //       title: table,
    //       description: `Schema from ${schema}`
    //     })

    //   }
    //   return contextItems;
    // } catch (error) {
    //   vscode.window.showErrorMessage(`Failed to query Db2i database: ${error}`);
    //   throw new Error(`Failed to query Db2i database: ${error}`);
    // }
  }
}

class MyCustomProvider implements IContextProvider {

  get description(): ContextProviderDescription {
    return {
      title: "custom",
      displayTitle: "Custom",
      description: "Custom description",
      type: "normal",
    };
  }

  async getContextItems(
    query: string,
    extras: ContextProviderExtras
  ): Promise<ContextItem[]> {
    return [
      {
        name: "Custom",
        description: "Custom description",
        content: "Custom content",
      },
    ];
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
  const continueAPI = continueEx?.exports;
  continueAPI?.registerCustomContextProvider(provider);
}