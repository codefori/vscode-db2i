import { ComplexTab } from "@halcyontech/vscode-ibmi-types/webviews/CustomUI";
import { JDBCOptions } from "@ibm/mapepire-js/dist/src/types";
import { getBase } from "../../../base";

import getFormatTab from "./formatTab";
import getOtherTab from "./otherTab";
import getPerfTab from "./perfTab";
import getSortTab from "./sortTab";
import getSystemTab from "./systemTab";

export function formatDescription(text: string): string {
  return text
    .trim() // Remove leading and trailing whitespace
    .replace(/\n/g, "<br>") // Replace line breaks with <br> tags
    .replace(/\s/g, "&nbsp;"); // Replace spaces with non-breaking spaces
}

export async function editJobUi(
  options: JDBCOptions,
  jobName?: string,
  excludeOptions?: (keyof JDBCOptions)[]
): Promise<JDBCOptions | undefined> {
  const base = getBase();
  const ui = base.customUI();

  const syspropsTab = getSystemTab(options);
  const otherpropsTab = getOtherTab(options);
  const formatpropsTab = getFormatTab(options);
  const performancepropsTab = getPerfTab(options);
  const sortPropsTab = getSortTab(options);

  let tabs: ComplexTab[] = [
    { label: `System`, fields: syspropsTab.fields },
    { label: `Format`, fields: formatpropsTab.fields },
    { label: `Performance`, fields: performancepropsTab.fields },
    { label: `Sort`, fields: sortPropsTab.fields },
    { label: `Other`, fields: otherpropsTab.fields },
  ];

  if (excludeOptions) {
    tabs = tabs.map(tab => ({
      ...tab,
      fields: tab.fields.filter(field => !excludeOptions.includes(field.id as keyof JDBCOptions)),
    }));
  }

  ui.addComplexTabs(tabs).addButtons(
    { id: `apply`, label: `Apply changes` },
    { id: `cancel`, label: `Cancel` }
  );

  const page = await ui.loadPage<{ [key: string]: string }>(
    `Edit ${jobName} options`
  );

  if (page && page.data) {
    page.panel.dispose();

    if (page.data.buttons === `apply`) {
      const keys = Object.keys(page.data);

      // We need to play with some of the form data to put it back into JDBCOptions
      for (const key of keys) {
        switch (key) {
          case `libraries`:
            options.libraries = page.data[key].split(`,`).map((v) => v.trim());
            break;
          case `buttons`:
            // Do nothing with buttons
            break;

          default:
            // Handle of true/false values back into boolean types            
            switch (page.data[key]) {
              //@ts-ignore
              case `true`: options[key] = true; break;
              //@ts-ignore
              case `false`: options[key] = false; break;
              //@ts-ignore
              default: options[key] = page.data[key]; break;
            }
        }
      }

      return options;
    }
  }

  return;
}
