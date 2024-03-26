import vscode from 'vscode';

const QUERIES_KEY = `queries`;
const SERVERCOMPONENT_KEY = `serverVersion`

export interface QueryHistoryItem {
  query: string;
  unix: number;
}

export type QueryList = QueryHistoryItem[];

abstract class Storage {
  protected readonly globalState;

  constructor(context: vscode.ExtensionContext) {
    this.globalState = context.globalState;
  }

  protected get<T>(key: string): T | undefined {
    return this.globalState.get(this.getStorageKey(key)) as T | undefined;
  }

  protected async set(key: string, value: any) {
    await this.globalState.update(this.getStorageKey(key), value);
  }

  protected abstract getStorageKey(key: string): string;
}

export class ConnectionStorage extends Storage {
  private connectionName: string = "";
  constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  get ready(): boolean {
    if (this.connectionName) {
      return true;
    }
    else {
      return false;
    }
  }

  setConnectionName(connectionName: string) {
    this.connectionName = connectionName;
  }

  protected getStorageKey(key: string): string {
    return `${this.connectionName}.${key}`;
  }

  getServerComponentName(): string|undefined {
    return this.get<string>(SERVERCOMPONENT_KEY);
  }

  setServerComponentName(name: string) {
    return this.set(SERVERCOMPONENT_KEY, name);
  }

  /**
   * Eventually we will want to remove this function, but for now we need to fix the past queries
   */
  fixPastQueries() {
    const currentList = this.getPastQueries() as (string|QueryHistoryItem)[];
    const hasOldFormat = currentList.some(item => typeof item === `string`);
    if (hasOldFormat) {
      const newList = currentList.map(item => {
        if (typeof item === `string`) {
          return { query: item, unix: Math.floor(Date.now() / 1000) - 86400 };
        } else {
          return item;
        }
      });
      return this.setPastQueries(newList);
    }
  }

  getPastQueries() {
    return this.get<QueryList>(QUERIES_KEY) || [];
  }

  async setPastQueries(sourceList: QueryList) {
    await this.set(QUERIES_KEY, sourceList);
  }

}
