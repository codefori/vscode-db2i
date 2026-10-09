import { CompletionItem, CompletionItemKind, languages } from "vscode";
import { JobManager } from "../../config";
import { CallableType } from "../../database/callable";
import {
  SQLType,
} from "../../database/schemas";
import Statement from "../../database/statement";
import { BasicSQLObject, TableColumn } from "../../types";
import Document from "../sql/document";
import * as LanguageStatement from "../sql/statement";
import { CTEReference, ClauseType, ObjectRef, StatementType } from "../sql/types";
import { localAssistIsEnabled, remoteAssistIsEnabled, useSystemNames } from "./logic/available";
import { DbCache } from "./logic/cache";
import { getCallableParameters, isCallableType } from "./logic/callable";
import { createCompletionItem, getParmAttributes, prepareParamType } from "./logic/completion";
import { getSqlDocument } from "./logic/parse";

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
  logicals: {
    order: `e`,
    label: `logical`,
    type: `logicals`,
    icon: CompletionItemKind.Interface,
  },
  functions: {
    order: `f`,
    label: `function`,
    type: `functions`,
    icon: CompletionItemKind.Method
  },
  variables: {
    order: `g`,
    label: `variable`,
    type: `variables`,
    icon: CompletionItemKind.Variable,
  }
};



function getColumnAttributes(column: TableColumn, useSystemName: boolean): string {
  const shownName = useSystemName ? column.SYSTEM_COLUMN_NAME : column.COLUMN_NAME;
  const alternateName = useSystemName ? column.COLUMN_NAME : column.SYSTEM_COLUMN_NAME;
  const lines: string[] = [
    `Column: ${shownName}`,
    `${useSystemName ? `SQL name` : `System name`}: ${alternateName}`,
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
  isUDTF: boolean,
  useSystemNamesInColumn: boolean,
): Promise<CompletionItem[]> {

  let completionItems: CompletionItem[];

  schema = Statement.noQuotes(Statement.delimName(schema, true));
  name = Statement.noQuotes(Statement.delimName(name, true));

  if (isUDTF) {
    const resultSet = await DbCache.getCachedSignatures(schema, name);

    if (!resultSet?.length ? true : false) {
      return [];
    }

    const chosenSig = resultSet[resultSet.length - 1];

    completionItems = chosenSig.returns.map((i) =>
      createCompletionItem(
        Statement.prettyName(i.PARAMETER_NAME),
        CompletionItemKind.Field,
        getParmAttributes(i),
        `Schema: ${schema}\nObject: ${name}\n`,
        `a@objectcolumn`
      )
    );

  } else {
    const columns = await DbCache.getObjectColumns(schema, name);

    if (!columns?.length ? true : false) {
      return [];
    }

    completionItems = columns.map((i) =>
      createCompletionItem(
        Statement.prettyName(useSystemNamesInColumn ? i.SYSTEM_COLUMN_NAME : i.COLUMN_NAME),
        CompletionItemKind.Field,
        getColumnAttributes(i, useSystemNamesInColumn),
        `Schema: ${schema}\nTable: ${name}\n`,
        `a@objectcolumn`
      )
    );
  }

  const allCols = getAllColumns(name, schema, completionItems);
  completionItems.push(allCols);

  return completionItems;
}

/**
 * Gets the completion items for objects in a schema
 */
async function getObjectCompletions(
  forSchema: string,
  sqlTypes: { [index: string]: CompletionType }
): Promise<CompletionItem[]> {
  forSchema = Statement.noQuotes(Statement.delimName(forSchema, true));
  const allObjects = await DbCache.getObjects(forSchema, Object.values(sqlTypes).map(k => k.type), { excludeSourceFiles: true });

  return allObjects.map((value) => {
    const completionData = completionTypes[value.type];
    return createCompletionItem(
      Statement.prettyName(value.name),
      completionData.icon,
      completionData.label,
      `Schema: ${value.schema}`,
      completionData.order
    )
  }
  );
}

// Unqualified references resolve to the first schema that has the object, like the library list
async function getColumnsForRef(ref: ObjectRef, searchSchemas: string[]): Promise<CompletionItem[]> {
  if (!ref.object.name) {
    return [];
  }

  for (const schema of ref.object.schema ? [ref.object.schema] : searchSchemas) {
    const columns = await getObjectColumns(schema, ref.object.name, ref.isUDTF === true, useSystemNames());
    if (columns.length > 0) {
      return columns;
    }
  }

  return [];
}

async function getObjectCompletionsForSchemas(
  schemas: string[],
  sqlTypes: { [index: string]: CompletionType }
): Promise<CompletionItem[]> {
  const results = await Promise.all(schemas.map(schema => getObjectCompletions(schema, sqlTypes)));

  // When an object exists in many schemas, only the first one would be used
  return results
    .flat()
    .filter((item, i, all) => all.findIndex(other => other.label === item.label && other.kind === item.kind) === i);
}

async function getCompletionItemsForSchema(
  schema: string
): Promise<CompletionItem[]> {
  const data = await DbCache.getObjects(schema, ["procedures"]);

  return data
    .filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i) //Hide overloads here
    .map((item) =>
      createCompletionItem(
        Statement.prettyName(item.name),
        CompletionItemKind.Method,
        `Procedure`,
        `Schema: ${item.schema}`
      )
    );
}

async function getProcedures(
  refs: ObjectRef[],
  searchSchemas: string[]
): Promise<CompletionItem[]> {
  const schemas = refs.length === 0
    ? searchSchemas
    : refs.flatMap((ref) => ref.object.schema ? [ref.object.schema] : searchSchemas);

  const promises = schemas
    .filter((schema, i, all) => all.indexOf(schema) === i)
    .map(async (schema) => {
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
  trigger: string | undefined
): Promise<CompletionItem[]> {
  const searchSchemas = await getSearchSchemas();
  let list: CompletionItem[] = [];

  const curRef = currentStatement.getReferenceByOffset(offset);
  if (curRef === undefined) {
    return [];
  }

  //select * from sample.data as a, sample.
  const curSchema = curRef.object.schema || '';

  let curRefIdentifier: ObjectRef | undefined;

  const objectRefs = currentStatement.getObjectReferences();

  curRefIdentifier = objectRefs.find(
    (ref) =>
      ref.alias &&
      ref.object.name &&
      ref.alias.toUpperCase() === curSchema?.toUpperCase()
  );

  // grab completion items (column names) if alias and name are defined
  if (curRefIdentifier?.object.name) {
    // invalid case: select DDD/thecolumn from sample/department as DDD
    if (trigger === "/") {
      return [];
    }

    let currentCte: CTEReference | undefined;
    // If we're writing a SELECT/WITH, then also make suggestions based on the CTE
    if (currentStatement.type === StatementType.With) {
      const cteList = currentStatement.getCTEReferences();
      currentCte = cteList.find(cte => cte.name.toUpperCase() === curRefIdentifier.object.name?.toUpperCase());

      if (currentCte) {
        list.push(...currentCte.columns.map(col => createCompletionItem(
          col,
          CompletionItemKind.Property,
          `CTE: ${currentCte?.name}`,
          undefined,
          `a@cte`
        )));
      }
    }

    // Else.. go do a table lookup
    if (!currentCte) {
      const completionItems = await getColumnsForRef(curRefIdentifier, searchSchemas);

      list.push(...completionItems);
    }
  } else {

    if (currentStatement.type === StatementType.Call) {
      const procs = await getProcedures([curRef], searchSchemas);
      list.push(...procs);

    } else {
      const objectCompletions = await getObjectCompletions(
        curSchema,
        completionTypes
      );
      list.push(...objectCompletions);
    }
  }

  return list;
}

async function getCachedSchemas() {
  const allSchemas: BasicSQLObject[] = await DbCache.getObjects(
    '',
    [`schemas`]
  );
  const completionItems: CompletionItem[] = allSchemas.map((schema) =>
    createCompletionItem(
      Statement.prettyName(schema.name),
      CompletionItemKind.Module,
      `Schema`,
      `Text: ${schema.text}`
    )
  );

  return completionItems;
}

function createCompletionItemForAlias(ref: ObjectRef) {
  return createCompletionItem(
    ref.alias || '',
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
  const searchSchemas = await getSearchSchemas();
  const objectRefs = currentStatement.getObjectReferences();
  const cteList = currentStatement.getCTEReferences();

  var completionItems: CompletionItem[] = [];

  const curClause = currentStatement.getClauseForOffset(offset);
  const tokenAtOffset = currentStatement.getTokenByOffset(offset);

  // Get all the schemas
  if (objectRefs.length === 0 && cteList.length === 0) {
    completionItems.push(...(await getCachedSchemas()));
  }

  // Fetch all the columns for tables that have references in the statement
  const tableItemPromises = objectRefs.map((ref) => getColumnsForRef(ref, searchSchemas));
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
  if (tokenAtOffset === undefined && (curClause !== ClauseType.Unknown)) {
    // get all the completion items for objects in each referenced schema
    completionItems.push(
      ...(await getObjectCompletionsForSchemas(searchSchemas, completionTypes))
    );
  } else {
    // content assist invoked during incomplete reference
    // example: select * from sample.emp
    // --                               |
    const lastRef = objectRefs[objectRefs.length - 1];
    if (lastRef && curClause !== ClauseType.Unknown && tokenAtOffset) {
      const schemas = lastRef.object.schema ? [lastRef.object.schema] : searchSchemas;
      completionItems.push(
        ...(await getObjectCompletionsForSchemas(schemas, completionTypes))
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
          ref.object?.name?.toUpperCase() === cte.name.toUpperCase() &&
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
  trigger: string | undefined,
  currentStatement: LanguageStatement.default,
  offset: number
) {
  const searchSchemas = await getSearchSchemas();
  const s = currentStatement.getTokenByOffset(offset) || null;

  if (trigger === "." || (s && s.type === `dot`) || trigger === "/") {
    return getCompletionItemsForTriggerDot(
      currentStatement,
      offset,
      trigger
    );
  }

  const callableRef = currentStatement.getCallableDetail(offset, true);
  // TODO: check the function actually exists before returning
  if (callableRef) {
    const routineType: CallableType = currentStatement.type === StatementType.Call ? `PROCEDURE` : `FUNCTION`;
    const isValid = await isCallableType(callableRef.parentRef, routineType);
    if (isValid) {
      return await getCallableParameters(callableRef, offset);
    }
  }

  if (currentStatement && currentStatement.type === StatementType.Call) {
    const curClause = currentStatement.getClauseForOffset(offset);
    if (curClause === ClauseType.Unknown) {
      return getProcedures(currentStatement.getObjectReferences(), searchSchemas);
    }
  }

  // Determine if writing a statement inside of a CTE, if they are, set that as the current statement
  let insideCte: CTEReference | undefined;
  if (offset && currentStatement.type === StatementType.With) {
    let ctes = currentStatement.getCTEReferences();
    insideCte = ctes.find(cte => offset >= cte.statement.range.start && offset <= cte.statement.range.end);
    if (insideCte) currentStatement = insideCte.statement;
  }

  // TODO: if they're inside a CTE, then also prompt the expecting columns

  return getCompletionItemsForRefs(currentStatement, offset, insideCte ? insideCte.columns : undefined);
}

const VALID_CREATE_TYPES = [`procedure`, `function`]

function getCompletionItemKindFromSqlType(sqlType: string = `any`) {
  switch (sqlType.toLowerCase()) {
    case `schema`:
      return CompletionItemKind.Folder;
    case `table`:
      return CompletionItemKind.File;
    case `view`:
      return CompletionItemKind.Interface;
    case `alias`:
      return CompletionItemKind.Reference;
    case `procedure`:
      return CompletionItemKind.Method;
    case `function`:
      return CompletionItemKind.Function;
    case `cursor`:
      return CompletionItemKind.File;
    default:
      return CompletionItemKind.Variable;
  }
}

/**
 * Returns completion items based solely on an SQL document
 * @param sqlDoc
 */
function getLocalDefs(sqlDoc: Document, offset: number) {
  const groups = sqlDoc.getStatementGroups();

  let items: CompletionItem[] = [];


  groups.forEach((group) => {
    const groupStatements = group.statements;
    const statement = group.statements[0];
    const inGroupRange = offset >= group.range.start && offset <= group.range.end;

    if (groupStatements.length === 1) {
      switch (statement.type) {
        case StatementType.With:
          if (inGroupRange) {
            const ctes = statement.getCTEReferences();
            items.push(...ctes.map(cte => createCompletionItem(cte.name, CompletionItemKind.Interface)));
          }
          break;

        case StatementType.Create:
          const [currentCreate] = statement.getObjectReferences();
          if (currentCreate) {
            items.push(createCompletionItem(currentCreate.object.schema ? `${currentCreate.object.schema}.${currentCreate.object.name}` : currentCreate.object.name || '', getCompletionItemKindFromSqlType(currentCreate.createType), `Local ${currentCreate.createType || `creation`}`));
          }
          break;
      }

    } else if (groupStatements.length > 1) {
      // Usually means statements that have a body

      // We only care about create statements when there is a body
      if (statement.type === StatementType.Create) {
        const [groupDef] = statement.getObjectReferences();

        // We only care about certain create types
        if (groupDef) {
          const currentType = groupDef.createType?.toLowerCase();
          if (groupDef.createType && currentType && VALID_CREATE_TYPES.includes(currentType) && groupDef.object.name) {
            items.push(createCompletionItem(groupDef.object.schema ? `${groupDef.object.schema}.${groupDef.object.name}` : groupDef.object.name, getCompletionItemKindFromSqlType(groupDef.createType), `Local ${currentType}`));
          }
        }

        // When our cursor is in the current statement..
        if (inGroupRange) {
          // Show parameters to the routine
          const localParams = statement.getRoutineParameters();
          items.push(...localParams.map(param => createCompletionItem(param.alias || '', CompletionItemKind.Property, param.createType)));

          // Show all the local definitions
          for (let i = 1; i < groupStatements.length; i++) {
            const subStatement = groupStatements[i];
            if (subStatement.type === StatementType.Declare) {
              const [def] = subStatement.getObjectReferences();
              if (def.object.name) {
                items.push(createCompletionItem(def.object.name, CompletionItemKind.Variable, def.createType));
              }
            }
          }
        }
      }
    }
  });

  return items;
}

export const completionProvider = languages.registerCompletionItemProvider(
  `sql`,
  {
    async provideCompletionItems(document, position, token, context) {
      if (localAssistIsEnabled()) {
        const trigger = context.triggerCharacter;
        const offset = document.offsetAt(position);

        const sqlDoc = getSqlDocument(document);

        if (!sqlDoc) return;

        const currentStatement = sqlDoc.getStatementByOffset(offset);

        const allItems: CompletionItem[] = [];

        if (trigger !== `.`) {
          allItems.push(...getLocalDefs(sqlDoc, offset))
        }

        if (remoteAssistIsEnabled(false) && currentStatement) {
          allItems.push(...await getCompletionItems(trigger, currentStatement, offset))
        }

        return allItems;
      }
    },
  },
  `.`,
  "/"
);

const getSearchSchemas = () => {
  const currentJob = JobManager.getSelection();
  if (currentJob) {
    return currentJob.job.getSearchSchemas()
  } else {
    return Promise.resolve([`QGPL`]);
  }
}