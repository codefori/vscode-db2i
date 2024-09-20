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

  const eol = textDocument.includes(`\r\n`) ? `\r\n` : `\n`;

  for (const statementGroup of statementGroups) {
    let currentIndent = 0;
    for (let i = 0; i < statementGroup.statements.length; i++) {
      const statement = statementGroup.statements[i];
      const withBlocks = SQLTokeniser.createBlocks(statement.tokens);

      if (statement.isCompoundEnd()) {
        currentIndent -= 4;
      }

      result.push(...formatTokens(withBlocks, options).map(l => ``.padEnd(currentIndent) + l));
      if (!statement.isCompoundStart()) {
        result[result.length-1] += `;`
      }

      if (statement.isCompoundStart()) {
        currentIndent += 4;
      }
    }
  }

  return result
    .map((line) => (line[0] === eol ? line.substring(1) : line))
    .join(eol)
}

function formatTokens(tokensWithBlocks: Token[], options: FormatOptions): string[] {
  const indent = options.tabWidth || 4;
  let currentIndent = 0;
  let newLines: string[] = [``];

  const getSpacing = () => {
    return ``.padEnd(currentIndent);
  }

  const lastLine = () => {
    return newLines[newLines.length-1];
  }

  const append = (newContent: string) => {
    newLines[newLines.length-1] = newLines[newLines.length-1] + newContent;
  }

  const newLine = (indentLevelChange = 0) => {
    currentIndent += (indentLevelChange * indent);
    newLines.push(getSpacing());
  }

  const addSublines = (lines: string[]) => {
    newLines.push(...lines.map(l => ``.padEnd(currentIndent + indent) + l));
    newLine();
  }

  for (let i = 0; i < tokensWithBlocks.length; i++) {
    const cT = tokensWithBlocks[i];
    const nT = tokensWithBlocks[i + 1];
    const pT = tokensWithBlocks[i - 1];

    const currentLine = lastLine();
    const needsSpace = (currentLine.trim().length !== 0 && !currentLine.endsWith(` `)) && pT?.type !== `dot` && i > 0;

    switch (cT.type) {
      case `block`:
        if (cT.block) {
          const hasClauseOrStatement = tokenIs(cT.block[0], `statementType`);
          const commaCount = cT.block.filter(t => tokenIs(t, `comma`)).length;
          const containsSubBlock = cT.block.some(t => t.type === `block`);

          if (cT.block.length === 1) {
            append(`(${cT.block![0].value})`);

          } else if (hasClauseOrStatement || containsSubBlock) {
            append(` (`);
            addSublines(formatTokens(cT.block!, options));
            append(`)`);
          } else if (commaCount >= 2) {
            append(`(`)
            addSublines(formatTokens(cT.block!, {...options, newLineLists: true}));
            append(`)`);
          } else {
            const formattedSublines = formatTokens(cT.block!, options);
            if (formattedSublines.length === 1) {
              append(`(${formattedSublines[0]})`);
            } else {
              append(`(`)
              addSublines(formattedSublines);
              append(`)`);
            }
          }
        } else {
          throw new Error(`Block token without block`);
        }
        break;
      case `dot`:
        append(cT.value);
        break;
      case `comma`:
        append(cT.value);

        if (options.newLineLists) {
          newLine();
        }
        break;

      case `sqlName`:
        if (needsSpace) {
          append(` `);
        }

        append(cT.value);
        break;

      default:
        const isKeyword = (tokenIs(cT, `statementType`) || tokenIs(cT, `clause`));
        if (isKeyword && i > 0) {
          newLine(options.newLineLists ? -1 : 0);
        }
        
        else if (needsSpace) {
          append(` `);
        }
        append(transformCase(cT, cT.type === `word` ? options.identifierCase : options.keywordCase));

        const isSingleLineOnly = SINGLE_LINE_STATEMENT_TYPES.some((type) => tokenIs(cT, `statementType`, type));

        if (options.newLineLists && isKeyword && !isSingleLineOnly) {
          newLine(1);
        }
        break;
    }
  }

  return newLines;
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
