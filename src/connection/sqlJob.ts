import { getInstance } from "../base";
import { ServerComponent } from "./serverComponent";
import { JDBCOptions, ConnectionResult, Rows, QueryResult } from "./types";

export class SQLJob {
  private channel: any;
  private isRunning: boolean = false;
  
  jobId: string|undefined;
  options: JDBCOptions;
  constructor(options: JDBCOptions = {}) {
    this.options = options;
  }

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
    if (!this.isRunning) {
      this.isRunning = true;
      ServerComponent.writeOutput(content);
      return new Promise((resolve, reject) => {
        this.channel.stdin.write(content + `\n`);

        let outString = ``;
        this.channel.stdout.on(`data`, (data: Buffer) => {
          outString += String(data);
          if (outString.endsWith(`\n`)) {
            this.isRunning = false;
            this.channel.stdout.removeAllListeners(`data`);
            ServerComponent.writeOutput(outString);
            resolve(outString);
          }
        });
      });
    } else {
      throw new Error(`Statement is currently being executed.`);
    }
  }

  async connect(): Promise<ConnectionResult> {
    this.channel = await SQLJob.getChannel();

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
      throw new Error(connectResult.error || `Failed to connect to server.`);
    }

    this.jobId = connectResult.job;
    
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

    this.channel.close();
  }
}