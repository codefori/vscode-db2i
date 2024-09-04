import { getInstance } from "../base";
import { ServerComponent } from "./serverComponent";
import { SelfValue } from "../views/jobManager/selfCodes/nodes";
import { SQLJob } from "@ibm/mapepire-js";
import { ConnectionResult, JobStatus, QueryResult, ServerRequest, ServerResponse } from "@ibm/mapepire-js/dist/src/types";
import { JobLogEntry } from "./types";

const DB2I_VERSION = (process.env[`DB2I_VERSION`] || `<version unknown>`) + ((process.env.DEV) ? ``:`-dev`);

export class OldSQLJob extends SQLJob {
  private channel: any;
  private selfState: SelfValue = "*NONE";

  id: string | undefined;

  getSelfCode(): SelfValue {
    return this.selfState;
  }

  public static async useExec() {
    let useExec = false;

    const instance = getInstance();
    const connection = instance.getConnection();

    const bashPathAvailable = connection.remoteFeatures[`bash`];
    if (bashPathAvailable) {
      const commandShellResult = await connection.sendCommand({
        command: `echo $SHELL`
      });
      if (!commandShellResult.stderr) {
        let userDefaultShell = commandShellResult.stdout.trim();
        if (userDefaultShell === bashPathAvailable) {
          useExec = true;
        }
      }
    }

    return useExec;
  }

  private async getSshChannel() {
    const instance = getInstance();
    const connection = instance.getConnection();

    let useExec = await OldSQLJob.useExec();

    return new Promise((resolve, reject) => {
      // Setting QIBM_JAVA_STDIO_CONVERT and QIBM_PASE_DESCRIPTOR_STDIO to make sure all PASE and Java converters are off
      const startingCommand = `QIBM_JAVA_STDIO_CONVERT=N QIBM_PASE_DESCRIPTOR_STDIO=B QIBM_USE_DESCRIPTOR_STDIO=Y QIBM_MULTI_THREADED=Y ${useExec ? `exec ` : ``}` + ServerComponent.getInitCommand();

      ServerComponent.writeOutput(startingCommand);

      const a = connection.client.connection.exec(startingCommand, (err: any, stream: any, options: {encoding: `binary`}) => {
        if (err) {
          reject(err);
          ServerComponent.writeOutput(err);
        }

        let outString = ``;

        stream.stderr.on(`data`, (data: Buffer) => {
          ServerComponent.writeOutput(data.toString());
        })

        stream.stdout.on(`data`, (data: Buffer) => {
          outString += String(data);
          if (outString.endsWith(`\n`)) {
            for (const thisMsg of outString.split(`\n`)) {
              if (thisMsg === ``) continue;
              
              outString = ``;
              if (this.isTracingChannelData) ServerComponent.writeOutput(thisMsg);
              try {
                let response: ServerResponse = JSON.parse(thisMsg);
                this.responseEmitter.emit(response.id, response);
              } catch (e: any) {
                console.log(`Error: ` + e);
                console.log(`Data: ` + thisMsg);
                outString = ``;
              }
            }
          }
        });

        resolve(stream);
      });

      console.log(a);
    })
  }

  override async send<T>(content: ServerRequest): Promise<T> {
    if (this.isTracingChannelData) ServerComponent.writeOutput(JSON.stringify(content));

    this.channel.stdin.write(JSON.stringify(content) + `\n`);
    return new Promise((resolve, reject) => {
      this.responseEmitter.on(content.id, (x: ServerResponse) => {
        this.responseEmitter.removeAllListeners(x.id);
        resolve(x as T);
      });
    });
  }

  getStatus(): JobStatus {
    const currentListenerCount = this.responseEmitter.eventNames().length;

    return currentListenerCount > 0 ? "busy" : this.status;
  }

  async connect(): Promise<ConnectionResult> {
    this.isTracingChannelData = true;

    this.channel = await this.getSshChannel();

    this.channel.on(`error`, (err) => {
      ServerComponent.writeOutput(err);
      this.dispose();
    })

    this.channel.on(`close`, (code: number) => {
      ServerComponent.writeOutput(`Exited with code ${code}.`)
      this.dispose();
    })

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
      id: OldSQLJob.getNewUniqueId(),
      type: `connect`,
      //technique: (getInstance().getConnection().qccsid === 65535 || this.options["database name"]) ? `tcp` : `cli`, //TODO: investigate why QCCSID 65535 breaks CLI and if there is any workaround
      technique: `tcp`, // TODO: DOVE does not work in cli mode
      application: `vscode-db2i ${DB2I_VERSION}`,
      props: props.length > 0 ? props : undefined
    }

    const connectResult = await this.send<ConnectionResult>(connectionObject);

    if (connectResult.success === true) {
      this.status = "ready";
    } else {
      this.dispose();
      this.status = "notStarted";
      throw new Error(connectResult.error || `Failed to connect to server.`);
    }

    this.id = connectResult.job;
    this.isTracingChannelData = false;

    return connectResult;
  }

  async setSelfState(code: SelfValue) {
    try {
      const query: string = `SET SYSIBMADM.SELFCODES = '${code}'`
      await this.query<any>(query).execute();
      this.selfState = code;
    } catch (e) {
      throw e;
    }
  }

  getJobLog(): Promise<QueryResult<JobLogEntry>> {
    return this.query<JobLogEntry>(`select * from table(qsys2.joblog_info('*')) a`).execute();
  }

  async requestCancel(): Promise<boolean> {
    const instance = getInstance();
    const connection = instance.getConnection();

    // Note that this statement is run via the base extension since it has to be done on a job other than the one whose SQL is getting canceled
    await connection.runSQL(`CALL QSYS2.CANCEL_SQL('${this.id}')`);

    const [row] = await connection.runSQL(`select V_SQL_STMT_STATUS as STATUS from table(qsys2.get_job_info('${this.id}'))`) as {STATUS: string|null}[];

    if (row && row.STATUS === `ACTIVE`) return false;

    return true;
  }

  async close() {
    const exitObject: ServerRequest = {
      id: OldSQLJob.getNewUniqueId(),
      type: `exit`
    };

    this.send(exitObject);

    this.responseEmitter.eventNames().forEach(event => {
      this.responseEmitter.emit(event, JSON.stringify({
        id: event,
        success: false,
        error: `Job ended before response returned.`
      }));
    });

    this.dispose();
  }

  dispose() {
    this.channel.close();
    this.status = "ended";
  }
}