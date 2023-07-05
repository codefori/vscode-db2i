
import vscode from "vscode";

import Statement from "../database/statement";

export async function initialise(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(`vscode-db2i.pasteGenerator`, async () => {
      try {
        const clipboard_content = await vscode.env.clipboard.readText(); 
        const parsedData = JSON.parse(clipboard_content);

        const sql = generateSQL(parsedData);
        const formatted = Statement.format(sql);

        if (vscode.window.activeTextEditor) {
          vscode.window.activeTextEditor.edit((edit) => {
            edit.insert(vscode.window.activeTextEditor.selection.active, formatted);
          });
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
