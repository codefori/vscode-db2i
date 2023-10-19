import { loadBase } from "../../../base";
import { JDBCOptions } from "../../../connection/types";
import { ComplexTab } from "@halcyontech/vscode-ibmi-types/api/CustomUI";

import getSimpleView from "./simpleView";
import getPerfTab from "./perfTab";
import getFormatTab from "./formatTab";
import getSystemTab from "./systemTab";
import getSortTab from "./sortTab";
import getOtherTab from "./otherTab";

export function formatDescription(text: string): string {
  return text
    .trim() // Remove leading and trailing whitespace
    .replace(/\n/g, "<br>") // Replace line breaks with <br> tags
    .replace(/\s/g, "&nbsp;"); // Replace spaces with non-breaking spaces
}

let useSimpleView = true;

export async function editJobUi(
  options: JDBCOptions,
  jobName?: string
): Promise<JDBCOptions | undefined> {
  
  while (true) {
    const base = loadBase();
    const ui = base.customUI();

    if (useSimpleView) {
      getSimpleView(ui, options);

    } else {
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

      ui.addComplexTabs(tabs);
    }

    ui.addButtons(
      { id: `apply`, label: `Apply changes` },
      { id: `cancel`, label: `Cancel` },
      { id: `swap`, label: `Use ${useSimpleView ? `Detailed` : `Simple`} view` },
    );

    const page = await ui.loadPage<{ [key: string]: string }>(
      `Edit ${jobName} options`
    );

    if (page && page.data) {
      page.panel.dispose();

      switch (page.data.buttons) {
        case `apply`:
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
                  case `true`: options[key] = true; break;
                  case `false`: options[key] = false; break;
                  default: options[key] = page.data[key]; break;
                }
            }
          }

          return options;

        case `swap`:
          useSimpleView = !useSimpleView;
          break;

        default:
          return;
      }
    }
  }

  return;
}
