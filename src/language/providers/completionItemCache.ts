import { CompletionItem } from "vscode";
import LRU from "lru-cache";

export abstract class UpdateCache {
  static hasCreateBeenCalled: boolean = false;

  static getStatus(): boolean {
    return UpdateCache.hasCreateBeenCalled;
  }
  static update(seen: boolean) {
    UpdateCache.hasCreateBeenCalled = seen;
  }
}

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
