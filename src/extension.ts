// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import vscode from "vscode"
import schemaBrowser from "./views/schemaBrowser/schemaBrowser";

import * as JSONServices from "./language/json";
import * as resultsProvider from "./views/results";

import { loadBase } from "./base";
import { JobManager, setupConfig } from "./config";
import { queryHistory } from "./views/queryHistoryView";
import { ExampleBrowser } from "./views/examples/exampleBrowser";
import { languageInit } from "./language";
import { initialise } from "./testing";
import { JobManagerView } from "./views/jobManager/jobManagerView";
import { ServerComponent } from "./connection/serverComponent";
import { SQLJobManager } from "./connection/manager";
import { JDBCOptions } from "./connection/types";
import { SQLJob } from "./connection/sqlJob";
import { notebookInit } from "./notebooks/IBMiSerializer";

export interface Db2i {
  sqlJobManager: SQLJobManager,
  sqlJob: (options?: JDBCOptions) => SQLJob
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

export function activate(context: vscode.ExtensionContext): Db2i {
  
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(`Congratulations, your extension "vscode-db2i" is now active!`);

  loadBase();

  context.subscriptions.push(
    ...languageInit(),
    ...notebookInit(),
    ServerComponent.initOutputChannel(),
    vscode.window.registerTreeDataProvider(
      `jobManager`,
      new JobManagerView(context)
    ),
    vscode.window.registerTreeDataProvider(
      `schemaBrowser`,
      new schemaBrowser(context)
    ),
    vscode.window.registerTreeDataProvider(
      `queryHistory`,
      new queryHistory(context)
    ),
    vscode.window.registerTreeDataProvider(
      `exampleBrowser`,
      new ExampleBrowser(context)
    ),
  );

  JSONServices.initialise(context);
  resultsProvider.initialise(context);

  setupConfig(context);

  console.log(`Developer environment: ${process.env.DEV}`);
  if (process.env.DEV) {
    // Run tests if not in production build
    initialise(context);
  }

  return { sqlJobManager: JobManager, sqlJob: (options?: JDBCOptions) => new SQLJob(options) };
}

// this method is called when your extension is deactivated
export function deactivate() { }