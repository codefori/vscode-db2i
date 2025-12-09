import Statement from "./statement";
import SQLTokeniser from "./tokens";
import { Definition, ParsedEmbeddedStatement, StatementGroup, StatementType, StatementTypeWord, Token } from "./types";

export interface ParsedColumn {
  columnName: string;      
  aliasName?: string;    
  isAlias: boolean;        
  type?: string;           
}

export interface ParsedTableEntry {
  tableName: string;   
  systemTableName?:string;    
  columns: ParsedColumn[];  // array of columns for that table
}
export interface ParsedTable {
  columns: ParsedColumn[];
}

export default class Document {
  content: string;
  statements: Statement[];
  debug: boolean = false;

  constructor(content: string, keepComments = false) {
    this.content = content;
    this.statements = [];

    const tokeniser = new SQLTokeniser();
    tokeniser.storeComments = keepComments;

    this.parseStatements(tokeniser.tokenise(content));
  }

  log(content: string) {
    if (this.debug) {
      console.log(content);
    }
  }

  private addStatement(tokens: Token[]) {
    if (tokens.length > 0) {
      tokens = Statement.trimTokens(tokens);

      if (tokens.length > 0) {
        this.statements.push(new Statement(
          tokens,
          {
            start: tokens[0].range.start,
            end: tokens[tokens.length - 1].range.end
          }
        ));
      }
    }
  }

  private parseStatements(tokens: Token[]) {
    let currentStatementType: StatementType = StatementType.Unknown;
    let statementStart = 0;
    let bracketDepth = 0;

    for (let i = 0; i < tokens.length; i++) {
      const upperValue = tokens[i].value?.toUpperCase();
      switch (tokens[i].type) {
        case `openbracket`:
          bracketDepth++;
          break;
        case `closebracket`:
          bracketDepth--;
          break;
        case `semicolon`:
          const statementTokens = tokens.slice(statementStart, i);

          this.addStatement(statementTokens);

          statementStart = i + 1;
          break;

        case `statementType`:
          currentStatementType = StatementTypeWord[upperValue];
          break;

        case `keyword`:
          if (bracketDepth === 0) {
            switch (upperValue) {
              case `LOOP`:
              case `THEN`:
              case `BEGIN`:
              case `ELSE`:
              case `DO`:
                // This handles the case that 'END LOOP' is supported.
                if (upperValue === `LOOP` && currentStatementType === StatementType.End) {
                  break;
                }

                // Support for THEN in conditionals
                if (upperValue === `THEN` && !Statement.typeIsConditional(currentStatementType)) {
                  break;
                }

                if (upperValue === `ELSE` && !Statement.typeIsConditional(currentStatementType)) {
                  break;
                }

                if (upperValue === `BEGIN` && currentStatementType === StatementType.Alter) {
                  break;
                }

                // We include BEGIN in the current statement
                // then the next statement beings
                const statementTokens = tokens.slice(statementStart, i+1);
                this.addStatement(statementTokens);
                statementStart = i + 1;
                break;
              case `END`:
                // We ignore the END statement keyword when it's solo.
                if (statementStart === i && (tokens[i] === undefined || tokens[i].type === `semicolon`)) {
                  statementStart = i + 1;
                }
                break;
            }
          }
          break;
      }
    }

    const lastStatementTokens = tokens.slice(statementStart, tokens.length);
    this.addStatement(lastStatementTokens);
  }

  getStatementByOffset(offset: number) {
    return this.statements.find((statement, i) => {
      const end = (this.statements[i + 1] ? this.statements[i + 1].range.start : statement.range.end);
      return (offset >= statement.range.start && offset < end) || (i === (this.statements.length - 1) && offset >= end);
    })
  }

  getTokenByOffset(offset: number): Token | undefined {
    const statement = this.getStatementByOffset(offset);

    if (statement) {
      return statement.getTokenByOffset(offset);
    }
  }

  getStatementGroups(): StatementGroup[] {
    let groups: StatementGroup[] = [];
    let currentGroup: Statement[] = [];
    let depth = 0;
    for (const statement of this.statements) {
        if (statement.isCompoundEnd()) {
          if (depth > 0) {
            currentGroup.push(statement);    
            depth--;
            this.log(`<` + ``.padEnd(depth*2) + Statement.formatSimpleTokens(statement.tokens.slice(0, 2)));
          }
          if (depth === 0) {
            if (currentGroup.length > 0) {
              groups.push({
                range: { start: currentGroup[0].range.start, end: currentGroup[currentGroup.length-1].range.end },
                statements: currentGroup
              });
              currentGroup = [];
            }
          }
        } else
        if (statement.isCompoundStart()) {
          this.log(`>` + ``.padEnd(depth*2) + Statement.formatSimpleTokens(statement.tokens.slice(0, 2)));
          if (depth > 0) {
            currentGroup.push(statement);
          } else {
            currentGroup = [statement];
          }
          depth++;
        } else {
          this.log(` ` + ``.padEnd(depth*2) + Statement.formatSimpleTokens(statement.tokens.slice(0, 2)));
          if (depth > 0) {
            currentGroup.push(statement);
          } else {
            groups.push({
              range: statement.range,
              statements: [statement]
            });
          }
        }
    }

    if (currentGroup.length > 0) {
      groups.push({
        range: { start: currentGroup[0].range.start, end: currentGroup[currentGroup.length-1].range.end },
        statements: currentGroup
      });
    }

    return groups;
  }
 getColumnsAndTable():ParsedTableEntry[] {
    const groups = this.getStatementGroups();

    const result:ParsedTableEntry[] = [];

    for (const group of groups) {
      if(group.statements[0].type === StatementType.Create) {
      const info:ParsedTableEntry = getCreateTableInfo(group.statements[0].tokens);
        result.push(info);
      
      }
    }

    return result;
  }

  getDefinitions(): Definition[] {
    const groups = this.getStatementGroups();
    let list: Definition[] = [];

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];

      if (group.statements.length > 0) {
        if (group.statements.length === 1) {
          list.push(...getSymbolsForStatements(group.statements));

        } else {
          const [baseDef] = getSymbolsForStatements([group.statements[0]]);
          
          if (baseDef) {
            baseDef.children = getSymbolsForStatements(group.statements.slice(1))
          }

          list.push(baseDef);
        }
      }
    }

    return list;
  }

  getGroupByOffset(offset: number) {
    const groups = this.getStatementGroups();
    return groups.find((statement, i) => {
      const end = (groups[i + 1] ? groups[i + 1].range.start : statement.range.end);
      return (offset >= statement.range.start && offset < end) || (i === (groups.length - 1) && offset >= end);
    })
  }

  removeEmbeddedAreas(statement: Statement, snippetString?: boolean): ParsedEmbeddedStatement {
    const areas = statement.getEmbeddedStatementAreas();

    const totalParameters = areas.filter(a => a.type === `marker`).length;
    let newContent = this.content.substring(statement.range.start, statement.range.end);
    let parameterCount = 0;

    const startRange = statement.range.start;

    // We do it in reverse so the substring ranges doesn't change
    for (let x = areas.length-1; x >= 0; x--) {
      const area = areas[x];

      let start = area.range.start - startRange, end = area.range.end - startRange;

      switch (area.type) {
        case `marker`:
          const markerContent = newContent.substring(start, end);

          newContent = newContent.substring(0, start) + (snippetString ? `\${${totalParameters-parameterCount}:${markerContent}}` : `?`) + newContent.substring(end) + (snippetString ? `$0` : ``);
      
          parameterCount++;
          break;

        case `remove`:
          newContent = newContent.substring(0, start) + newContent.substring(end+1);
          break;
      }
    }

    return {
      changed: areas.length > 0,
      content: newContent,
      parameterCount
    };
  }
}

function getSymbolsForStatements(statements: Statement[]) {
  let defintions: Definition[] = [];

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const [objectRef] = statement.getObjectReferences();

    switch (statement.type) {
      case StatementType.Declare:
      case StatementType.Create:
        if (objectRef) {
          defintions.push({
            ...objectRef,
            children: [],
            range: statement.range
          });
        }
        break;
    }
  }

  return defintions;
}


//-----------------------------------------------------------
// UNIVERSAL SQL COLUMN PARSER FOR ALL CREATE TABLE STYLES
//-----------------------------------------------------------
//-----------------------------------------------------------
// UNIVERSAL SQL PARSER (TABLE NAME + COLUMNS)
//-----------------------------------------------------------
export function getCreateTableInfo(tokens: any[]):ParsedTableEntry {
  const {tableName,systemName} = extractTableNames(tokens);
  const columnGroups = extractColumnGroups(tokens);
  const columnsValues = extractColumnNames(columnGroups);
  const {columns,ColumnNames}= columnsValues;
  return {
   tableName: tableName,
  systemTableName:systemName ?? tableName,      
  columns: ColumnNames
  };
}

//-----------------------------------------------------------
// 0) Extract TABLE NAME from CREATE TABLE statement
//-----------------------------------------------------------
function extractTableNames(tokens: any[]) {
  let foundTable = false;
  let tableNameParts: string[] = [];
  let systemName: string | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const v = tokens[i].value?.toLowerCase();

    // Detect TABLE keyword
    if (v === "table") {
      foundTable = true;
      continue;
    }

    if (!foundTable) continue;

    // STOP collecting table name if "(" begins
    if (tokens[i].value === "(") break;

    // Detect "FOR SYSTEM NAME <xxx>"
    if (
      v === "for" &&
      tokens[i + 1]?.value?.toLowerCase() === "system" &&
      tokens[i + 2]?.value?.toLowerCase() === "name"
    ) {
      // system name is the next token after NAME
      systemName = tokens[i + 3]?.value ?? null;
      break; // STOP reading table name
    }

    // Skip noise keywords
    const skip = ["if", "not", "exists", "or", "replace"];
    if (skip.includes(v)) continue;

    // Collect table name parts
    if (
      tokens[i].type === "word" ||
      tokens[i].type === "string" ||
      /[\/\.]/.test(tokens[i].value)
    ) {
      tableNameParts.push(tokens[i].value);
    }
  }

  const tableName = tableNameParts.length > 0 ? tableNameParts.join("") : null;

  return { tableName, systemName };
}




//-----------------------------------------------------------
// 1) Extract column groups inside the main ( ... ) block
//-----------------------------------------------------------
function extractColumnGroups(tokens: any[]) {
  let startIndex = -1;
  let depth = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    if (t.value === "(" && startIndex === -1) {
      startIndex = i;
      depth = 1;
      i++;

      // find matching closing )
      while (i < tokens.length && depth > 0) {
        if (tokens[i].value === "(") depth++;
        else if (tokens[i].value === ")") depth--;
        i++;
      }

      const endIndex = i - 1;
      const innerTokens = tokens.slice(startIndex + 1, endIndex);

      // ---------------------------------------------------
      // Split by commas ONLY on depth=0
      // ---------------------------------------------------
      const groups: any[][] = [];
      let current: any[] = [];
      let d = 0;

      for (const token of innerTokens) {
        if (token.value === "," && d === 0) {
          if (current.length > 0) {
            groups.push(current);
            current = [];
          }
          continue;
        }

        current.push(token);

        if (token.value === "(") d++;
        else if (token.value === ")") d--;
      }

      if (current.length > 0) groups.push(current);

      // REMOVE TABLE CONSTRAINT GROUPS
      const unwanted = [
        "constraint",
        "primary",
        "foreign",
        "unique",
        "check",
        "references",
        "key"
      ];

      return groups.filter(group => {
        const text = group.map(t => t.value.toLowerCase()).join(" ");
        return !unwanted.some(word => text.startsWith(word));
      });
    }
  }

  return [];
}

//-----------------------------------------------------------
// 2) Extract column names from each group
//-----------------------------------------------------------



function extractColumnNames(groups: any[][]) {
  const columns: string[] = [];
  const ColumnNames: ParsedColumn[] = [];


  for (const group of groups) {
    const result = parseSingleColumn(group);
    if (!result) continue;

    const { aliasForColumn, normalIdentifiers } = result;
if(aliasForColumn.length===1&& normalIdentifiers.length===1)
{      
      ColumnNames.push({columnName:normalIdentifiers[0], aliasName:aliasForColumn[0], isAlias: true});
      ColumnNames.push({columnName:aliasForColumn[0], isAlias: false});
      ColumnNames.map(col=> columns.push(col.columnName));
        // columns.push(columnNames);
  // 
}
  }

  return {columns,
    ColumnNames
  };
}


//-----------------------------------------------------------
// 3) Parse a single column definition
//-----------------------------------------------------------
function parseSingleColumn(tokens: any[]) {
  if (!tokens.length) return null;

  const aliasForColumn: string[] = [];
  const normalIdentifiers: string[] = [];

  // ----------------------------------------------
  // A) FIRST TOKEN CHECK → Alias name (only once)
  // ----------------------------------------------
  const first = tokens[0];
  if (first && first.type === "word" && !isKeyword(first.value)) {
    aliasForColumn.push(cleanIdentifier(first.value));
  }

  // ----------------------------------------------
  // B) Look for "FOR COLUMN realColumn"
  // ----------------------------------------------
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].value?.toLowerCase();

    if (
      t === "for" &&
      tokens[i + 1]?.value?.toLowerCase() === "column" &&
      tokens[i + 2]
    ) {
      normalIdentifiers.push(cleanIdentifier(tokens[i + 2].value));
    }
  }

  // ----------------------------------------------
  // C) Return final structured result
  // ----------------------------------------------
  return {
    aliasForColumn,
    normalIdentifiers,
  };
}


//-----------------------------------------------------------
// Helpers
//-----------------------------------------------------------


function cleanIdentifier(name: string) {
  return name.replace(/^[`\["']+|[`"\]']+$/g, "");
}

function isKeyword(val: string) {
  const keywords = [
    "char", "varchar", "nvarchar", "text", "int", "integer", "bigint",
    "decimal", "numeric", "float", "real", "double",
    "date", "datetime", "timestamp", "time",
    "ccsid", "default", "constraint", "primary", "foreign",
    "key", "unique", "check", "not", "null", "for", "column",
    "references", "on", "update", "delete", "by"
  ];

  return keywords.includes(val.toLowerCase());
}
