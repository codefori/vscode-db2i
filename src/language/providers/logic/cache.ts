import Callable, { CallableRoutine, CallableSignature, CallableType } from "../../../database/callable";
import Schemas, { PageData, SQLType } from "../../../database/schemas";
import Table from "../../../database/table";

export class DbCache {
  private static parmCache: Map<string, SQLParm[]> = new Map();
  private static tableColumns: Map<string, TableColumn[]> = new Map();
  private static schemaObjects: Map<string, BasicSQLObject[]> = new Map();
  private static callables: Map<string, CallableRoutine|false> = new Map();
  private static callableSignatures: Map<string, CallableSignature[]> = new Map();

  private static toReset: string[] = [];

  // TODO: call on connect
  static async resetCache() {
    this.parmCache.clear();
    this.tableColumns.clear();
    this.schemaObjects.clear();
    this.toReset = [];
  }

  static resetObject(name: string) {
    this.toReset.push(name.toLowerCase());
  }

  private static shouldReset(name: string) {
    const inx = this.toReset.indexOf(name);

    if (inx > -1) {
      this.toReset.splice(inx, 1);
      return true;
    }

    return false;
  }

  static async getResultColumns(schema: string, name: string, resolveName?: boolean) {
    const key = getKey(`routine`, schema, name);
    
    if (!this.parmCache.has(key) || this.shouldReset(name)) {
      const result = await Callable.getResultColumns(schema, name, resolveName);
      if (result) {
        this.parmCache.set(key, result);
      }
    }

    return this.parmCache.get(key) || [];
  }

  static async getItems(schema: string, name: string) {
    const key = getKey(`columns`, schema, name);
    
    if (!this.parmCache.has(key) || this.shouldReset(name)) {
      const result = await Table.getItems(schema, name);
      if (result) {
        this.tableColumns.set(key, result);
      }
    }

    return this.tableColumns.get(key) || [];
  }

  static async getObjects(schema: string, types: SQLType[], details?: PageData) {
    const key = getKey(`objects`, schema, types.join(`&`));
    
    if (!this.schemaObjects.has(key) || this.shouldReset(schema)) {
      const result = await Schemas.getObjects(schema, types, details);
      if (result) {
        this.schemaObjects.set(key, result);
      }
    }

    return this.schemaObjects.get(key) || [];
  }

  static async getType(schema: string, name: string, type: CallableType) {
    const key = getKey(type, schema, name);
    
    if (!this.callables.has(key) || this.shouldReset(name)) {
      const result = await Callable.getType(schema, name, type);
      if (result) {
        this.callables.set(key, result);
      } else {
        this.callables.set(key, false);
        return false;
      }
    }

    return this.callables.get(key) || undefined;
  }

  static getCachedType(schema: string, name: string, type: CallableType) {
    const key = getKey(type, schema, name);
    return this.callables.get(key) || undefined
  }

  static async getSignaturesFor(schema: string, name: string, specificNames: string[]) {
    const key = getKey(`signatures`, schema, name);
    
    if (!this.callableSignatures.has(key) || this.shouldReset(name)) {
      const result = await Callable.getSignaturesFor(schema, specificNames);
      if (result) {
        this.callableSignatures.set(key, result);
      }
    }

    return this.callableSignatures.get(key) || [];
  }

  static getCachedSignatures(schema: string, name: string) {
    const key = getKey(`signatures`, schema, name);
    return this.callableSignatures.get(key) || [];
  }
}

function getKey(type: string, schema: string, name: string = `all`) {
  return `${type}.${schema}.${name}`.toLowerCase();
}