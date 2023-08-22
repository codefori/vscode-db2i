import { updateCache } from "../language/providers/completionItemCache";
import Document from "../language/sql/document";
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
  private parameters: any[];
  private rowsToFetch: number = 100;
  private isCLCommand: boolean;
  private state: QueryState = QueryState.NOT_YET_RUN;

  constructor(private job: SQLJob, query: string, opts: QueryOptions = {isClCommand: false, parameters: undefined}) {
    this.job = job;
    this.isPrepared = (undefined !== opts.parameters);
    this.parameters = opts.parameters;
    this.sql = query;
    this.isCLCommand = opts.isClCommand;
    Query.globalQueryList.push(this);
  }
  public static byId(id: string) {
    return (undefined === id || '' === id) ? undefined : Query.globalQueryList.find(query => query.correlationId === id);
  }
  public async run(rowsToFetch: number = this.rowsToFetch): Promise<QueryResult<T>> {
    switch (this.state) {
    case QueryState.RUN_MORE_DATA_AVAILABLE:
      throw new Error('Statement has already been run');
    case QueryState.RUN_DONE:
      throw new Error('Statement has already been fully run');
    }
    let queryObject;
    if (this.isCLCommand) {
      queryObject = {
        id: SQLJob.getNewUniqueRequestId(`clcommand`),
        type: `cl`,
        cmd: this.sql
      };
    } else {
      queryObject = {
        id: SQLJob.getNewUniqueRequestId(`query`),
        type: this.isPrepared ? `prepare_sql_execute` : `sql`,
        sql: this.sql,
        rows: rowsToFetch,
        parameters: this.parameters
      };
    }
    this.rowsToFetch = rowsToFetch;
    let result = await this.job.send(JSON.stringify(queryObject));
    let queryResult: QueryResult<T> = JSON.parse(result);

    this.state = queryResult.is_done? QueryState.RUN_DONE: QueryState.RUN_MORE_DATA_AVAILABLE;

    if (queryResult.success !== true && !this.isCLCommand) {
      this.state = QueryState.ERROR;
      throw new Error(queryResult.error || `Failed to run query (unknown error)`);
    }
    this.correlationId = queryResult.id;
    
    if (this.sql.toUpperCase().startsWith("CREATE")) {
      const sqlDoc = new Document(this.sql);
      const currentStatement = sqlDoc.getStatementGroups()[0].statements;
      const refs = currentStatement[0].getObjectReferences();
      for (const ref of refs) {
        updateCache.add(ref.object.schema);
      }
    }
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
      id: SQLJob.getNewUniqueRequestId(`fetchMore`),
      cont_id: this.correlationId,
      type: `sqlmore`,
      sql: this.sql,
      rows: rowsToFetch
    };

    this.rowsToFetch = rowsToFetch;
    let result = await this.job.send(JSON.stringify(queryObject));

    let queryResult: QueryResult<T> = JSON.parse(result);
    this.state = queryResult.is_done? QueryState.RUN_DONE: QueryState.RUN_MORE_DATA_AVAILABLE;

    if (queryResult.success !== true) {
      this.state = QueryState.ERROR;
      throw new Error(queryResult.error || `Failed to run query (unknown error)`);
    }
    return queryResult;
  }
  public async close() {
    this.state = QueryState.RUN_DONE;
  }
  public getId(): string {
    return this.correlationId;
  }
  public getState(): QueryState {
    return this.state;
  }
}