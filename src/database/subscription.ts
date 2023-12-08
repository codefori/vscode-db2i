
import vscode from "vscode"
import { JobManager } from "../config";
import { getInstance } from "../base";
import Statement from "./statement";
import Table from "./table";
import { table } from "console";

export default class Subscription {
  /**
   * @param {string} schema Not user input
   * @param {string} name Not user input
   * @returns {Promise<TableColumn[]>}
   */
  static async create(schema: string, name: string, dtaQLibrary: string, dtaQName) {
    const triggerName = `subscription_${name}`;
    const columns = await Table.getItems(schema, name);

    const asJsonObject = (type: "o"|"n") => {
      return `JSON_OBJECT(${columns.map(column => `KEY '${column.COLUMN_NAME}' VALUE ${type}.${column.COLUMN_NAME}`).join(`, `)})`;
    };

    const sql = [
      `CREATE OR REPLACE TRIGGER ${schema}.${triggerName}`,
      `after update or insert or delete on ${schema}.${name}`,
      `referencing new as n old as o for each row`,
      `when (inserting or updating or deleting)`,

      `begin atomic`,
      `  declare jsonData clob(64000) ccsid 1208;`,
        `declare operation varchar(10) for sbcs data;`,
        `if inserting then`,
        `  set operation = 'INSERT';`,
        `end if;`,
        `if deleting then`,
        `  set operation = 'DELETE';`,
        `end if;`,
        `if updating then`,
        `  set operation = 'UPDATE';`,
        `end if;`,
        `if (inserting or updating) then`,
          `set jsonData = JSON_OBJECT(KEY 'table' VALUE '${schema}.${name}', KEY 'operation' VALUE operation, KEY 'row' VALUE ${asJsonObject(`n`)});`,
        `else`,
          `set jsonData = JSON_OBJECT(KEY 'table' VALUE '${schema}.${name}', KEY 'operation' VALUE operation, KEY 'row' VALUE ${asJsonObject(`o`)});`,
        `end if;`,
        ``,
        `call qsys2.send_data_queue_utf8(`,
        `  message_data       => jsonData, `,
        `  data_queue         => '${dtaQName}',`,
        `  data_queue_library => '${dtaQLibrary}');`,
      `end;`
    ];

    const result = await JobManager.runSQL(sql.join(`\n`));

    return;
  }
}