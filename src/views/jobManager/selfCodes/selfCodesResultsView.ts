import * as vscode from "vscode";
import {
  Event,
  EventEmitter,
  FileDecorationProvider,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  Uri,
  Disposable
} from "vscode";
import { JobManager, osDetail } from "../../../config";
import { SelfCodeNode, SelfIleStackFrame } from "./nodes";
import { openExampleCommand } from "../../examples/exampleBrowser";
import { SQLExample } from "../../examples";
import { JobInfo } from "../../../connection/manager";
import { OldSQLJob } from "../../../connection/sqlJob";
import { JobLogEntry } from "../../../connection/types";

type ChangeTreeDataEventType = SelfCodeTreeItem | undefined | null | void;

export class selfCodesResultsView implements TreeDataProvider<any> {
  private _onDidChangeTreeData: EventEmitter<ChangeTreeDataEventType> =
    new EventEmitter<ChangeTreeDataEventType>();
  readonly onDidChangeTreeData: vscode.Event<ChangeTreeDataEventType> = this._onDidChangeTreeData.event;
  private autoRefresh: boolean = false;
  private selectedJobOnly: boolean = true;
  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand(`vscode-db2i.self.refresh`, async () => this.refresh()),
      vscode.commands.registerCommand(`vscode-db2i.self.reset`, async () => {
        const selected = JobManager.getRunningJobs();
        if (selected) {
          const resetCmd = this.selectedJobOnly
            ? `DELETE FROM qsys2.SQL_ERRORT where job_name = '${selected[0].job.id}'`
            : `DELETE FROM qsys2.SQL_ERRORT where user_name = current_user`;

          try {
            await JobManager.runSQL(resetCmd, undefined);
            this.refresh();
            const message = this.selectedJobOnly
              ? `Reset SELF code error log for job ${selected[0].name}.`
              : `Reset SELF code error log for all jobs.`;
            vscode.window.showInformationMessage(message);
          } catch (e) {
            vscode.window.showErrorMessage(`An Error occurred resetting SELF code error log: ${e}`);
          }
        }
      }),
      vscode.commands.registerCommand(`vscode-db2i.self.enableAutoRefresh`, async () => {
        this.setRefreshEnabled(true, true);
      }),
      vscode.commands.registerCommand(`vscode-db2i.self.disableAutoRefresh`, async () => {
        this.setRefreshEnabled(false, true);
      }),
      vscode.commands.registerCommand(`vscode-db2i.self.copySqlStatement`, async (item: SelfCodeTreeItem) => {
        if (item && item.error.STMTTEXT) {
          await vscode.env.clipboard.writeText(item.error.STMTTEXT);
          vscode.window.showInformationMessage(`SQL statement copied to clipboard.`);
        }
      }),
      vscode.commands.registerCommand(`vscode-db2i.self.displayDetails`, async (item: SelfCodeTreeItem) => {
        if (item && item.error) {
          const jsonData = JSON.stringify(item.error, null, 2);
          const document = await vscode.workspace.openTextDocument({
            content: jsonData,
            language: `json`
          });
          await vscode.window.showTextDocument(document, { preview: false });
        }
      }),
      vscode.commands.registerCommand(`vscode-db2i.self.explainSelf`, async (item: SelfCodeTreeItem) => {
        if (item && item.error) {
          const jsonData = JSON.stringify(item.error, null, 2);
          const document = await vscode.workspace.openTextDocument({
            content: jsonData,
            language: `json`
          });
          await vscode.window.showTextDocument(document, { preview: false });
          // Assume 'document' is the currently open text document
          const firstLine = document.lineAt(0);
          const lastLine = document.lineAt(document.lineCount - 1);

          // Create a range from the start of the first line to the end of the last line
          const range = new vscode.Range(
            firstLine.range.start, // Start of the first line
            lastLine.range.end // End of the last line
          );

          // Now you can use this range to highlight the whole document or for other purposes
          await vscode.window.showTextDocument(document, {
            selection: range
          });
          
          vscode.commands.executeCommand(`continue.focusContinueInput`);
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.self.help`, async () => {
        await vscode.commands.executeCommand(`vscode.open`, `https://www.ibm.com/docs/en/i/7.5?topic=tools-sql-error-logging-facility-self`)
      }),
      vscode.commands.registerCommand(`vscode-db2i.self.enableSelectedJobOnly`, async () => {
        this.setJobOnly(true);
      }),
      vscode.commands.registerCommand(`vscode-db2i.self.disableSelectedJobOnly`, async () => {
        this.setJobOnly(false);
      }),
    );
    setInterval(async () => {
      if (this.autoRefresh) {
        const selected = JobManager.getSelection();
        // Don't refresh if the job is busy.
        if ((selected && selected.job.getStatus() === "ready") || selected === undefined) {
          this.refresh();
        }
      }
    }, 5000);

  }

  setRefreshEnabled(enabled: boolean, withMessage = false): void {
    this.autoRefresh = enabled;
    vscode.commands.executeCommand(`setContext`, `vscode-db2i.self.autoRefresh`, enabled);

    if (withMessage) {
      vscode.window.showInformationMessage(`SELF Code Auto Refresh ${enabled ? 'Enabled' : 'Disabled'}`);
    }
  }

  setJobOnly(enabled: boolean): void {
    this.selectedJobOnly = enabled;
    vscode.commands.executeCommand(`setContext`, `vscode-db2i.self.specificJob`, enabled);
    this.refresh();
  }

  async getSelfCodes(selected: JobInfo, onlySelected?: boolean): Promise<SelfCodeNode[]|undefined> {
    const content = `SELECT 
                      job_name, user_name, reason_code, logged_time, logged_sqlstate, logged_sqlcode, matches, stmttext, message_text, message_second_level_text,
                      program_library, program_name, program_type, module_name, client_applname, client_programid, initial_stack
                    FROM qsys2.sql_error_log, lateral (select * from TABLE(SYSTOOLS.SQLCODE_INFO(logged_sqlcode)))
                    where user_name = current_user 
                    and ${onlySelected ? `job_name = '${selected.job.id}'` : `LOGGED_TIME >= (select JOB_ENTERED_SYSTEM_TIME from table(qsys2.active_job_info('NO', job_name_filter => '*', detailed_info => 'WORK')) x) `}
                    order by logged_time desc`;

    try {
      const result = await selected.job.query<SelfCodeNode>(content).execute(10000);
      if (result.success) {
        const data: SelfCodeNode[] = result.data.map((row) => ({
          ...row,
          INITIAL_STACK: JSON.parse(row.INITIAL_STACK as unknown as string)
        }));

      
        return data;
      }
    } catch (e) {
      this.setRefreshEnabled(false);
      osDetail.setFeatureSupport(`SELF`, false);
      vscode.window.showErrorMessage(`An error occured fetching SELF code errors, and therefore will be disabled.`);
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: any): TreeItem | Thenable<TreeItem> {
    return element;
  }

  async getChildren(element?: SelfCodeTreeItem|SelfErrorStackItem): Promise<any[]> {
    if (element && 'getChildren' in element) {
      const children = await element.getChildren();
      return children;
    } else {
      const selected = JobManager.getSelection();

      if (selected) {

        if (this.selectedJobOnly) {
          return [
            new SelfCodeItems(this, selected),
            new JobLogEntiresItem(selected.job)
          ];
        } else {
          const selfCodeItems = new SelfCodeItems(this, selected);
          const jobLogItems = await selfCodeItems.getChildren();
          return jobLogItems;
        }
      }

      return [];
    }
  }
  getParent?(element: any) {
    throw new Error("Method not implemented.");
  }
  resolveTreeItem(
    item: SelfCodeTreeItem,
    element: any,
    token: vscode.CancellationToken
  ): ProviderResult<TreeItem> {
    if (!item.tooltip) {
      if (element.STMTTEXT && element.MESSAGE_SECOND_LEVEL_TEXT) {
        // Only set the tooltip if it hasn't been set yet
        item.tooltip = new vscode.MarkdownString(
          `**SQL Statement:** ${element.STMTTEXT}\n\n---\n\n**Detail:** ${element.MESSAGE_SECOND_LEVEL_TEXT}`
        );
        item.tooltip.isTrusted = true; // Make sure to allow Markdown content
      }
    }
    return item;
  }
}

abstract class ExtendedTreeItem extends TreeItem {
  constructor(label: string, collapseState?: vscode.TreeItemCollapsibleState) {
    super(label, collapseState);
  }

  abstract getChildren(): Promise<ExtendedTreeItem[]>;
}

class SelfCodeItems extends ExtendedTreeItem {
  constructor(private selfView: selfCodesResultsView, private selected: JobInfo) {
    super(`SELF`, vscode.TreeItemCollapsibleState.Collapsed);

    this.iconPath = new vscode.ThemeIcon(`warning`);
  }

  async getChildren(): Promise<ExtendedTreeItem[]> {
    const selfCodes = await this.selfView.getSelfCodes(this.selected, true);
    return selfCodes.map((error) => new SelfCodeTreeItem(error));
  }
}

export class SelfCodeTreeItem extends ExtendedTreeItem {
  constructor(
    public error: SelfCodeNode
  ) {
    const label = `${error.LOGGED_SQLSTATE} (${error.LOGGED_SQLCODE}) ${error.REASON_CODE != null ? error.REASON_CODE : ""}`;
    super(label, vscode.TreeItemCollapsibleState.Collapsed);

    const hover = new vscode.MarkdownString(
      [
        `**💻 SQL Statement:** ${error.STMTTEXT}`,
        ``, ``,
        `---`,
        ``, ``,
        `**🛠️ SQL Job:** ${error.JOB_NAME}`,
        ``, ``,
        `---`,
        ``, ``,
        `**🔥 Occurrences:** ${error.MATCHES}`,
        ``, ``,
        `---`,
        ``, ``,
        `**✏️ Details:** ${error.MESSAGE_SECOND_LEVEL_TEXT}`
      ].join(`\n`)
    );
    hover.isTrusted = true;

    this.tooltip = hover;

    this.description = error.MESSAGE_TEXT; // Additional details shown in the tree view
    this.resourceUri = vscode.Uri.from({
      scheme: `selfCodeTreeView`,
      path: error.MATCHES.toString()
    })

    this.iconPath = error.LOGGED_SQLCODE < 0 ? new vscode.ThemeIcon(`error`): new vscode.ThemeIcon(`warning`);
    this.contextValue = `selfCodeNode`;
  }

  async getChildren(): Promise<ExtendedTreeItem[]> {
    const validStack = this.error.INITIAL_STACK.initial_stack
      .sort((a, b) => a.ORD - b.ORD) // Ord, low to high
      .filter((stack) => stack.LIB !== `QSYS`);

    const items: ExtendedTreeItem[] = [
      new SelfErrorStatementItem(this.error.STMTTEXT),
      new SelfErrorNodeItem(`Job`, this.error.JOB_NAME),
      new SelfErrorNodeItem(`Client Name`, this.error.CLIENT_APPLNAME),
      new SelfErrorNodeItem(`Client Program`, this.error.CLIENT_PROGRAMID),
      new SelfErrorNodeItem(`Object`, `${this.error.PROGRAM_LIBRARY}/${this.error.PROGRAM_NAME} (${this.error.PROGRAM_TYPE}, ${this.error.MODULE_NAME})`),
    ]

    if (validStack.length > 0) {
      items.push(new SelfErrorStackItem(validStack));
    }

    return items;
  }
}

class JobLogEntiresItem extends ExtendedTreeItem {
  constructor(private selected: OldSQLJob) {
    super(`Job Log`, vscode.TreeItemCollapsibleState.Collapsed);

    this.iconPath = new vscode.ThemeIcon(`info`);
  }

  async getChildren(): Promise<ExtendedTreeItem[]> {
    const log = await this.selected.getJobLog();
    if (log.has_results) {
      return log.data.reverse().map((entry) => new JobLogEntryItem(entry));
    }
  }
}

const JOB_LOG_ENTRY_ICONS = {
  '0': new vscode.ThemeIcon(`info`),
  '10': new vscode.ThemeIcon(`info`),
  '20': new vscode.ThemeIcon(`warning`),
  '30': new vscode.ThemeIcon(`error`),
}

class JobLogEntryItem extends ExtendedTreeItem {
  constructor(private entry: JobLogEntry) {
    super(`${entry.MESSAGE_ID} (${entry.FROM_LIBRARY}/${entry.FROM_PROGRAM})`, vscode.TreeItemCollapsibleState.None);

    this.description = entry.MESSAGE_TEXT;

    const hoverable = new vscode.MarkdownString();
    let items = [entry.MESSAGE_TEXT, entry.MESSAGE_SECOND_LEVEL_TEXT];
    hoverable.appendText(items.filter(i => i).join(`\n\n`));
    this.tooltip = hoverable;

    this.iconPath = JOB_LOG_ENTRY_ICONS[entry.SEVERITY];
  }

  async getChildren(): Promise<ExtendedTreeItem[]> {
    return [];
  }
}

class SelfErrorStatementItem extends ExtendedTreeItem {
  constructor(statement: string) {
    super(`Statement`, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(`database`);
    this.description = statement;

    const hoverable = new vscode.MarkdownString();
    hoverable.appendCodeblock(statement, `sql`);
    this.tooltip = hoverable;

    const example: SQLExample = {
      name: `Statement`,
      content: [statement]
    }
    
    this.command = {
      command: openExampleCommand,
      title: `Open example`,
      arguments: [example]
    };
  }

  async getChildren(): Promise<ExtendedTreeItem[]> {
    return [];
  }
}

class SelfErrorNodeItem extends ExtendedTreeItem {
  constructor(label: string, description: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(`info`);
    this.description = description;
  }

  async getChildren(): Promise<ExtendedTreeItem[]> {
    return [];
  }
}

class SelfErrorStackItem extends ExtendedTreeItem {
  constructor(private stack: SelfIleStackFrame[]) {
    super(`Stack`, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon(`debug`);
    this.contextValue = `selfCodeStack`;

    this.resourceUri = vscode.Uri.from({
      scheme: `selfCodeTreeView`,
      path: stack.length.toString()
    })
  }

  async getChildren(): Promise<SelfErrorStackFrameItem[]> {
    return this.stack.map((stackCall) => new SelfErrorStackFrameItem(stackCall));
  }
}

class SelfErrorStackFrameItem extends ExtendedTreeItem {
  constructor(stackCall: SelfIleStackFrame) {
    super(`${stackCall.PROC}:${stackCall.STMT}`, vscode.TreeItemCollapsibleState.None);
    this.description = `${stackCall.LIB}/${stackCall.PGM} (${stackCall.TYPE}, ${stackCall.MODULE})`;
    this.contextValue = `selfCodeStackCall`;
  }

  async getChildren(): Promise<ExtendedTreeItem[]> {
    return [];
  }
}

// maybe can be used for showing node details
export class SelfTreeDecorationProvider implements FileDecorationProvider {
  private disposables: Array<Disposable> = [];

  readonly _onDidChangeFileDecorations: EventEmitter<Uri | Uri[]> = new EventEmitter<Uri | Uri[]>();
  readonly onDidChangeFileDecorations: Event<Uri | Uri[]> = this._onDidChangeFileDecorations.event;

  constructor() {
      this.disposables = [];
  }
  provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FileDecoration> {
    if (uri.scheme === `selfCodeTreeView`) {
      const errorCount = parseInt(uri.path);
      
      if (!isNaN(errorCount) && errorCount > 0) {
        return {
          badge: errorCount < 100 ? errorCount.toString() : '💯'
        }
      }
    }

    return null;
  }

  async updateTreeItems(treeItem: TreeItem): Promise<void> {
      this._onDidChangeFileDecorations.fire(treeItem.resourceUri);
  }
}
