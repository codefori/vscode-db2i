import { CommandResult } from "@halcyontech/vscode-ibmi-types";
import { getInstance } from "../base";
import { ServerComponent } from "./serverComponent";
import { JDBCOptions, ConnectionResult, Rows, QueryResult, JobLogEntry, CLCommandResult, VersionCheckResult } from "./types";
import { Query } from "./query";

export enum JobStatus {
  NotStarted = "notStarted",
  Ready = "ready",
  Busy = "busy",
  Ended = "ended"
}

export class SQLJob {

  private channel: any;
  private status: JobStatus = JobStatus.NotStarted;

  id: string | undefined;
  constructor(public options: JDBCOptions = {}) {}

  private static async getChannel() {
    const instance = getInstance();
    const connection = instance.getConnection();
    return new Promise((resolve, reject) => {
      connection.client.connection.exec(ServerComponent.getInitCommand() + ` && exit`, {}, (err: any, stream: any) => {
        if (err) reject(err);
        resolve(stream);
      })
    })
  }

  async send(content: string): Promise<string> {
    if (this.status === JobStatus.Ready) {
      this.status = JobStatus.Busy;
      ServerComponent.writeOutput(content);
      return new Promise((resolve, reject) => {
        this.channel.stdin.write(content + `\n`);

        let outString = ``;
        this.channel.stdout.on(`data`, (data: Buffer) => {
          outString += String(data);
          if (outString.endsWith(`\n`)) {
            this.status = JobStatus.Ready;
            this.channel.stdout.removeAllListeners(`data`);
            ServerComponent.writeOutput(outString);
            resolve(outString);
          }
        });
      });
    } else {
      throw new Error(`Job is currently busy.`);
    }
  }

  getStatus() {
    return this.status;
  }

  async connect(): Promise<ConnectionResult> {
    this.channel = await SQLJob.getChannel();

    this.status = JobStatus.Ready;

    const props = Object
      .keys(this.options)
      .map(prop => {
        if (Array.isArray(this.options[prop])) {
          return `${prop}=${(this.options[prop] as string[]).join(`,`)}`;
        } else {
          return `${prop}=${this.options[prop]}`;
        }
      })
      .join(`;`)

    const connectionObject = {
      id: `boop`,
      type: `connect`,
      props: props.length > 0 ? props : undefined
    }

    const result = await this.send(JSON.stringify(connectionObject));

    const connectResult: ConnectionResult = JSON.parse(result);

    if (connectResult.success !== true) {
      this.dispose();
      this.status = JobStatus.NotStarted;
      throw new Error(connectResult.error || `Failed to connect to server.`);
    }

    this.channel.on(`error`, () => {
      this.dispose();
    })

    this.channel.on(`close`, () => {
      this.dispose();
    })

    this.id = connectResult.job;
    this.status = JobStatus.Ready;

    return connectResult;
  }

  query<T>(isCL, sql: string, parms: any[] = undefined): Query<T> {
    return new Query(this, isCL, sql, parms)
  }

  async getVersion(): Promise<VersionCheckResult> {
    const verObj = {
      id: `boop`,
      type: `getversion`
    };

    const result = await this.send(JSON.stringify(verObj));

    const version: VersionCheckResult = JSON.parse(result);

    if (version.success !== true) {
      throw new Error(version.error || `Failed to get version from backend`);
    }

    return version;
  }
  clcommand(cmd: string): Query<any> {
    return new Query(this, true, cmd);
  }

  async close() {
    const exitObject = {
      id: `boop`,
      type: `exit`
    };

    this.send(JSON.stringify(exitObject));

    this.dispose();
  }

  dispose() {
    this.channel.close();
    this.status = JobStatus.Ended;
  }
}