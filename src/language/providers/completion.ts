import { CompletionItemKind, CompletionItem } from "vscode";
import CompletionItemCache from "./completionItemCache";

export const completionItemCache = new CompletionItemCache();

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
  if (param.CHARACTER_MAXIMUM_LENGTH) {
    return `${param.DATA_TYPE}(${param.CHARACTER_MAXIMUM_LENGTH})`;
  }

  if (param.NUMERIC_PRECISION !== null && param.NUMERIC_SCALE !== null) {
    return `${param.DATA_TYPE}(${param.NUMERIC_PRECISION}, ${param.NUMERIC_SCALE})`;
  }

  return `${param.DATA_TYPE}`;
}
