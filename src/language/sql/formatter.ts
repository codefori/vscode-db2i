import Document from "./document";
import { Token } from "./types";

export interface FormatOptions {
  indent?: number;
}

export function formatSql(document: Document, options?: FormatOptions): string {
  let result: string = ``;

  const statementGroups = document.getStatementGroups();
  for (const statementGroup of statementGroups) {
    for (const statement of statementGroup.statements) {
      for (const token of statement.tokens) {
        if (tokenIs(token, `clause`)) {
          result += `\n`;
        }

        result += token.value + ` `;
      }
    }
  }

  return result.trimEnd();
}

const tokenIs = (token: Token|undefined, type: string, value?: string) => {
	return (token && token.type === type && (value ? token.value?.toUpperCase() === value : true));
}