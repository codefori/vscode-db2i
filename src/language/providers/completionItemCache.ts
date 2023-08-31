import { CompletionItem } from "vscode";
import LRU from "lru-cache";

export let changedCache: Set<string> = new Set<string>();

export interface CompletionItemCacheObj {
  cacheType: "columns" | "all";
  cacheList: CompletionItem[];
}

export default class CompletionItemCache extends LRU<string, CompletionItem[]> {
  constructor() {
    super({
      max: 50,
    });
  }
}
