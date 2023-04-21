import { loadBase } from "../../base";
import { JDBCOptions } from "../../connection/types";

export async function editJobUi(options: JDBCOptions, jobName?: string): Promise<JDBCOptions|undefined> {
  const base = loadBase();

  const ui = base.customUI();

  ui
    .addSelect(`naming`, `Naming`, [
      {value: `system`, text: `as in schema/table`, description: `System naming`, selected: options.naming === `system`},
      {value: `sql`, text: `as in schema.table`, description: `SQL naming`, selected: options.naming === `sql`},
    ], `Specifies the naming convention used when referring to tables.`)
    .addInput(`libraries`, `Library list`, undefined, {rows: 2, default: options.libraries.join(`, `)})
    .addSelect(`full open`, `Full open`, [
      {value: `false`, text: `Perform pseudo-open for better performance`, description: `Pseudo-open`, selected: options["full open"] !== true},
      {value: `true`, text: `Perform full-open to analyse performance`, description: `Full-open`, selected: options["full open"] === true},
    ])
    .addSelect(`transaction isolation`, `Transaction isolation`, [
      {value: `none`, description: `None`, text: `No commit (none)`, selected: options["transaction isolation"] === `none`},
      {value: `read committed`, description: `Read committed`, text: `read committed`, selected: options["transaction isolation"] === `read committed`},
      {value: `read uncommitted`, description: `Read uncommitted`, text: `read uncommitted`, selected: options["transaction isolation"] === `read uncommitted`},
      {value: `repeatable read`, description: `Repeatable read`, text: `repeatable read`, selected: options["transaction isolation"] === `repeatable read`},
      {value: `serializable`, description: `Serializable`, text: `serializable`, selected: options["transaction isolation"] === `serializable`},
    ])
    .addButtons(
      {id: `apply`, label: `Apply changes`},
      {id: `cancel`, label: `Cancel`},
    )

  const page = await ui.loadPage<{[key: string]: string}>(jobName || `Edit job options`);

  if (page && page.data) {

    page.panel.dispose();
    
    if (page.data.buttons === `apply`) {
      const keys = Object.keys(page.data);

      // We need to play with some of the form data to put it back into JDBCOptions
      for (const key of keys) {
        switch (key) {
          case `libraries`:
            options.libraries = page.data[key].split(`,`).map(v => v.trim());
            break;
          case `full open`:
            options["full open"] = page.data[key] === `true`;
            break;
          case `buttons`:
            // Do nothing with buttons
            break;
          default:
            options[key] = page.data[key];
        }
      }
  
      return options;
    }

  }

  return;
}