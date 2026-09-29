import { QuickInputButton, QuickInputButtons, QuickPickItem, QuickPickItemKind, TextEditor, ThemeIcon, window } from "vscode";
import { Config } from "../../config";
import { getSqlDocument } from "../../language/providers/logic/parse";
import { tokenIs } from "../../language/sql/statement";
import { ParsedEmbeddedStatement, StatementGroup } from "../../language/sql/types";
import { SqlParameter } from "./resultSetPanelProvider";

const MAX_REMEMBERED_BIND_VALUES = 100;
const BIND_TITLE = `Bind Parameters`;
const NULL_BUTTON: QuickInputButton = { iconPath: new ThemeIcon(`circle-slash`), tooltip: `Set to NULL` };

let promptId = 0;

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

function inputParameterValue(label: string, current: string | null, step?: number, totalSteps?: number): Promise<{ value: string | null } | `back` | undefined> {
  return new Promise(resolve => {
    const input = window.createInputBox();
    input.title = BIND_TITLE;
    input.step = step;
    input.totalSteps = totalSteps;
    input.prompt = `Value for ${label}`;
    input.value = current ?? ``;
    // An empty field keeps a NULL value
    input.placeholder = current === null ? `NULL` : undefined;
    input.buttons = step && step > 1 ? [QuickInputButtons.Back, NULL_BUTTON] : [NULL_BUTTON];
    input.ignoreFocusOut = true;

    let result: { value: string | null } | `back` | undefined;
    input.onDidAccept(() => {
      result = { value: current === null && input.value === `` ? null : input.value };
      input.hide();
    });
    input.onDidTriggerButton(button => {
      result = button === QuickInputButtons.Back ? `back` : { value: null };
      input.hide();
    });
    // Also fires when another run opens its own prompt, which cancels this one
    input.onDidHide(() => {
      input.dispose();
      resolve(result);
    });
    input.show();
  });
}

function pickParameter(labels: string[], values: (string | null)[]): Promise<number | `run` | undefined> {
  return new Promise(resolve => {
    const pick = window.createQuickPick<QuickPickItem & { index?: number }>();
    pick.title = BIND_TITLE;
    pick.placeholder = `Press Enter to run, or select a parameter to change its value`;
    pick.matchOnDescription = true;
    pick.ignoreFocusOut = true;
    pick.items = [
      { label: `$(play) Run` },
      { label: `Parameters`, kind: QuickPickItemKind.Separator },
      ...labels.map((label, index) => ({ label, description: values[index] === null ? `NULL` : values[index] || `(empty)`, index }))
    ];

    let choice: number | `run` | undefined;
    pick.onDidAccept(() => {
      const item = pick.selectedItems[0];
      if (item) {
        choice = item.index ?? `run`;
        pick.hide();
      }
    });
    pick.onDidHide(() => {
      pick.dispose();
      resolve(choice);
    });
    pick.show();
  });
}

export async function promptForParameterValues(statementMarkers: (string | undefined)[][]): Promise<SqlParameter[][] | undefined> {
  const remembered = Config.ready ? { ...Config.getBindValues() } : {};

  const fields: { key?: string, label: string }[] = [];
  const namedFields = new Map<string, number>();
  let positionalCount = 0;

  const statementFields = statementMarkers.map(markers => markers.map(name => {
    const key = name?.toUpperCase();
    if (key && namedFields.has(key)) {
      return namedFields.get(key)!;
    }

    if (key) {
      namedFields.set(key, fields.length);
    }
    fields.push({ key, label: name ?? `parameter marker ${++positionalCount}` });
    return fields.length - 1;
  }));

  const values = fields.map(field => field.key && remembered[field.key] !== undefined ? remembered[field.key] : ``);
  const allStored = fields.length > 0 && fields.every(field => field.key && remembered[field.key] !== undefined);
  const id = ++promptId;

  if (allStored) {
    const labels = fields.map(field => field.label);
    let choice = await pickParameter(labels, values);
    while (choice !== `run`) {
      if (choice === undefined) {
        return;
      }

      const result = await inputParameterValue(labels[choice], values[choice]);
      // A newer run replaced this prompt
      if (id !== promptId) {
        return;
      }

      if (result && result !== `back`) {
        values[choice] = result.value;
      }
      choice = await pickParameter(labels, values);
    }

  } else {
    let i = 0;
    while (i < fields.length) {
      const result = await inputParameterValue(fields[i].label, values[i], i + 1, fields.length);
      if (!result) {
        return;
      }

      if (result === `back`) {
        i--;
      } else {
        values[i] = result.value;
        i++;
      }
    }
  }

  if (Config.ready && namedFields.size > 0) {
    for (const [key, index] of namedFields) {
      delete remembered[key];
      remembered[key] = values[index];
    }

    const keys = Object.keys(remembered);
    keys.slice(0, keys.length - MAX_REMEMBERED_BIND_VALUES).forEach(key => delete remembered[key]);

    await Config.setBindValues(remembered);
  }

  // mapepire accepts null
  return statementFields.map(indexes => indexes.map(index => values[index] as SqlParameter));
}
