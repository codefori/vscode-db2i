import { TextEditor } from "vscode";
import { getSqlDocument } from "../../language/providers/logic/parse";
import { StatementGroup } from "../../language/sql/types";
import { SqlParameter } from "./resultSetPanelProvider";
import { tokenIs } from "../../language/sql/statement";

export function getPriorBindableStatement(editor: TextEditor, offset: number): {statement: string, parameters: number}|undefined {
  const sqlDocument = getSqlDocument(editor.document);

  const groups = sqlDocument.getStatementGroups();
  if (groups.length === 0) {
    return undefined;
  }

  const currentGroupI = groups.findIndex(g => g.range.start <= offset && g.range.end >= offset);
  for (let i = currentGroupI - 1; i >= 0; i--) {
    const group = groups[i];
    if (group.statements.length === 1) {
      const statement = group.statements[0];
      if (!statement.getLabel()) {
        const newStatement = sqlDocument.removeEmbeddedAreas(statement, `?`);
        return {
          statement: newStatement.content,
          parameters: newStatement.parameterCount
        };
      }
    }
  }

  return undefined;
}

export function getLiteralsFromStatement(group: StatementGroup): SqlParameter[] {
  const literals: SqlParameter[] = [];
  for (const statement of group.statements) {
    let tokens = statement.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === `string`) {
        literals.push(token.value.substring(1, token.value.length - 1)); // Remove quotes
      } else if (token.type === `number`) {
        // Handle decimal numbers
        if (tokenIs(tokens[i+1], `dot`) && tokenIs(tokens[i+2], `number`)) {
          literals.push(Number(`${token.value}.${tokens[i+2].value}`));
          i += 2; // Skip the next two tokens as they are part of the decimal number
        } else {
          literals.push(Number(token.value));
        }
      }
    }
  }
  
  return literals;
}