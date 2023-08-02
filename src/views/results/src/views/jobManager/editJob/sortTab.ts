import { loadBase } from "../../../base";
import { JDBCOptions } from "../../../connection/types";

export default function getSortTab(options: JDBCOptions) {
  const base = loadBase();
  const tab = base.customUI();

  tab
    .addParagraph(
      `Sort properties specify how the system performs stores and performs sorts.`
    )
    .addSelect(
      `sort`,
      `Sort`,
      [
        {
          value: `hex`,
          text: `Sort using hex values`,
          description: `Hex`,
          selected: options["sort"] === `hex`,
        },
        {
          value: `language`,
          text: `Sort using language values`,
          description: `Language`,
          selected: options["sort"] === `language`,
        },
        {
          value: `table`,
          text: `base the sort on the sort sequence table set in the [sort table] property`,
          description: `Table`,
          selected: options["sort"] === `table`,
        },
      ],
      `Specifies how the system sorts records before sending them to the client.`
    )
    .addInput(
      `sort language`,
      `Sort language`,
      `Specifies a 3-character language id to use for selection of a sort sequence. This property has no effect unless the "sort" property is set to "language".`,
      { default: options["sort language"] || `ENU` }
    )
    .addSelect(`sort weight`, `Sort weight`, [
      {
        value: `shared`,
        text: `uppercase and lowercase characters sort as the same character`,
        description: `Shared`,
        selected: options["sort weight"] === `shared`,
      },
      {
        value: `unique`,
        text: `uppercase and lowercase characters sort as different characters`,
        description: `Unique`,
        selected: options["sort weight"] === `unique`,
      },
    ])
    .addInput(
      `sort table`,
      `Sort table`,
      `Specifies the library and file name of a sort sequence table stored on the system. This property has no effect unless the "sort" property is set to "table"`,
      { default: options["sort table"] || `` }
    );

  return tab;
}