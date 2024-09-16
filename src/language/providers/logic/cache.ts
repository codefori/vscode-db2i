import Callable, { CallableRoutine, CallableSignature, CallableType } from "../../../database/callable";
import Schemas, { PageData, SQLType } from "../../../database/schemas";
import Table from "../../../database/table";

interface RoutineDetail {
  routine: CallableRoutine;
  signatures: CallableSignature[];
}

export class DbCache {
  private static schemaObjects: Map<string, BasicSQLObject[]> = new Map();
  private static routineResultColumns: Map<string, SQLParm[]> = new Map();
  private static objectColumns: Map<string, TableColumn[]> = new Map();
  private static routines: Map<string, CallableRoutine|false> = new Map();
  private static routineSignatures: Map<string, CallableSignature[]> = new Map();

  private static toReset: string[] = [];

  static async resetCache() {
    this.routineResultColumns.clear();
    this.objectColumns.clear();
    this.schemaObjects.clear();
    this.toReset = [];
  }

  static resetObject(name: string) {
    this.toReset.push(name.toLowerCase());
  }

  private static shouldReset(name: string) {
    const inx = this.toReset.indexOf(name.toLowerCase());

    if (inx > -1) {
      this.toReset.splice(inx, 1);
      return true;
    }

    return false;
  }

  static lookupSymbol(name: string, schema: string) {
    const routine = this.getCachedType(name, schema, `FUNCTION`) || this.getCachedType(name, schema, `PROCEDURE`);
    if (routine) {
      const signatures = this.getCachedSignatures(schema, name);
      return { routine, signatures } as RoutineDetail;
    }

    // Search objects
    for (const currentSchema of this.schemaObjects.values()) {
      const chosenObject = currentSchema.find(column => column.name === name && column.schema === schema);
      if (chosenObject) {
        return chosenObject;
      }
    }

    // Lookup by column

    // First object columns
    for (const currentObject of this.objectColumns.values()) {
      const chosenColumn = currentObject.find(column => column.COLUMN_NAME.toLowerCase() === name.toLowerCase());
      if (chosenColumn) {
        return chosenColumn;
      }
    }

    // Then by routine result columns
    for (const currentRoutine of this.routineResultColumns.values()) {
      const chosenColumn = currentRoutine.find(column => column.PARAMETER_NAME.toLowerCase() === name.toLowerCase());
      if (chosenColumn) {
        return chosenColumn;
      }
    }
  }

  static async getRoutineResultColumns(schema: string, name: string, resolveName?: boolean) {
    const key = getKey(`routine`, schema, name);
    
    if (!this.routineResultColumns.has(key) || this.shouldReset(name)) {
      const result = await Callable.getResultColumns(schema, name, resolveName);
      if (result) {
        this.routineResultColumns.set(key, result);
      }
    }

    return this.routineResultColumns.get(key) || [];
  }

  static async getColumns(schema: string, name: string) {
    const key = getKey(`columns`, schema, name);
    
    if (!this.routineResultColumns.has(key) || this.shouldReset(name)) {
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