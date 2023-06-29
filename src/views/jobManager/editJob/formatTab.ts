import { JDBCOptions } from "../../../connection/types";
import { loadBase } from "../../../base";

export default function getFormatTab(options: JDBCOptions) {
  const base = loadBase();
  const tab = base.customUI();

  tab
    // Format Properties -------------------------------------------------------------------------------------------------
    .addParagraph(
      `Format properties specify date and time formats, date and decimal separators, and table naming conventions used within SQL statements.`
    )
    .addSelect(
      `naming`,
      `Naming`,
      [
        {
          value: `system`,
          text: `as in schema/table`,
          description: `System naming`,
          selected: options.naming === `system`,
        },
        {
          value: `sql`,
          text: `as in schema.table`,
          description: `SQL naming`,
          selected: options.naming === `sql`,
        },
      ],
      `Specifies the naming convention used when referring to tables.`
    )
    .addSelect(
      `date format`,
      `Date format`,
      [
        {
          value: `mdy`,
          text: `mm/dd/yy`,
          description: `MDY`,
          selected: options["date format"] === `mdy`,
        },
        {
          value: `dmy`,
          text: `dd/mm/yy`,
          description: `DMY`,
          selected: options["date format"] === `dmy`,
        },
        {
          value: `ymd`,
          text: `yy/mm/dd`,
          description: `YMD`,
          selected: options["date format"] === `ymd`,
        },
        {
          value: `usa`,
          text: `mm-dd-yy`,
          description: `USA`,
          selected: options["date format"] === `usa`,
        },
        {
          value: `iso`,
          text: `yy-mm-dd`,
          description: `ISO`,
          selected: options["date format"] === `iso`,
        },
        {
          value: `eur`,
          text: `dd.mm.yy`,
          description: `EUR`,
          selected: options["date format"] === `eur`,
        },
        {
          value: `jis`,
          text: `yy/mm/dd`,
          description: `JIS`,
          selected: options["date format"] === `jis`,
        },
        {
          value: `julian`,
          text: `yy/ddd`,
          description: `julian`,
          selected: options["date format"] === `julian`,
        },
      ],
      `Specifies the date format used in date literals within SQL statements.`
    )
    .addSelect(
      `date separator`,
      `Date separator`,
      [
        {
          value: `/`,
          text: `slash`,
          description: `/`,
          selected: options["date separator"] === `/`,
        },
        {
          value: `-`,
          text: `dash`,
          description: `-`,
          selected: options["date separator"] === `-`,
        },
        {
          value: `.`,
          text: `period`,
          description: `.`,
          selected: options["date separator"] === `.`,
        },
        {
          value: `,`,
          text: `comma`,
          description: `,`,
          selected: options["date separator"] === `,`,
        },
        {
          value: `b`,
          text: `space`,
          description: `b`,
          selected: options["date separator"] === `b`,
        },
      ],
      `	Specifies the date separator used in date literals within SQL statements. This property has no effect unless the "date format" property is set to "julian", "mdy", "dmy" or "ymd".`
    )
    .addSelect(
      `decimal separator`,
      `Decimal separator`,
      [
        {
          value: `.`,
          text: `period`,
          description: `.`,
          selected: options["decimal separator"] === `.`,
        },
        {
          value: `,`,
          text: `comma`,
          description: `,`,
          selected: options["decimal separator"] === `,`,
        },
      ],
      `Specifies the decimal separator used in numeric literals within SQL statements.`
    )
    .addSelect(
      `time format`,
      `Time format`,
      [
        {
          value: `hms`,
          text: `hh:mm:ss`,
          description: `HMS`,
          selected: options["time format"] === `hms`,
        },
        {
          value: `usa`,
          text: `hh:mm:ss AM/PM`,
          description: `USA`,
          selected: options["time format"] === `usa`,
        },
        {
          value: `iso`,
          text: `hh:mm:ss`,
          description: `ISO`,
          selected: options["time format"] === `iso`,
        },
        {
          value: `eur`,
          text: `hh:mm:ss`,
          description: `EUR`,
          selected: options["time format"] === `eur`,
        },
        {
          value: `jis`,
          text: `hh.mm.ss`,
          description: `JIS`,
          selected: options["time format"] === `jis`,
        },
      ],
      `Specifies the time format used in time literals within SQL statements.`
    )
    .addSelect(
      `time separator`,
      `Time separator`,
      [
        {
          value: `:`,
          text: `colon`,
          description: `:`,
          selected: options["time separator"] === `:`,
        },
        {
          value: `.`,
          text: `period`,
          description: `.`,
          selected: options["time separator"] === `.`,
        },
        {
          value: `,`,
          text: `comma`,
          description: `,`,
          selected: options["time separator"] === `,`,
        },
        {
          value: `b`,
          text: `space`,
          description: `b`,
          selected: options["time separator"] === `b`,
        },
      ],
      `Specifies the time separator used in time literals within SQL statements. This property has no effect unless the "time format" property is set to "hms".`
    )
    .addParagraph("")
    .addParagraph("")
    .addParagraph("");

  return tab;
}