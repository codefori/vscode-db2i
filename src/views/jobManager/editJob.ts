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
    .addButtons(
      {id: `apply`, label: `Apply changes`},
      {id: `cancel`, label: `Cancel`},
    )

  const page = await ui.loadPage<{[key: string]: string}>(jobName || `Edit job options`);

  if (page && page.data) {
    if (page.data.buttons === `apply`) {
      const keys = Object.keys(page.data);

      // We need to play with some of the form data to put it back into JDBCOptions
      for (const key of keys) {
        switch (key) {
          case `libraries`:
            options.libraries = page.data[key].split(`,`).map(v => v.trim());
            break;
          case `buttons`:
            // Do nothing with buttons
            break;
          default:
            options[key] = page.data[key];
        }
      }

      page.panel.dispose();
  
      return options;
    }

  }

  return;
}