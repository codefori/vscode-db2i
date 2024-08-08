
import * as vscode from "vscode";

export async function initialise(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(`vscode-db2i.json.pasteGenerator`, async () => {
      try {
        const clipboard_content = await vscode.env.clipboard.readText(); 
        const parsedData = JSON.parse(clipboard_content);

        const sql = generateSQL(parsedData);
        // const formatted = Statement.format(sql);

        if (vscode.window.activeTextEditor) {
          vscode.window.activeTextEditor.edit((edit) => {
            edit.insert(vscode.window.activeTextEditor.selection.active, sql);
          });
        }
      } catch (e) {
        vscode.window.showErrorMessage(`Error: ${e.message}`);
      }
    }),
    vscode.commands.registerCommand(`vscode-db2i.json.pasteParser`, async () => {
      try {
        const clipboard_content = await vscode.env.clipboard.readText(); 
        const parsedData = JSON.parse(clipboard_content);

        if (vscode.window.activeTextEditor) {
          const opts = getParsingOptions(parsedData);

          if (opts.length === 0) {
            vscode.window.showErrorMessage(`No valid JSON data found in clipboard.`);
            return;
          }

          const selected = await vscode.window.showQuickPick(
            opts.map((opt) => ({label: opt.isArray ? `'${opt.arrayPropertyName}' array` : `Top Level`, description: opt.fields.map(f => f.name).join(`, `), opt})), 
            {title: `Select parsing option`}
          );

          if (selected) {
            vscode.window.activeTextEditor.edit((edit) => {
              const sql = generateParsingOption(selected.opt);
              edit.insert(vscode.window.activeTextEditor.selection.active, sql);
            });
          }
        }
      } catch (e) {
        vscode.window.showErrorMessage(`Error: ${e.message}`);
      }
    }),
  )
}

const generateArray = (elementIn: any) => {
  const firstValue = (Array.isArray(elementIn) ? elementIn[0] : elementIn) || ``;
  if (typeof firstValue === `object`) {
    return `(SELECT json_arrayagg(${generateObject(firstValue)}) from SYSIBM.SYSDUMMY1)`
  } else {
    return `(SELECT json_arrayagg(${typeof firstValue === `string` ? `'${firstValue}'` : firstValue}) from SYSIBM.SYSDUMMY1)`
  }
}

const generateObject = (objIn: any) => {
  const items = [];

  Object.keys(objIn).forEach((key) => {
    const value = objIn[key];
    if (value) {
      if (typeof value === `object`) {
        if (Array.isArray(value)) {
          items.push(`'${key}': ${generateArray(value[0])} format json`);
        } else {
          items.push(`'${key}': ${generateObject(value)}`);
        }
      } else {
        switch (typeof value) {
        case `string`:
          items.push(`'${key}': '${value}'`);
          break;
        case `boolean`:
          items.push(`'${key}': '${value}' format json`);
          break;
        default:
          items.push(`'${key}': ${value}`);
          break;
        }
      }
    }
  });

  return `json_object(${items.join(`, `)})`;
}

export function generateSQL(jsonIn: any) {
  if (Array.isArray(jsonIn)) {
    return generateArray(jsonIn);
  } else {
    return generateObject(jsonIn);
  }
}

const VALID_TYPES = [`string`, `number`, `boolean`];

interface JsonPropDetail {
  name: string;
  type: string;
}

interface SqlJsonParsingOptions {
  isArray: boolean;
  arrayPropertyName?: string;
  fields: JsonPropDetail[];
}

export function getParsingOptions(objIn: any): SqlJsonParsingOptions[] {
  let topLevel: SqlJsonParsingOptions = {isArray: false, fields: []};
  let topLevelArrays: SqlJsonParsingOptions[] = [];

  const keys = Object.keys(objIn);

  if (!Array.isArray(objIn)) {
    for (const field of keys) {
      if (VALID_TYPES.includes(typeof objIn[field])) {
        topLevel.fields.push({name: field, type: typeof objIn[field]});
      } else if (Array.isArray(objIn[field])) {
        const firstEntry = objIn[field][0];
        if (firstEntry) {
          topLevelArrays.push({
            isArray: true,
            arrayPropertyName: field,
            fields: Object
              .keys(firstEntry)
              .filter((key) => VALID_TYPES.includes(typeof firstEntry[key]))
              .map((key) => ({name: key, type: typeof firstEntry[key]})),
          });
        }
      }
    }
  }

  let result: SqlJsonParsingOptions[] = [];

  if (topLevel.fields.length > 0) {
    result.push(topLevel);
  }

  result.push(...topLevelArrays);

  return result;
}

export function generateParsingOption(opt: SqlJsonParsingOptions): string {
  if (opt.isArray && opt.arrayPropertyName) {
    return [
      `select * from JSON_TABLE(`,
      `  JSONIN, `, 
      `  '$.${opt.arrayPropertyName}[*]' COLUMNS(`,
      ...opt.fields.map((field, i) => `    ${field.name} ${getSqlColumn(field)} path '$.${field.name}'${i < opt.fields.length - 1 ? `,` : ``}`),
      `  )`,
      `) x`,
    ].join(`\n`);
  } else {
    return [
      `select ${opt.fields.map((field) => jsonToSqlName(field.name)).join(`, `)}`,
      `--into ${opt.fields.map((field) => jsonToSqlName(field.name)).join(`, `)}`,
      `from json_table(`,
      `  JSONIN,`,
      `  'lax $' columns (`,
      ...opt.fields.map((field, i) => `    ${jsonToSqlName(field.name)} ${getSqlColumn(field)} path '$.${field.name}'${i < opt.fields.length - 1 ? `,` : ``}`),
      `  )`,
      `)`,
    ].join(`\n`);
  }
}

function jsonToSqlName(propName: string) {
  return propName.replace(/[^a-zA-Z0-9]/g, `_`);
}

function getSqlColumn(type: JsonPropDetail): string {
  switch (type.type) {
  case `string`:
    return `varchar(1000) ccsid 1208`;
  case `number`:
    return `float(8)`;
  case `boolean`:
    return `char(5)`;
  }
}