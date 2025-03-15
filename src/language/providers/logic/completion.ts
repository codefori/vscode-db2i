import { CompletionItemKind, CompletionItem } from "vscode";
import { SQLParm, TableColumn } from "../../../types";

export function createCompletionItem(
  name: string,
  kind: CompletionItemKind,
  detail?: string,
  documentation?: string,
  sortText?: string
): CompletionItem {
  const item = new CompletionItem(name, kind);
  item.detail = detail;
  item.documentation = documentation;
  item.sortText = sortText;
  return item;
}

export function getParmAttributes(parm: SQLParm): string {
  const lines: string[] = [
    `Type: ${prepareParamType(parm)}`,
    `Default: ${parm.DEFAULT || `-`}`,
    `Pass: ${parm.PARAMETER_MODE}`,
  ];
  return lines.join(`\n `);
}

export function prepareParamType(param: TableColumn | SQLParm): string {
  let baseType = param.DATA_TYPE.toLowerCase();

  if (param.CHARACTER_MAXIMUM_LENGTH) {
    baseType += `(${param.CHARACTER_MAXIMUM_LENGTH})`;
  }

  if (param.NUMERIC_PRECISION !== null && param.NUMERIC_SCALE !== null) {
    baseType += `(${param.NUMERIC_PRECISION}, ${param.NUMERIC_SCALE})`;
  }

  const usefulNull = 'COLUMN_NAME' in param || ('ROW_TYPE' in param && param.ROW_TYPE === 'R');

  if (usefulNull && [`Y`, `YES`].includes(param.IS_NULLABLE)) {
    baseType += ` nullable`;
  };

  return baseType;
}
