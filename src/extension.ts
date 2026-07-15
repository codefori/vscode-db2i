// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import SchemaBrowser from "./views/schemaBrowser";

import * as JSONServices from "./language/json";
import * as ClipboardServices from "./language/clipboard";
import * as resultsProvider from "./views/results";

import { JDBCOptions } from "@ibm/mapepire-js/dist/src/types";
import { registerCopilotProvider } from "./aiProviders/copilot";
import { getInstance, loadBase } from "./base";
import { JobManager, initConfig, onConnectOrServerInstall as onCode4iConnect } from "./config";
import Configuration from "./configuration";
import { ExtendedSQLJob } from "./connection/extendedSQLJob";
import { SQLJobManager } from "./connection/manager";
import Statement from "./database/statement";
import { languageInit } from "./language/providers";
import { DbCache } from "./language/providers/logic/cache";
import { setCheckerAvailableContext } from "./language/providers/problemProvider";
import { notebookInit } from "./notebooks/IBMiSerializer";
import { initialiseTestSuite } from "./testing";
import { Db2iUriHandler, getStatementUri } from "./uriHandler";
import { SQLExamples } from "./views/examples";
import { ExampleBrowser } from "./views/examples/exampleBrowser";
import { JobManagerView } from "./views/jobManager/jobManagerView";
import { SelfCodesResultsView, SelfTreeDecorationProvider } from "./views/jobManager/selfCodes/selfCodesResultsView";
import { QueryHistory } from "./views/queryHistoryView";

export interface Db2i {
  sqlJobManager: SQLJobManager,
  sqlJob: (options?: JDBCOptions) => Promise<ExtendedSQLJob>
  sqlExamples: typeof SQLExamples,
  statement: typeof Statement,
  dbCache: typeof DbCache,
}

export namespace Db2foriOutput {
  const outputChannel = vscode.window.createOutputChannel(`Db2 for IBM i`, `json`);
  export function writeOutput(jsonString?: string, show = false) {
    if (show) {
      outputChannel.show();
    }

    if (jsonString) {
      outputChannel.appendLine(jsonString);
    }
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<Db2i> {
  await loadBase(context);

  const jobManagerView = new JobManagerView(context);
  const jobManagerTreeView = vscode.window.createTreeView(`jobManager`, { treeDataProvider: jobManagerView, showCollapseAll: true });
  const schemaBrowser = new SchemaBrowser(context);
  const schemaBrowserTreeView = vscode.window.createTreeView(`schemaBrowser`, { treeDataProvider: schemaBrowser, showCollapseAll: true });
  const queryHistory = new QueryHistory(context);
  const queryHistoryTreeView = vscode.window.createTreeView(`queryHistory`, { treeDataProvider: queryHistory, showCollapseAll: true });
  const exampleBrowser = new ExampleBrowser(context);
  const exampleBrowserTreeView = vscode.window.createTreeView(`exampleBrowser`, { treeDataProvider: exampleBrowser, showCollapseAll: true });
  const selfCodesView = new SelfCodesResultsView(context);
  const selfCodesTreeView = vscode.window.createTreeView(`vscode-db2i.self.nodes`, { treeDataProvider: selfCodesView, showCollapseAll: true });

  context.subscriptions.push(
    ...languageInit(),
    ...notebookInit(),
    jobManagerTreeView,
    schemaBrowserTreeView,
    queryHistoryTreeView,
    exampleBrowserTreeView,
    selfCodesTreeView,
    vscode.window.registerFileDecorationProvider(
      new SelfTreeDecorationProvider()
    ),
    vscode.window.registerUriHandler(new Db2iUriHandler()),
    getStatementUri
  );

  JSONServices.initialise(context);
  ClipboardServices.initialise(context);
  resultsProvider.initialise(context);

  initConfig(context);

  console.log(`Developer environment: ${process.env.DEV}`);
  const devMode = process.env.DEV !== undefined;
  let runTests: Function | undefined;
  if (devMode) {
    // Run tests if not in production build
    runTests = initialiseTestSuite(context);
  }

  const instance = getInstance();

  instance.subscribe(context, `connected`, `db2i-connected`, () => {
    DbCache.resetCache();
    selfCodesView.setRefreshEnabled(false);
    selfCodesView.setJobOnly(false);
    setCheckerAvailableContext();
    // Refresh the examples when we have it, so we only display certain examples
    onCode4iConnect().then(async () => {
      schemaBrowser.clearCacheAndRefresh();
      exampleBrowser.refresh();
      queryHistory.refresh();
      selfCodesView.setRefreshEnabled(Configuration.get(`jobSelfViewAutoRefresh`) || false);
      if (devMode && runTests) {
        runTests();
      }
    });
  });


  // register copilot provider
  registerCopilotProvider(context);

  console.log(`Congratulations, ${context.extension.id} is now active!`);

  return {
    sqlJobManager: JobManager,
    sqlJob: (options?: JDBCOptions) => JobManager.newJob(options),
    sqlExamples: SQLExamples,
    statement: Statement,
    dbCache: DbCache
  };
}

// this method is called when your extension is deactivated
export function deactivate() { }