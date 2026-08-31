import * as vscode from "vscode";
import Configuration from "../configuration";

const NUMERIC_RE = /^\d+(\.\d+)?$/;
const LARGE_SELECTION_THRESHOLD = 256; // Just for safety

function getLines(selectedText: string): string[] {
  return selectedText
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);
}

function quoteLine(line: string): string {
  return `'${line.replace(/'/g, `''`)}'`;
}

function buildList(lines: string[], quoteNumbers: boolean, wrap: boolean): string {
  const values = lines.map((line: string) =>
    !quoteNumbers && NUMERIC_RE.test(line) ? line : quoteLine(line)
  );
  const csv = values.join(`, `);
  return wrap ? `(${csv})` : csv;
}

async function writeToClipboard(text: string): Promise<boolean> {
  try {
    await vscode.env.clipboard.writeText(text);
    return true;
  } catch (e) {
    vscode.window.showErrorMessage(`Failed to write to clipboard: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

async function confirmLargeSelection(count: number): Promise<boolean> {
  if (count <= LARGE_SELECTION_THRESHOLD) return true;
  const answer = await vscode.window.showWarningMessage(
    `Your selection contains ${count} values. Continue copying to clipboard?`,
    { modal: true },
    `Continue`
  );
  return answer === `Continue`;
}

export function initialise(context: vscode.ExtensionContext) {
  context.subscriptions.push(

    // ── Instant copy using current settings ──────────────────────────────────
    vscode.commands.registerCommand(`vscode-db2i.copyAsDelimitedList`, async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selectedText = editor.document.getText(editor.selection);
      const lines = getLines(selectedText);

      if (lines.length === 0) {
        vscode.window.showErrorMessage(`No text selected.`);
        return;
      }

      if (!await confirmLargeSelection(lines.length)) return;

      const quoteNumbers = Configuration.get<boolean>(`delimitedList.quoteNumbers`) ?? true;
      const wrapInParens = Configuration.get<boolean>(`delimitedList.wrapInParentheses`) ?? false;

      const result = buildList(lines, quoteNumbers, wrapInParens);
      if (await writeToClipboard(result)) {
        vscode.window.showInformationMessage(`SQL list copied to clipboard.`);
      }
    }),

    // ── Prompted copy with format options ────────────────────────────────────
    vscode.commands.registerCommand(`vscode-db2i.copyAsDelimitedListPrompt`, async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selectedText = editor.document.getText(editor.selection);
      const lines = getLines(selectedText);

      if (lines.length === 0) {
        vscode.window.showErrorMessage(`No text selected.`);
        return;
      }

      if (!await confirmLargeSelection(lines.length)) return;

      const hasNumbers = lines.some((line: string) => NUMERIC_RE.test(line));

      const listQuoted       = buildList(lines, true, false);
      const listQuotedParens = buildList(lines, true, true);

      type QuickPickItem = { label: string; description: string; value: string };
      const options: QuickPickItem[] = [
        { label: `Copy as list`, description: listQuoted, value: listQuoted },
      ];

      if (hasNumbers) {
        const listUnquoted       = buildList(lines, false, false);
        const listUnquotedParens = buildList(lines, false, true);
        options.push(
          { label: `Copy as list (numbers unquoted)`, description: listUnquoted, value: listUnquoted },
          { label: `Copy wrapped in parentheses`, description: listQuotedParens, value: listQuotedParens },
          { label: `Copy wrapped in parentheses (numbers unquoted)`, description: listUnquotedParens, value: listUnquotedParens }
        );
      } else {
        options.push(
          { label: `Copy wrapped in parentheses`, description: listQuotedParens, value: listQuotedParens }
        );
      }

      const choice = await vscode.window.showQuickPick(options, { title: `Copy as SQL List` });
      if (choice && await writeToClipboard(choice.value)) {
        vscode.window.showInformationMessage(`SQL list copied to clipboard.`);
      }
    })
  );
}
