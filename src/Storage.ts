import vscode from 'vscode';

const SERVERCOMPONENT_KEY = `serverVersion`;
const QUERIES_KEY = `queries`;
const START_UP_CONFIGS_KEY = `startUpConfigs`;

export interface QueryHistoryItem {
  query: string;
  unix: number;
  substatements?: string[];
  starred?: boolean;
}

export type QueryList = QueryHistoryItem[];

export interface StartUpConfig {
  connectionName: string;
  configName: string
}

export type StartUpConfigList = StartUpConfig[];

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

  getPastQueries() {
    return this.get<QueryList>(QUERIES_KEY) || [];
  }

  async setPastQueries(sourceList: QueryList) {
    await this.set(QUERIES_KEY, sourceList);
  }

  getStartUpConfigList() {
    return this.get<StartUpConfigList>(START_UP_CONFIGS_KEY) || [];
  }

  async setStartUpConfigList(startUpConfigList: StartUpConfigList) {
    await this.set(START_UP_CONFIGS_KEY, startUpConfigList);
  }
}
