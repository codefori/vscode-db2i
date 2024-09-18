// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import vscode from "vscode"
import schemaBrowser from "./views/schemaBrowser";

import * as JSONServices from "./language/json";
import * as resultsProvider from "./views/results";

import { getInstance, loadBase } from "./base";
import { JobManager, onConnectOrServerInstall, initConfig } from "./config";
import { queryHistory } from "./views/queryHistoryView";
import { ExampleBrowser } from "./views/examples/exampleBrowser";
import { languageInit } from "./language/providers";
import { initialiseTestSuite } from "./testing";
import { JobManagerView } from "./views/jobManager/jobManagerView";
import { ServerComponent } from "./connection/serverComponent";
import { SQLJobManager } from "./connection/manager";
import { OldSQLJob } from "./connection/sqlJob";
import { notebookInit } from "./notebooks/IBMiSerializer";
import { SelfTreeDecorationProvider, selfCodesResultsView } from "./views/jobManager/selfCodes/selfCodesResultsView";
import Configuration from "./configuration";
import { JDBCOptions } from "@ibm/mapepire-js/dist/src/types";
import { Db2iUriHandler, getStatementUri } from "./uriHandler";
import { DbCache } from "./language/providers/logic/cache";

export interface Db2i {
  sqlJobManager: SQLJobManager,
  sqlJob: (options?: JDBCOptions) => OldSQLJob
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

export function activate(context: vscode.ExtensionContext): Db2i {
  
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(`Congratulations, your extension "vscode-db2i" is now active!`);

  loadBase();

  const exampleBrowser = new ExampleBrowser(context);
  const selfCodesView = new selfCodesResultsView(context);

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
      exampleBrowser
    ),
    vscode.window.registerTreeDataProvider(
      'vscode-db2i.self.nodes',
      selfCodesView
    ),
    vscode.window.registerFileDecorationProvider(
      new SelfTreeDecorationProvider()
    ),
    vscode.window.registerUriHandler(new Db2iUriHandler()),
    getStatementUri
  );

  JSONServices.initialise(context);
  resultsProvider.initialise(context);

  initConfig(context);

  console.log(`Developer environment: ${process.env.DEV}`);
  const devMode = process.env.DEV !== undefined;
  let runTests: Function|undefined;
  if (devMode) {
    // Run tests if not in production build
    runTests = initialiseTestSuite(context);
  }

  const instance = getInstance();

  instance.subscribe(context, `connected`, `db2i-connected`, () => {
    DbCache.resetCache();
    selfCodesView.setRefreshEnabled(false);
    selfCodesView.setJobOnly(false);
    // Refresh the examples when we have it, so we only display certain examples
    onConnectOrServerInstall().then(() => {
      exampleBrowser.refresh();
      selfCodesView.setRefreshEnabled(Configuration.get(`jobSelfViewAutoRefresh`) || false);

      if (devMode && runTests) {
        runTests();
      }
    });
  });

  return { sqlJobManager: JobManager, sqlJob: (options?: JDBCOptions) => new OldSQLJob(options) };
}

// this method is called when your extension is deactivated
export function deactivate() { }