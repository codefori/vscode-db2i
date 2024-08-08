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
import { JobStatus } from "../../../connection/sqlJob";

type ChangeTreeDataEventType = SelfCodeTreeItem | undefined | null | void;

export class selfCodesResultsView implements TreeDataProvider<any> {
  private _onDidChangeTreeData: EventEmitter<ChangeTreeDataEventType> =
    new EventEmitter<ChangeTreeDataEventType>();
  readonly onDidChangeTreeData: vscode.Event<ChangeTreeDataEventType> = this._onDidChangeTreeData.event;
  private autoRefresh: boolean = false;
  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand(`vscode-db2i.self.refresh`, async () => this.refresh()),
      vscode.commands.registerCommand(`vscode-db2i.self.reset`, async () => {
        const selected = JobManager.getRunningJobs();
        if (selected) {
          try {
            const resetSelfCmd = `DELETE FROM qsys2.SQL_ERRORT where user_name = current_user`
            await JobManager.runSQL(resetSelfCmd, undefined);
            this.refresh();
            vscode.window.showInformationMessage(`Reset SELF code error log.`)
          } catch (e) {
            vscode.window.showErrorMessage(`An Error occured reseting SELF code error log: ${e}`)
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
      })
    );
    setInterval(async () => {
      if (this.autoRefresh) {
        const selected = JobManager.getSelection();
        // Don't refresh if the job is busy.
        if ((selected && selected.job.getStatus() === JobStatus.Ready) || selected === undefined) {
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

  async getSelfCodes(selected: JobInfo): Promise<SelfCodeNode[]|undefined> {
    const content = `SELECT 
                      job_name, user_name, reason_code, logged_time, logged_sqlstate, logged_sqlcode, matches, stmttext, message_text, message_second_level_text,
                      program_library, program_name, program_type, module_name, client_applname, client_programid, initial_stack
                    FROM qsys2.sql_error_log, lateral (select * from TABLE(SYSTOOLS.SQLCODE_INFO(logged_sqlcode)))
                    where user_name = current_user
                    order by logged_time desc`;

    try {
      const result = await selected.job.query<SelfCodeNode>(content).run(10000);
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
    if (element) {
      if (element instanceof SelfCodeTreeItem) {
        return element.getChilden();
      } else if (element instanceof SelfErrorStackItem) {
        return element.getChildren();
      }
    } else {
      const selected = JobManager.getSelection();

      if (selected) {
        const selfCodes = await this.getSelfCodes(selected);

        if (selfCodes) {
          return selfCodes.map((error) => {
            const treeItem = new SelfCodeTreeItem(error);
            return treeItem;
          });
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
export class SelfCodeTreeItem extends TreeItem {
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

  getChilden(): TreeItem[] {
    const validStack = this.error.INITIAL_STACK.initial_stack
      .sort((a, b) => a.ORD - b.ORD) // Ord, low to high
      .filter((stack) => stack.LIB !== `QSYS`);

    const items = [
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

class SelfErrorStatementItem extends TreeItem {
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
}

class SelfErrorNodeItem extends TreeItem {
  constructor(label: string, description: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(`info`);
    this.description = description;
  }
}

class SelfErrorStackItem extends TreeItem {
  constructor(private stack: SelfIleStackFrame[]) {
    super(`Stack`, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon(`debug`);
    this.contextValue = `selfCodeStack`;

    this.resourceUri = vscode.Uri.from({
      scheme: `selfCodeTreeView`,
      path: stack.length.toString()
    })
  }

  getChildren(): SelfErrorStackFrameItem[] {
    return this.stack.map((stackCall) => new SelfErrorStackFrameItem(stackCall));
  }
}

class SelfErrorStackFrameItem extends TreeItem {
  constructor(stackCall: SelfIleStackFrame) {
    super(`${stackCall.PROC}:${stackCall.STMT}`, vscode.TreeItemCollapsibleState.None);
    this.description = `${stackCall.LIB}/${stackCall.PGM} (${stackCall.TYPE}, ${stackCall.MODULE})`;
    this.contextValue = `selfCodeStackCall`;
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
