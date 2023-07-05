import { SQLJob } from "./sqlJob";
import { QueryResult, ServerResponse } from "./types";

export class Query<T> {
  private static id_ctr: number = 43;
  private correlationId: string;
  private sql: string;
  private isPrepared: boolean = false;
  private hasBeenRunAlready: boolean = false;
  private parameters: any[];
  private rowsToFetch: number = 1000;
  constructor(private job: SQLJob, private query: string, private parms: any[] = undefined) {
    this.job = job;
    this.isPrepared = (undefined !== parms);
    this.parameters = parms;
    this.sql = query;
  }
  public async run(rowsToFetch: number = this.rowsToFetch): Promise<QueryResult<T>> {
    if (this.hasBeenRunAlready) {
      return this.fetchMore(rowsToFetch);
    }
    let queryObject = {
      id: `` + (++Query.id_ctr),
      type: this.isPrepared ? `prepare_sql_execute` : `sql`,
      sql: this.sql,
      rows: rowsToFetch,
      parameters: this.parameters
    };
    this.rowsToFetch = rowsToFetch;
    let result = await this.job.send(JSON.stringify(queryObject));

    let queryResult: QueryResult<T> = JSON.parse(result);

    if (queryResult.success !== true) {
      throw new Error(queryResult.error || `Failed to run query (unknown error)`);
    }
    this.correlationId = queryResult.id;
    return queryResult;
  }
  public async fetchMore(rowsToFetch: number = this.rowsToFetch): Promise<QueryResult<T>> {
    let queryObject = {
      id: `` + (++Query.id_ctr),
      cont_id: this.correlationId,
      type: `sqlmore`,
      sql: this.sql,
      rows: rowsToFetch
    };

    this.rowsToFetch = rowsToFetch;
    let result = await this.job.send(JSON.stringify(queryObject));

    let queryResult: QueryResult<T> = JSON.parse(result);

    if (queryResult.success !== true) {
      throw new Error(queryResult.error || `Failed to run query (unknown error)`);
    }
    return queryResult;
  }

}