import Callable, { CallableRoutine, CallableSignature, CallableType } from "../../../database/callable";
import Schemas, { PageData, SQLType } from "../../../database/schemas";
import Table from "../../../database/table";

interface RoutineDetail {
  routine: CallableRoutine;
  signatures: CallableSignature[];
}

export type LookupResult = RoutineDetail | SQLParm | BasicSQLObject | TableColumn;

export class DbCache {
  private static schemaObjects: Map<string, BasicSQLObject[]> = new Map();
  private static objectColumns: Map<string, TableColumn[]> = new Map();
  private static routines: Map<string, CallableRoutine|false> = new Map();
  private static routineSignatures: Map<string, CallableSignature[]> = new Map();

  private static toReset: string[] = [];

  static async resetCache() {
    this.objectColumns.clear();
    this.schemaObjects.clear();
    this.toReset = [];
  }

  static resetObject(name: string) {
    this.toReset.push(name.toLowerCase());
  }

  private static shouldReset(name?: string) {
    if (name) {
      const inx = this.toReset.indexOf(name.toLowerCase());

      if (inx > -1) {
        this.toReset.splice(inx, 1);
        return true;
      }
    }

    return false;
  }

  static lookupSymbol(name: string, schema: string, objectFilter: string[]): LookupResult {
    const routine = this.getCachedType(schema, name, `FUNCTION`) || this.getCachedType(schema, name, `PROCEDURE`);
    if (routine) {
      const signatures = this.getCachedSignatures(schema, name);
      return { routine, signatures } as RoutineDetail;
    }

    objectFilter = objectFilter.map(o => o.toLowerCase());

    const included = (name: string) => {
      if (objectFilter) {
        return objectFilter.includes(name.toLowerCase());
      }
      return true;
    }

    // Search objects
    for (const currentSchema of this.schemaObjects.values()) {
      const chosenObject = currentSchema.find(sqlObject => included(sqlObject.name) && sqlObject.name === name && sqlObject.schema === schema);
      if (chosenObject) {
        return chosenObject;
      }
    }

    // Lookup by column

    // First object columns
    for (const currentObject of this.objectColumns.values()) {
      const chosenColumn = currentObject.find(column => included(column.TABLE_NAME) && column.COLUMN_NAME.toLowerCase() === name.toLowerCase());
      if (chosenColumn) {
        return chosenColumn;
      }
    }

    // Then by routine result columns
    for (const currentRoutineSig of this.routineSignatures.values()) {
      for (const signature of currentRoutineSig) {
        const chosenColumn = signature.returns.find(column => column.PARAMETER_NAME.toLowerCase() === name.toLowerCase());
        if (chosenColumn) {
          return chosenColumn;
        }
      }
    }
  }

  static async getObjectColumns(schema: string, name: string) {
    const key = getKey(`columns`, schema, name);
    
    if (!this.objectColumns.has(key) || this.shouldReset(name)) {
      const result = await Table.getItems(schema, name);
      if (result) {
        this.objectColumns.set(key, result);
      }
    }

    return this.objectColumns.get(key) || [];
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
    
    if (!this.routines.has(key) || this.shouldReset(name)) {
      const result = await Callable.getType(schema, name, type);
      if (result) {
        this.routines.set(key, result);
      } else {
        this.routines.set(key, false);
        return false;
      }
    }

    return this.routines.get(key) || undefined;
  }

  static getCachedType(schema: string, name: string, type: CallableType) {
    const key = getKey(type, schema, name);
    return this.routines.get(key) || undefined
  }

  static async getSignaturesFor(schema: string, name: string, specificNames: string[]) {
    const key = getKey(`signatures`, schema, name);
    
    if (!this.routineSignatures.has(key) || this.shouldReset(name)) {
      const result = await Callable.getSignaturesFor(schema, specificNames);
      if (result) {
        this.routineSignatures.set(key, result);
      }
    }

    return this.routineSignatures.get(key) || [];
  }

  static getCachedSignatures(schema: string, name: string) {
    const key = getKey(`signatures`, schema, name);
    return this.routineSignatures.get(key) || [];
  }
}

function getKey(type: string, schema: string, name: string = `all`) {
  return `${type}.${schema}.${name}`.toLowerCase();
}