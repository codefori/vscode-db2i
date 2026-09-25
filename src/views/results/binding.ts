import { TextEditor } from "vscode";
import { getBase } from "../../base";
import { Config } from "../../config";
import { getSqlDocument } from "../../language/providers/logic/parse";
import Document from "../../language/sql/document";
import { tokenIs } from "../../language/sql/statement";
import { ParsedEmbeddedStatement, StatementGroup } from "../../language/sql/types";
import { SqlParameter } from "./resultSetPanelProvider";

const MAX_REMEMBERED_BIND_VALUES = 100;

export function getPriorBindableStatement(editor: TextEditor, offset: number): { statement: string, parameters: number } | undefined {
  const sqlDocument = getSqlDocument(editor.document);

  const groups = sqlDocument?.getStatementGroups();
  if (sqlDocument && groups?.length) {
    const currentGroupI = groups.findIndex(g => g.range.start <= offset && g.range.end >= offset);
    for (let i = currentGroupI - 1; i >= 0; i--) {
      const group = groups[i];
      if (group.statements.length === 1) {
        const statement = group.statements[0];
        if (!statement.getLabel()) {
          const newStatement = sqlDocument.removeEmbeddedAreas(statement);
          return {
            statement: newStatement.content,
            parameters: newStatement.parameterCount
          };
        }
      }
    }
  }
}

export function getLiteralsFromStatement(group: StatementGroup): SqlParameter[] {
  const literals: SqlParameter[] = [];
  for (const statement of group.statements) {
    let tokens = statement.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === `string` && token.value) {
        literals.push(token.value.substring(1, token.value.length - 1)); // Remove quotes
      } else if (token.type === `number`) {
        // Handle decimal numbers
        if (tokenIs(tokens[i + 1], `dot`) && tokenIs(tokens[i + 2], `number`)) {
          literals.push(Number(`${token.value}.${tokens[i + 2].value}`));
          i += 2; // Skip the next two tokens as they are part of the decimal number
        } else {
          literals.push(Number(token.value));
        }
      } else if (tokenIs(token, `word`, `NULL`)) {
        //@ts-ignore
        literals.push(null);
      }
    }
  }

  return literals;
}

export function hasParameters(embeddedInfo?: ParsedEmbeddedStatement) {
  return Boolean(embeddedInfo?.parameterCount);
}

export function isFollowedByBind(document: Document, group: StatementGroup) {
  const nextGroup = document.getStatementGroups().find(g => g.range.start >= group.range.end);
  return nextGroup?.statements[0]?.getLabel()?.toLowerCase() === `bind`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, `&amp;`).replace(/"/g, `&quot;`).replace(/</g, `&lt;`).replace(/>/g, `&gt;`);
}

export async function promptForParameterValues(statementMarkers: (string | undefined)[][]): Promise<SqlParameter[][] | undefined> {
  const remembered = Config.ready ? { ...Config.getBindValues() } : {};
  const hasNamedMarkers = statementMarkers.some(markers => markers.some(name => name !== undefined));

  const ui = getBase().customUI()
    .addParagraph(`Enter a value for each parameter, or check NULL to bind a null value.` + (hasNamedMarkers ? ` Host variable values are remembered for the next run.` : ``));

  const namedFields = new Map<string, string>();
  let fieldCount = 0;
  let positionalCount = 0;

  const statementFields = statementMarkers.map(markers => markers.map(name => {
    const key = name?.toUpperCase();
    if (key && namedFields.has(key)) {
      return namedFields.get(key)!;
    }

    const id = `parm${fieldCount++}`;
    if (key) {
      namedFields.set(key, id);
      ui.addInput(id, escapeHtml(`:${name}`), undefined, { default: escapeHtml(remembered[key] || ``) });
    } else {
      ui.addInput(id, `Parameter marker ${++positionalCount}`);
    }
    ui.addCheckbox(`${id}_null`, `NULL`, undefined, key ? remembered[key] === null : false);

    return id;
  }));

  ui.addButtons(
    { id: `run`, label: `Run` },
    { id: `cancel`, label: `Cancel` }
  );

  const page = await ui.loadPage<{ [id: string]: string | boolean }>(`Bind parameters`);
  if (!page || !page.data) {
    return;
  }

  const data = page.data;
  page.panel.dispose();

  // mapepire accepts null
  const getValue = (id: string) => (data[`${id}_null`] === true ? null : String(data[id] || ``)) as SqlParameter;

  if (data.buttons === `cancel`) {
    return;
  }

  if (Config.ready && namedFields.size > 0) {
    for (const [key, id] of namedFields) {
      delete remembered[key];
      remembered[key] = getValue(id) as string | null;
    }

    const keys = Object.keys(remembered);
    keys.slice(0, keys.length - MAX_REMEMBERED_BIND_VALUES).forEach(key => delete remembered[key]);

    await Config.setBindValues(remembered);
  }

  return statementFields.map(ids => ids.map(getValue));
}
