import { TextDocument } from "vscode";
import Document from "./document";
import { StatementGroup, Token } from "./types";
import { stat } from "fs";
import { isToken } from "typescript";
import Statement from "./statement";
import SQLTokeniser from "./tokens";


export declare type KeywordCase = `preserve` | `upper` | `lower`;
export declare type IdentifierCase = `preserve` | `upper` | `lower`;
export interface FormatOptions {
  useTabs?: boolean;
  tabWidth?: number; // Defaults to 4
  keywordCase?: KeywordCase;
  newLineLists?: boolean;
}

export function formatSql(textDocument: string, options: FormatOptions = {}): string {
  let result: string[] = [];
  let document = new Document(textDocument);
  const statementGroups: StatementGroup[] = document.getStatementGroups();

  for (const statementGroup of statementGroups) {
    const hasBody = statementGroup.statements.length > 1;
    for (let i = 0; i < statementGroup.statements.length; i++) {
      const statement = statementGroup.statements[i];
      const blockStartEnd = statement.isBlockOpener() || statement.isBlockEnder();
      const withBlocks = SQLTokeniser.createBlocks(statement.tokens);
      const startingIndent = hasBody ? (blockStartEnd ? 0 : 4) : 0;

      result.push(formatTokens(withBlocks, options, startingIndent) + `;`);
    }
  }

  return result.join(`\n`);
}

function formatTokens(tokensWithBlocks: Token[], options: FormatOptions, baseIndent: number = 0): string {  
  const indent = options.tabWidth || 4;
  let newLine = `\n` + ``.padEnd(baseIndent);
  let res: string = newLine;

  const updateIndent = (newIndent: number) => {
    baseIndent += newIndent;
    newLine = `\n` + ``.padEnd(baseIndent);
  }

  for (let i = 0; i < tokensWithBlocks.length; i++) {
    const cT = tokensWithBlocks[i];
    const nT = tokensWithBlocks[i + 1];
    const pT = tokensWithBlocks[i - 1];

    switch (cT.type) {
      case `block`:
        if (cT.block) {
          const hasClauseOrStatement = tokenIs(cT.block[0], `statementType`);
          const commaCount = cT.block.filter(t => tokenIs(t, `comma`)).length;
          if (cT.block.length === 1) {
            res += `(${cT.block![0].value})`;

          } else if (hasClauseOrStatement) {
            res += ` (`;
            res += formatTokens(cT.block!, {...options, newLineLists: options.newLineLists}, baseIndent + indent);
            res += `${newLine})`;
          } else if (commaCount >= 2) {
            res += `(`;
            res += formatTokens(cT.block!, {...options, newLineLists: true}, baseIndent + indent);
            res += `${newLine})`;
          } else {
            res += `(${formatTokens(cT.block!, options)})`;
          }
        } else {
          throw new Error(`Block token without block`);
        }
        break;
      case `dot`:
        res += cT.value;
        break;
      case `comma`:
        res += cT.value;

        if (options.newLineLists) {
          res += newLine;
        }
        break;

      default:
        const isKeyword = (tokenIs(cT, `statementType`) || tokenIs(cT, `clause`));
        if (isKeyword && i > 0) {
          if (options.newLineLists) {
            updateIndent(-indent);
          }
          res += newLine;
        }
        
        else if (!res.endsWith(` `) && i > 0) {
          res += ` `;
        }

        res += transformCase(cT, cT.type === `word` ? undefined : options.keywordCase);

        if (options.newLineLists && isKeyword) {
          updateIndent(indent);
          res += newLine;
        }
        break;
    }
  }

  return res;
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
