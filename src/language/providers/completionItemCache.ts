import { CompletionItem } from "vscode";
import LRU from "lru-cache";
import { QualifiedObject } from "../sql/types";

export let changedCache: Set<string> = new Set<string>();

export interface CompletionItemCacheObj {
  cacheType: "columns" | "all";
  cacheList: CompletionItem[];
}

export default class CompletionItemCache extends LRU {
  constructor() {
    super({
      max: 50,
    });
  }
}

export function toKey(context: string, sqlObj: QualifiedObject|string) {
  return `${context}-` + (typeof sqlObj === `string` ? sqlObj : `${sqlObj.schema}.${sqlObj.name}`).toUpperCase();
}