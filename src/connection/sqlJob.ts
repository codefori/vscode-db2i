import { CommandResult } from "@halcyontech/vscode-ibmi-types";
import { getInstance } from "../base";
import { ServerComponent } from "./serverComponent";
import { JDBCOptions, ConnectionResult, Rows, QueryResult, JobLogEntry, CLCommandResult, VersionCheckResult, GetTraceDataResult, ServerTraceDest, ServerTraceLevel, SetConfigResult, QueryOptions } from "./types";
import { Query } from "./query";
import { EventEmitter } from "stream";

export enum JobStatus {
  NotStarted = "notStarted",
  Ready = "ready",
  Active = "active",
  Ended = "ended"
}
interface ReqRespFmt {
  id: string
};
export class SQLJob {

  private static uniqueIdCounter: number = 0;
  private channel: any;
  private responseEmitter: EventEmitter = new EventEmitter();
  private status: JobStatus = JobStatus.NotStarted;
  private isTracingChannelData: boolean = false;

  id: string | undefined;


  public static getNewUniqueRequestId(prefix: string = `sqljob`): string {
    return prefix + (++SQLJob.uniqueIdCounter);
  }

  constructor(public options: JDBCOptions = {}) {}
  private async getChannel() {
    const instance = getInstance();
    const connection = instance.getConnection();
    return new Promise((resolve, reject) => {
      connection.client.connection.exec(ServerComponent.getInitCommand() + ` && exit`, {}, (err: any, stream: any) => {
        if (err)
          reject(err);
        let outString = ``;
        stream.on(`data`, (data: Buffer) => {
          outString += String(data);
          if (outString.endsWith(`\n`)) {
            let thisMsg = outString;
            outString = ``;
            if (this.isTracingChannelData) ServerComponent.writeOutput(thisMsg);
            try {
              let response: ReqRespFmt = JSON.parse(thisMsg);
              this.responseEmitter.emit(response.id, thisMsg);
            } catch (e: any) {
              console.log(`Error: ` + e);
              outString = ``;
            }
          }
        });
        resolve(stream);
      })
    })
  }

  async send(content: string): Promise<string> {
    if (this.isTracingChannelData) ServerComponent.writeOutput(content);
    let req: ReqRespFmt = JSON.parse(content);
    this.channel.stdin.write(content + `\n`);
    this.status = JobStatus.Active;
    return new Promise((resolve, reject) => {
      this.responseEmitter.on(req.id, (x: string) => {
        this.responseEmitter.removeAllListeners(req.id);
        resolve(x);
      });
    });
  }

  getStatus() {
    return this.status;
  }

  async connect(): Promise<ConnectionResult> {
    this.channel = await this.getChannel();

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
      id: SQLJob.getNewUniqueRequestId(),
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
  query<T>(sql: string, opts?: QueryOptions): Query<T> {
    return new Query(this, sql, opts);
  }

  async getVersion(): Promise<VersionCheckResult> {
    const verObj = {
      id: SQLJob.getNewUniqueRequestId(),
      type: `getversion`
    };

    const result = await this.send(JSON.stringify(verObj));

    const version: VersionCheckResult = JSON.parse(result);

    if (version.success !== true) {
      throw new Error(version.error || `Failed to get version from backend`);
    }

    return version;
  }
  async getTraceData(): Promise<GetTraceDataResult> {
    const tracedataReqObj = {
      id: SQLJob.getNewUniqueRequestId(),
      type: `gettracedata`
    };

    const result = await this.send(JSON.stringify(tracedataReqObj));

    const rpy: GetTraceDataResult = JSON.parse(result);

    if (rpy.success !== true) {
      throw new Error(rpy.error || `Failed to get trace data from backend`);
    }
    return rpy;
  }
  //TODO: add/modify this API to allow manipulation of JTOpen tracing, and add tests
  async setTraceConfig(dest: ServerTraceDest, level: ServerTraceLevel): Promise<SetConfigResult> {
    const reqObj = {
      id: SQLJob.getNewUniqueRequestId(),
      type: `setconfig`,
      tracedest: dest,
      tracelevel: level
    };

    const result = await this.send(JSON.stringify(reqObj));

    const rpy: SetConfigResult = JSON.parse(result);

    if (rpy.success !== true) {
      throw new Error(rpy.error || `Failed to set trace options on backend`);
    }
    return rpy;
  }

  clcommand(cmd: string): Query<any> {
    return new Query(this, cmd, { isClCommand: true })
  }

  getJobLog(): Promise<QueryResult<JobLogEntry>> {
    return this.query<JobLogEntry>(`select * from table(qsys2.joblog_info('*')) a`).run();
  }
  async close() {
    const exitObject = {
      id: SQLJob.getNewUniqueRequestId(),
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