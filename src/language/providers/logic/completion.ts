import { CompletionItemKind, CompletionItem } from "vscode";

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

  if ([`Y`, `YES`].includes(param.IS_NULLABLE) || ('DEFAULT' in param && param.DEFAULT !== null)) {
    baseType += ` optional`;
  };

  return baseType;
}
