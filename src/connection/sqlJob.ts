import { getInstance } from "../base";
import { ServerComponent } from "./serverComponent";
import { JDBCOptions, ConnectionResult, Rows, QueryResult } from "./types";

export enum JobStatus {
  NotStarted,
  Ready,
  Busy,
  Ended
}

export class SQLJob {
  private channel: any;
  private status: JobStatus = JobStatus.NotStarted;

  jobId: string|undefined;
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

  private async send(content: string): Promise<string> {
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
      this.status = JobStatus.NotStarted;
      this.dispose();
      throw new Error(connectResult.error || `Failed to connect to server.`);
    }

    this.channel.on(`error`, () => {
      this.dispose();
    })

    this.channel.on(`close`, () => {
      this.dispose();
    })

    this.jobId = connectResult.job;
    this.status = JobStatus.Ready;
    
    return connectResult;
  }

  async query(sql: string): Promise<Rows> {
    const connectionObject = {
      id: `boop`,
      type: `sql`,
      sql
      // TODO: rows support?
    }

    const result = await this.send(JSON.stringify(connectionObject));

    const queryResult: QueryResult = JSON.parse(result);

    if (queryResult.success !== true) {
      throw new Error(queryResult.error || `Failed to run query (unknown error)`);
    }
    
    return queryResult.data;
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