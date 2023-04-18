import { getInstance } from "./base";

const initCommand = `/QOpenSys/QIBM/ProdData/JavaVM/jdk80/64bit/bin/java -jar /home/LINUX/srv.jar`;

interface ServerResponse {
  id: string;
  success: boolean;
}

interface ConnectionResult extends ServerResponse {
  job: string;
}

interface QueryMetaData {
  column_count: number,
  columns: ColumnMetaData[],
  job: string
}

interface ColumnMetaData {
  display_size: number;
  label: string;
  name: string;
  type: string;
}

export type Rows = (string|number)[][];

interface QueryResult extends ServerResponse {
  metadata: QueryMetaData,
  is_done: boolean;
  data: Rows;
}

interface JDBCOptions {
  naming?: "system"|"sql",
  libraries?: string[]
}

export class SQLJob {
  private channel: any;
  private isRunning: boolean = false;
  constructor() {}

  private static async getChannel() {
    const instance = getInstance();
    const connection = instance.getConnection();
    return new Promise((resolve, reject) => {
      connection.client.connection.exec(initCommand, {}, (err: any, stream: any) => {
        if (err) reject(err);
        resolve(stream);
      })
    })
  }

  private async send(content: string): Promise<string> {
    if (!this.isRunning) {
      this.isRunning = true;
      return new Promise((resolve, reject) => {
        this.channel.stdin.write(content + `\n`);

        let outString = ``;
        this.channel.stdout.on(`data`, (data: Buffer) => {
          const asString = String(data);
          outString += asString;
          if (outString.endsWith(`\n`)) {
            this.isRunning = false;
            this.channel.stdout.removeAllListeners(`data`);
            resolve(outString);
          }
        });
      });
    } else {
      // TODO: throw error?
    }
  }

  async connect(options: JDBCOptions = {}): Promise<ConnectionResult> {
    this.channel = await SQLJob.getChannel();

    const props = Object
      .keys(options)
      .map(prop => {
        if (Array.isArray(options[prop])) {
          return `${prop}=${(options[prop] as string[]).join(`,`)}`;
        } else {
          return `${prop}=${options[prop]}`;
        }
      })
      .join(`;`)

    const connectionObject = {
      id: `boop`,
      type: `connect`,
      props: props.length > 0 ? props : undefined
    }

    const result = await this.send(JSON.stringify(connectionObject));
    
    return JSON.parse(result);
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
    
    return queryResult.data;
  }

  async close() {
    const exitObject = {
      id: `boop`,
      type: `exit`
    };

    await this.send(JSON.stringify(exitObject));

    this.channel.dispose();
  }
}