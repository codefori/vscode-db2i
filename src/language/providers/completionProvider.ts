import { CompletionItem, CompletionItemKind, languages } from "vscode";
import { JobManager } from "../../config";
import {
  default as Database,
  SQLType,
  default as Schemas,
} from "../../database/schemas";
import Statement from "../../database/statement";
import Table from "../../database/table";
import Document from "../sql/document";
import * as LanguageStatement from "../sql/statement";
import { CTEReference, ClauseType, ObjectRef, StatementType } from "../sql/types";
import CompletionItemCache, { changedCache } from "./completionItemCache";
import Callable from "../../database/callable";
import { ServerComponent } from "../../connection/serverComponent";
import { env } from "process";

const completionItemCache = new CompletionItemCache();

export interface CompletionType {
  order: string;
  label: string;
  type: SQLType;
  icon: CompletionItemKind;
}

const completionTypes: { [index: string]: CompletionType } = {
  tables: {
    order: `b`,
    label: `table`,
    type: `tables`,
    icon: CompletionItemKind.File,
  },
  views: {
    order: `c`,
    label: `view`,
    type: `views`,
    icon: CompletionItemKind.Interface,
  },
  aliases: {
    order: `d`,
    label: `alias`,
    type: `aliases`,
    icon: CompletionItemKind.Reference,
  },
  functions: {
    order: `e`,
    label: `function`,
    type: `functions`, 
    icon: CompletionItemKind.Method
  }
};

function createCompletionItem(
  name: string,
  kind: CompletionItemKind,
  detail?: string,
  documentation?: string,
  sortText?: string
): CompletionItem {
  const item = new CompletionItem(name, kind);
  item.detail = detail;
  item.documentation = documentation;
  item.sortText = sortText;
  return item;
}

function isEnabled() {
  return (env.DB2I_DISABLE_CA !== `true`);
}

function getParmAttributes(parm: SQLParm): string {
  const lines: string[] = [
    `Column: ${parm.PARAMETER_NAME}`,
    `Type: ${prepareParamType(parm)}`,
    `HAS_DEFAULT: ${parm.DEFAULT || `-`}`,
    `IS_NULLABLE: ${parm.IS_NULLABLE}`,
  ];
  return lines.join(`\n `);
}

function prepareParamType(param: TableColumn | SQLParm): string {
  if (param.CHARACTER_MAXIMUM_LENGTH) {
    return `${param.DATA_TYPE}(${param.CHARACTER_MAXIMUM_LENGTH})`;
  }

  if (param.NUMERIC_PRECISION !== null && param.NUMERIC_SCALE !== null) {
    return `${param.DATA_TYPE}(${param.NUMERIC_PRECISION}, ${param.NUMERIC_SCALE})`;
  }

  return `${param.DATA_TYPE}`;
}


function getColumnAttributes(column: TableColumn): string {
  const lines: string[] = [
    `Column: ${column.COLUMN_NAME}`,
    `Type: ${prepareParamType(column)}`,
    `HAS_DEFAULT: ${column.HAS_DEFAULT}`,
    `IS_IDENTITY: ${column.IS_IDENTITY}`,
    `IS_NULLABLE: ${column.IS_NULLABLE}`,
  ];
  return lines.join(`\n `);
}

function getAllColumns(name: string, schema: string, items: CompletionItem[]) {
  const allCols = createCompletionItem(
    `${name}: All Columns`,
    CompletionItemKind.Enum,
    `All columns for table: ${name}`,
    `Schema: ${schema}`,
    `a@allCols`
  );
  
  allCols.sortText = 'a@allCols';
  allCols.insertText = items.map(item => item.label).join(", ");
  return allCols;
}

async function getObjectColumns(
  schema: string,
  name: string,
  isUDTF = false
): Promise<CompletionItem[]> {

  const databaseObj = (schema + name).toUpperCase();
  const tableUpdate: boolean = changedCache.delete(databaseObj);

  if (!completionItemCache.has(databaseObj) || tableUpdate) {
    schema = Statement.noQuotes(Statement.delimName(schema, true));
    name = Statement.noQuotes(Statement.delimName(name, true));

    let completionItems: CompletionItem[] = [];
    
    if (isUDTF) {
      const resultSet = await Callable.getResultColumns(schema, name);
      
      if (!resultSet?.length ? true : false) {
        completionItemCache.set(databaseObj, []);
        return [];
      }
      
      completionItems = resultSet.map((i) =>
        createCompletionItem(
          Statement.prettyName(i.PARAMETER_NAME),
          CompletionItemKind.Field,
          getParmAttributes(i),
          `Schema: ${schema}\nObject: ${name}\n`,
          `a@objectcolumn`
        )
      );

    } else {
      const columns = await Table.getItems(schema, name);

      if (!columns?.length ? true : false) {
        completionItemCache.set(databaseObj, []);
        return [];
      }

      completionItems = columns.map((i) =>
        createCompletionItem(
          Statement.prettyName(i.COLUMN_NAME),
          CompletionItemKind.Field,
          getColumnAttributes(i),
          `Schema: ${schema}\nTable: ${name}\n`,
          `a@objectcolumn`
        )
      );
    }
    
    const allCols = getAllColumns(name, schema, completionItems);
    completionItems.push(allCols);
    completionItemCache.set(databaseObj, completionItems);
  }
  return completionItemCache.get(databaseObj);
}

/**
 * Gets the completion items for objects in a schema
 */
async function getObjectCompletions(
  forSchema: string,
  sqlTypes: { [index: string]: CompletionType }
): Promise<CompletionItem[]> {
  const schemaUpdate: boolean = changedCache.delete(forSchema.toUpperCase());
  if (!completionItemCache.has(forSchema) || schemaUpdate) {
    const promises = Object.entries(sqlTypes).map(async ([_, value]) => {
      forSchema = Statement.noQuotes(Statement.delimName(forSchema, true));
      const data = await Database.getObjects(forSchema, value.type);
      return data.map((table) =>
        createCompletionItem(
          Statement.prettyName(table.name),
          value.icon,
          `Type: ${value.label}`,
          `Schema: ${table.schema}`,
          value.order
        )
      );
    });

    const results = await Promise.allSettled(promises);
    const list = results
      .filter((result) => result.status == "fulfilled")
      .map((result) => (result as PromiseFulfilledResult<any>).value)
      .flat();
    completionItemCache.set(forSchema, list);
  }
  return completionItemCache.get(forSchema);
}

async function getCompletionItemsForSchema(
  schema: string
): Promise<CompletionItem[]> {
  const data = await Database.getObjects(schema, "procedures");
  return data.map((item) =>
    createCompletionItem(
      item.name,
      CompletionItemKind.Method,
      `Type: Procedure`,
      `Schema: ${item.schema}`
    )
  );
}

async function getProcedures(
  refs: ObjectRef[],
  defaultSchema?: string
): Promise<CompletionItem[]> {
  // Handle the case where refs is empty and defaultSchema is provided
  if (refs.length === 0 && defaultSchema) {
    const sanitizedSchema = Statement.noQuotes(
      Statement.delimName(defaultSchema, true)
    );
    return getCompletionItemsForSchema(sanitizedSchema);
  }

  // Handle the general case
  const promises = refs.map(async (ref) => {
    const schema = ref.object.schema || defaultSchema;
    const sanitizedSchema = Statement.noQuotes(
      Statement.delimName(schema, true)
    );

    return getCompletionItemsForSchema(sanitizedSchema);
  });

  const results = await Promise.allSettled(promises);
  return results
    .filter((result) => result.status === "fulfilled")
    .flatMap(
      (result) => (result as PromiseFulfilledResult<CompletionItem[]>).value
    );
}

async function getCompletionItemsForTriggerDot(
  currentStatement: LanguageStatement.default, // Statement from ../../database/statement
  offset: number,
  trigger: string
): Promise<CompletionItem[]> {
  let list: CompletionItem[] = [];

  const curRef = currentStatement.getReferenceByOffset(offset);
  if (curRef === undefined) {
    return;
  }

  //select * from sample.data as a, sample.
  const curSchema = curRef.object.schema;

  let curRefIdentifier: ObjectRef;

  const objectRefs = currentStatement.getObjectReferences();

  // Set the default schema for all references without one
  for (let ref of objectRefs) {
    if (!ref.object.schema) {
      ref.object.schema = getDefaultSchema();
    }
  }

  curRefIdentifier = objectRefs.find(
    (ref) =>
      ref.alias &&
      ref.object.name &&
      ref.alias.toUpperCase() === curSchema.toUpperCase()
  );

  // grab completion items (column names) if alias and name are defined
  if (curRefIdentifier) {
    // invalid case: select DDD/thecolumn from sample/department as DDD
    if (trigger === "/") {
      return;
    }

    let currentCte: CTEReference;
    // If we're writing a SELECT/WITH, then also make suggestions based on the CTE
    if (currentStatement.type === StatementType.With) {
      const cteList = currentStatement.getCTEReferences();
      currentCte = cteList.find(cte => cte.name.toUpperCase() === curRefIdentifier.object.name.toUpperCase());

      if (currentCte) {
        list.push(...currentCte.columns.map(col => createCompletionItem(
          col,
          CompletionItemKind.Property,
          `CTE: ${currentCte.name}`,
          undefined,
          `a@cte`
        )));
      }
    }

    // Else.. go do a table lookup
    if (!currentCte) {
      const completionItems = await getObjectColumns(
        curRefIdentifier.object.schema,
        curRefIdentifier.object.name,
        curRefIdentifier.isUDTF
      );

      list.push(...completionItems);
    }
  } else {
    

    const objectCompletions = await getObjectCompletions(
      curSchema,
      completionTypes
    );
    list.push(...objectCompletions);
  }

  return list;
}

async function getCachedSchemas() {
  if (completionItemCache.has(`SCHEMAS-FOR-SYSTEM`)) {
    return completionItemCache.get(`SCHEMAS-FOR-SYSTEM`);
  }

  const allSchemas: BasicSQLObject[] = await Schemas.getObjects(
    undefined,
    `schemas`
  );
  const completionItems: CompletionItem[] = allSchemas.map((schema) =>
    createCompletionItem(
      Statement.prettyName(schema.name),
      CompletionItemKind.Module,
      `Type: Schema`,
      `Text: ${schema.text}`
    )
  );

  completionItemCache.set(`SCHEMAS-FOR-SYSTEM`, completionItems);
  return completionItems;
}

function createCompletionItemForAlias(ref: ObjectRef) {
  return createCompletionItem(
    ref.alias,
    CompletionItemKind.Reference,
    "Correlation Name",
    [
      ref.object.schema ? `Schema: ${ref.object.schema}` : undefined,
      ref.object.name ? `Object: ${ref.object.name}` : undefined,
    ]
      .filter(Boolean)
      .join(`\n`),
    "a@alias"
  );
}

async function getCompletionItemsForRefs(currentStatement: LanguageStatement.default, offset: number, cteColumns?: string[]) {
  const objectRefs = currentStatement.getObjectReferences();
  const cteList = currentStatement.getCTEReferences();

  var completionItems: CompletionItem[] = [];

  const curClause = currentStatement.getClauseForOffset(offset);
  const tokenAtOffset = currentStatement.getTokenByOffset(offset);
  let emptyObjectRefs: Boolean = false;

  // Get all the schemas
  if (objectRefs.length === 0 && cteList.length === 0) {
    emptyObjectRefs = true;
    completionItems.push(...(await getCachedSchemas()));
  }

  // Set the default schema for all references without one
  for (let ref of objectRefs) {
    if (!ref.object.schema) {
      ref.object.schema = getDefaultSchema();
    }
  }

  // Fetch all the columns for tables that have references in the statement
  const tableItemPromises = objectRefs.map((ref) =>
    ref.object.name && ref.object.schema
      ? getObjectColumns(ref.object.schema, ref.object.name, ref.isUDTF)
      : Promise.resolve([])
  );
  const results = await Promise.allSettled(tableItemPromises);

  // push table columns if the clause type is unknown
  if (curClause !== ClauseType.From) {
    completionItems.push(
      ...results
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => (result as PromiseFulfilledResult<any>).value)
    );
  }

  if (cteColumns) {
    completionItems.push(
      ...cteColumns.map((col) =>
        createCompletionItem(
          col,
          CompletionItemKind.Field,
          undefined,
          `CTE column`,
          `a@objectcolumn`
        )
      )
    );
  }

  // If there are any locals refs with the `AS` keyword, add that
  const aliasItems = objectRefs
    .filter((ref) => ref.alias)
    .map((ref) => createCompletionItemForAlias(ref));
  completionItems.push(...aliasItems);

  // get completions for objects
  if (tokenAtOffset === undefined && (emptyObjectRefs || curClause !== ClauseType.Unknown)) {
    // get all the completion items for objects in each referenced schema
    completionItems.push(
      ...(await getObjectCompletions(getDefaultSchema(), completionTypes))
    );
  } else {
    // content assist invoked during incomplete reference
    // example: select * from sample.emp
    // --                               |
    const curSchema: string = objectRefs[objectRefs.length - 1].object.schema;
    if (curClause !== ClauseType.Unknown && tokenAtOffset && curSchema) {
      completionItems.push(
        ...(await getObjectCompletions(curSchema, completionTypes))
      );
    }
  }

  // If this is a `WITH` statement, then add the CTE names
  if (currentStatement.type === StatementType.With) {
    // First, let's add all CTE references to the items
    const cteList = currentStatement.getCTEReferences();
    completionItems.push(
      ...cteList.map((cte) =>
        createCompletionItem(cte.name, CompletionItemKind.Interface)
      )
    );

    // If any of those CTEs do not have an alias then show the columns as normal
    for (const cte of cteList) {
      const hasAlias = objectRefs.some(
        (ref) =>
          ref.object.name.toUpperCase() === cte.name.toUpperCase() &&
          ref.alias !== undefined
      );

      if (!hasAlias) {
        completionItems.push(
          ...cte.columns.map((col) =>
            createCompletionItem(
              col,
              CompletionItemKind.Field,
              undefined,
              `Table: ${cte.name}\n`,
              `a@objectcolumn`
            )
          )
        );
      }
    }
  }

  return completionItems;
}

async function getCompletionItems(
  trigger: string,
  currentStatement: LanguageStatement.default|undefined,
  offset?: number
) {
  if (currentStatement && currentStatement.type === StatementType.Call) {
    const curClause = currentStatement.getClauseForOffset(offset);
    if (curClause === ClauseType.Unknown) {
      return getProcedures(currentStatement.getObjectReferences(), getDefaultSchema());
    }
  }

  // Determine if writing a statement inside of a CTE, if they are, set that as the current statement
  let insideCte: CTEReference|undefined;
  if (offset && currentStatement.type === StatementType.With) {
    let ctes = currentStatement.getCTEReferences();
    insideCte = ctes.find(cte => offset >= cte.statement.range.start && offset <= cte.statement.range.end);
    if (insideCte) currentStatement = insideCte.statement;
  }

  // TODO: if they're inside a CTE, then also prompt the expecting columns

  const s = currentStatement ? currentStatement.getTokenByOffset(offset) : null;

  if (trigger === "." || (s && s.type === `dot`) || trigger === "/") {
    return getCompletionItemsForTriggerDot(
      currentStatement,
      offset,
      trigger
    );
  }

  return getCompletionItemsForRefs(currentStatement, offset, insideCte ? insideCte.columns : undefined);
}

export const completionProvider = languages.registerCompletionItemProvider(
  `sql`,
  {
    async provideCompletionItems(document, position, token, context) {
      if (ServerComponent.isInstalled() && isEnabled()) {
        const trigger = context.triggerCharacter;
        const content = document.getText();
        const offset = document.offsetAt(position);

        const sqlDoc = new Document(content);
        const currentStatement = sqlDoc.getStatementByOffset(offset);

        if (currentStatement) {
          return getCompletionItems(trigger, currentStatement, offset);
        }
      }
    },
  },
  `.`,
  "/"
);

const getDefaultSchema = (): string => {
  const currentJob = JobManager.getSelection();
  return currentJob && currentJob.job.options.libraries[0] ? currentJob.job.options.libraries[0] : `QGPL`;
}