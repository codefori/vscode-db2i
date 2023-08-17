import { CompletionItem } from "vscode";
import LRU from "lru-cache";

export abstract class UpdateCache {
  static schemas: Set<string> = new Set();

  static add(schema: string) {
    if (!this.schemas.has(schema)) {
      this.schemas.add(schema);
    }
  }

  static checkUpdateCache(schema: string): boolean {
    if (this.schemas.has(schema)) {
      this.schemas.delete(schema);
      return true;
    }
    return false;
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
