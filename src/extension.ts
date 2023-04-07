// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import vscode from "vscode"
import schemaBrowser from "./views/schemaBrowser";

import * as JSONServices from "./language/json";
import * as resultsProvider from "./language/results";

import {loadBase} from "./base";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

export function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(`Congratulations, your extension "vscode-db2i" is now active!`);

  loadBase();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      `schemaBrowser`,
      new schemaBrowser(context)
    ),
  );

  JSONServices.initialise(context);
  resultsProvider.initialise(context);
}

// this method is called when your extension is deactivated
export function deactivate() {}