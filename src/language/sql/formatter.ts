import { TextDocument } from "vscode";
import Document from "./document";
import { StatementGroup, Token } from "./types";
import { stat } from "fs";
import { IndexKind, isToken } from "typescript";
import Statement from "./statement";
import SQLTokeniser from "./tokens";


export declare type CaseOptions = `preserve` | `upper` | `lower`;

const SINGLE_LINE_STATEMENT_TYPES = [`CREATE`, `DECLARE`, `SET`, `DELETE`];

export interface FormatOptions {
  useTabs?: boolean;
  tabWidth?: number; // Defaults to 4
  keywordCase?: CaseOptions;
  identifierCase?: CaseOptions;
  newLineLists?: boolean;
}

export function formatSql(textDocument: string, options: FormatOptions = {}): string {
  let result: string[] = [];
  let document = new Document(textDocument);
  const statementGroups: StatementGroup[] = document.getStatementGroups();

  for (const statementGroup of statementGroups) {
    let currentIndent = 0;
    const hasBody = statementGroup.statements.length > 1;
    for (let i = 0; i < statementGroup.statements.length; i++) {
      const statement = statementGroup.statements[i];
      const withBlocks = SQLTokeniser.createBlocks(statement.tokens);

      if (statement.isBlockEnder()) {
        currentIndent -= 4;
      }

      result.push(formatTokens(withBlocks, options, currentIndent) + (statement.isBlockOpener() ? `` : `;`));

      if (statement.isBlockOpener()) {
        currentIndent += 4;
      }
    }
  }

  return result
    .map((line) => (line[0] === `\n` ? line.substring(1) : line))
    .join(`\n`)
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
          const containsSubBlock = cT.block.some(t => t.type === `block`);
          if (cT.block.length === 1) {
            res += `(${cT.block![0].value})`;

          } else if (hasClauseOrStatement || containsSubBlock) {
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
        
        else if (!res.endsWith(` `) && pT?.type !== `dot` && i > 0) {
          res += ` `;
        }

        res += transformCase(cT, cT.type === `word` ? options.identifierCase : options.keywordCase);

        const isSingleLineOnly = SINGLE_LINE_STATEMENT_TYPES.some((type) => tokenIs(cT, `statementType`, type));

        if (options.newLineLists && isKeyword && !isSingleLineOnly) {
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

const transformCase = (token: Token|undefined, stringCase: CaseOptions|undefined) => {
  if (stringCase == `upper`) {
    return token.value.toUpperCase();
  } else if (stringCase == `lower`) {
    return token.value.toLowerCase();
  } else {
    return token.value;
  }
}
