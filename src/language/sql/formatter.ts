import { TextDocument } from "vscode";
import Document from "./document";
import { StatementGroup, Token } from "./types";
import { stat } from "fs";
import { isToken } from "typescript";


export declare type KeywordCase = `preserve` | `upper` | `lower`;
export declare type IdentifierCase = `preserve` | `upper` | `lower`;
export interface FormatOptions {
  useTabs: boolean;
  tabWidth: number; // Defaults to 4 
  identifierCase: IdentifierCase;
  keywordCase: KeywordCase;
  addSemiColon: boolean;
}

export function formatSql(textDocument: string, options?: FormatOptions, indentCounter: number = 1, isSubGroup: boolean = false): string {
  let result: string = ``;
  let document = new Document(textDocument);
  let subGroup: string = ``;
  let inSubGroup: boolean = false;
  let subGroupOptions: FormatOptions = {...options};
  subGroupOptions.addSemiColon = false;
  let isSingleton = false;
  let prevToken: Token|undefined = undefined;
  let prefixSpaceAdded = true;
  let numOpenBrackets = 0;
  const originalIndent = indentCounter;
  const statementGroups: StatementGroup[] = document.getStatementGroups();

  for (const statementGroup of statementGroups) {
    for (const statement of statementGroup.statements) {
      if (statement.tokens.length == 1) {
        result += statement.tokens[0].value;
        isSingleton = true;
        continue;
      } else if (isSubGroup) {
        result +=  `\n` + indent(options, indentCounter);
      }

      for (const token of statement.tokens) {        
        if (tokenIs(token, `closebracket`)) {
          subGroup += `)`;
          if (numOpenBrackets == 1) {
            inSubGroup = false;
            result += formatSql(subGroup, subGroupOptions, indentCounter, true);
            indentCounter--;
            result += `)`;
          } 
          numOpenBrackets--;
          prevToken = token;
          prefixSpaceAdded = true;
          continue;
        }

        if (inSubGroup) {
          subGroup += ` ` + token.value;
          prevToken = token;
          continue;
        }

        if (tokenIs(prevToken, `closebracket`)) {
          result += ` `;
        }

        // If this is an ORDER BY, we need format differently
        if (tokenIs(token, `clause`, `ORDER`)) {
          result += `\n` + transformCase(token, options?.keywordCase) + ` `; 
          prefixSpaceAdded = false;
        } else if (tokenIs(token, `word`, `BY`) && tokenIs(prevToken, `clause`, `ORDER`)) {
          result += transformCase(token, options?.keywordCase) + `\n` + indent(options, indentCounter);
          prefixSpaceAdded = true;
        } else if (tokenIs(token, `clause`)) {
          result += `\n`  + indent(options, indentCounter - 1) + transformCase(token, options?.keywordCase) + `\n` + indent(options, indentCounter);
          prefixSpaceAdded = true;
        } else if (tokenIs(token, `openbracket`)) {
          inSubGroup = true;
          subGroup = ``;
          indentCounter++;
          result += ` (`;
          prefixSpaceAdded = false;
          numOpenBrackets++;
        } else if(tokenIs(token, `comma`)) {
          result += `,\n` + indent(options, indentCounter);
          prefixSpaceAdded = true;
        } else if (tokenIs(token, `statementType`)) {
          if (isSubGroup) {
            indentCounter++;
          }
          result += transformCase(token, options?.keywordCase) + `\n` + indent(options, indentCounter);
          prefixSpaceAdded = true;
        } else if(tokenIs(token, `word`)){
          if (!prefixSpaceAdded) {
            result += ` `;
          }
          result += transformCase(token, options?.identifierCase);
          prefixSpaceAdded = false;
        } else if (tokenIs(token, `dot`)) {
          result += token.value;
          prefixSpaceAdded = true;
        } else if (prefixSpaceAdded) {
          result += token.value;
          prefixSpaceAdded = false;
        } else {
          result += ` ` + token.value;
          prefixSpaceAdded = false;
        }

        // We need to treat ORDER BY as one clause
        prevToken = token;
      }
      if (options.addSemiColon) {
        result += `;`;
      } 
      result += `\n`;
      indentCounter = originalIndent;
    }
  }

  if (isSubGroup && !isSingleton) {
    result += indent(options, indentCounter - 1);
  } else {
    result = result.trimEnd();
  }

  return result;
}

const tokenIs = (token: Token|undefined, type: string, value?: string) => {
	return (token && token.type === type && (value ? token.value?.toUpperCase() === value : true));
}

const transformCase = (token: Token|undefined, stringCase: IdentifierCase|KeywordCase|undefined) => {
  if (stringCase == `upper`) {
    return token.value.toUpperCase();
  } else if (stringCase == `lower`) {
    return token.value.toLowerCase();
  } else {
    return token.value;
  }
}

const indent = (options: FormatOptions, indentCounter: number) => {
  if (indentCounter < 0) {
    return ``;
  } else if (options.useTabs) {
    return `\t`.repeat(indentCounter);
  } else {
    return ` `.repeat(options.tabWidth * indentCounter);
  }
}

