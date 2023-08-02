import { SQLJob } from "./sqlJob";
import { CLCommandResult, JobLogEntry, QueryOptions, QueryResult, ServerResponse } from "./types";
export enum QueryState {
  NOT_YET_RUN = 1,
  RUN_MORE_DATA_AVAILABLE = 2,
  RUN_DONE = 3,
  ERROR = 4
}
export class Query<T> {

  private static globalQueryList: Query<any>[] = [];
  private correlationId: string;
  private sql: string;
  private isPrepared: boolean = false;
  private parameters: any[]|undefined;
  private rowsToFetch: number = 100;
  private isCLCommand: boolean;
  private state: QueryState = QueryState.NOT_YET_RUN;

  public shouldAutoClose: boolean;

  constructor(private job: SQLJob, query: string, opts: QueryOptions = { isClCommand: false, parameters: undefined, autoClose: false }) {
    this.job = job;
    this.isPrepared = (undefined !== opts.parameters);
    this.parameters = opts.parameters;
    this.sql = query;
    this.isCLCommand = opts.isClCommand;
    this.shouldAutoClose = opts.autoClose;

    Query.globalQueryList.push(this);
  }

  public static byId(id: string) {
    return (undefined === id || '' === id) ? undefined : Query.globalQueryList.find(query => query.correlationId === id);
  }

  public static getOpenIds(forJob?: SQLJob) {
    return this.globalQueryList
      .filter(q => q.job == forJob || forJob === undefined)
      .filter(q => q.getState() === QueryState.NOT_YET_RUN || q.getState() === QueryState.RUN_MORE_DATA_AVAILABLE )
      .map(q => q.correlationId);
  }

  public static async cleanup() {
    let closePromises = [];

    // First, let's check to see if we should also cleanup
    // any cursors that remain open, and we've been told to close
    for (const query of this.globalQueryList) {
      if (query.shouldAutoClose) {
        closePromises.push(query.close())
      }
    };

    await Promise.all(closePromises);

    // Automatically remove any queries done and dusted. They're useless.
    this.globalQueryList = this.globalQueryList.filter(q => q.getState() !== QueryState.RUN_DONE);
  }

private transformQuery(query: string): string {
  // Replace "UPDATE" with "SELECT COUNT(1) FROM"
  query = query.replace(/^UPDATE/, 'SELECT COUNT(1) FROM');

  // Clear everything after "SET" and including "SET" until "WHERE"
  query = query.replace(/SET.*?WHERE/, '');

  return query;
}

  

  public async run(rowsToFetch: number = this.rowsToFetch): Promise<QueryResult<T>> {
    let isUpdate = false;
    switch (this.state) {
      case QueryState.RUN_MORE_DATA_AVAILABLE:
        throw new Error('Statement has already been run');
      case QueryState.RUN_DONE:
        throw new Error('Statement has already been fully run');
    }
    let queryObject;
    let queryObject1;
    if (this.isCLCommand) {
      queryObject = {
        id: SQLJob.getNewUniqueId(`clcommand`),
        type: `cl`,
        cmd: this.sql
      };
    } else {
      if(this.sql.includes("update")){
        queryObject1 = {
          id: SQLJob.getNewUniqueId(`query`),
          type: this.isPrepared ? `prepare_sql_execute` : `sql`,
          sql: this.transformQuery(this.sql),
          rows: rowsToFetch,
          parameters: this.parameters,
        };
      }
      queryObject = {
        id: SQLJob.getNewUniqueId(`query`),
        type: this.isPrepared ? `prepare_sql_execute` : `sql`,
        sql: this.sql,
        rows: rowsToFetch,
        parameters: this.parameters,
      };
    }
    
    this.rowsToFetch = rowsToFetch;
    let result = await this.job.send1(JSON.stringify(queryObject));
    let resultRows
    if(isUpdate) resultRows = await this.job.send1(JSON.stringify(queryObject1));
    throw new Error(" " + this.transformQuery(this.sql));
    let queryResult: QueryResult<T> = JSON.parse(result);
  
    this.state = queryResult.is_done ? QueryState.RUN_DONE : QueryState.RUN_MORE_DATA_AVAILABLE;

    if (queryResult.success !== true && !this.isCLCommand) {
      this.state = QueryState.ERROR;
      throw new Error(queryResult.error || `Failed to run query (unknown error)`);
    }
    this.correlationId = queryResult.id;
    return queryResult;
  }

  public async fetchMore(rowsToFetch: number = this.rowsToFetch): Promise<QueryResult<T>> {
    //TODO: verify that the SQL job hasn't changed
    switch (this.state) {
      case QueryState.NOT_YET_RUN:
        throw new Error('Statement has not yet been run');
      case QueryState.RUN_DONE:
        throw new Error('Statement has already been fully run');
    }
    let queryObject = {
      id: SQLJob.getNewUniqueId(`fetchMore`),
      cont_id: this.correlationId,
      type: `sqlmore`,
      sql: this.sql,
      rows: rowsToFetch
    };

    this.rowsToFetch = rowsToFetch;
    let result = await this.job.send(JSON.stringify(queryObject));

    let queryResult: QueryResult<T> = JSON.parse(result);
    this.state = queryResult.is_done ? QueryState.RUN_DONE : QueryState.RUN_MORE_DATA_AVAILABLE;

    if (queryResult.success !== true) {
      this.state = QueryState.ERROR;
      throw new Error(queryResult.error || `Failed to run query (unknown error)`);
    }
    return queryResult;
  }

  public async close() {
    if (this.correlationId && this.state !== QueryState.RUN_DONE) {
      this.state = QueryState.RUN_DONE;
      let queryObject = {
        id: SQLJob.getNewUniqueId(`sqlclose`),
        cont_id: this.correlationId,
        type: `sqlclose`,
      };

      return this.job.send(JSON.stringify(queryObject));
    } else if(undefined === this.correlationId) {
      this.state = QueryState.RUN_DONE;
    }
  }

  public getId(): string {
    return this.correlationId;
  }

  public getState(): QueryState {
    return this.state;
  }
}