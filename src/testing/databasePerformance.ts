import { CompletionItemKind } from "vscode";
import { TestSuite } from ".";
import Database from "../database/schemas";
import Statement from "../database/statement";
import {
  CompletionType
} from "../language/providers/completionProvider";

const performance = require(`perf_hooks`).performance;
const forSchema = Statement.noQuotes(
  Statement.delimName(`sample`, true)
);
const sqlTypes: { [index: string]: CompletionType } = {
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
    icon: CompletionItemKind.Method,
  },
};


export const DatabasePerformanceSuite: TestSuite = {
  name: `Database object query performance tests`,
  tests: [
    {
      name: `time async get objects`,
      test: async () => {
        const start = performance.now();
        const promises = Object.entries(sqlTypes).map(async ([_, value]) => {
          const data = await Database.getObjects(forSchema, [value.type]);
        });
        const results = await Promise.allSettled(promises);
        const end = performance.now();
        console.log(`time get objects: ${end - start}ms`);
      },
    },
    {
      name: `time one shot get objects`,
      test: async () => {
        const start = performance.now();
        const data = await Database.getObjects(forSchema, [
          `tables`,
          `views`,
          `aliases`,
          `functions`,
        ]);
        const end = performance.now();
        console.log(`time get objects: ${end - start}ms`);
      },
    }
  ],
};
