import { callbackify } from "util";
import { CancellationToken, Event, EventEmitter, ProviderResult, TreeDataProvider, TreeItem } from "vscode";
import { SelfCodeNode } from "./nodes";

type ChangeTreeDataEventType = SelfCodeTreeItem | undefined | null | void;

export class selfCodesResultsView implements TreeDataProvider<any> {
    private _onDidChangeTreeData: EventEmitter<ChangeTreeDataEventType> = new EventEmitter<ChangeTreeDataEventType>();
    readonly onDidChangeTreeData: Event<ChangeTreeDataEventType> = this._onDidChangeTreeData.event;
    
    getTreeItem(element: any): TreeItem | Thenable<TreeItem> {
        throw new Error("Method not implemented.");
    }
    getChildren(element?: any): ProviderResult<any[]> {
        throw new Error("Method not implemented.");
    }
    getParent?(element: any) {
        throw new Error("Method not implemented.");
    }
    resolveTreeItem?(item: TreeItem, element: any, token: CancellationToken): ProviderResult<TreeItem> {
        throw new Error("Method not implemented.");
    }
    
}


export class SelfCodeTreeItem extends TreeItem {
    selfCodeNode: SelfCodeNode;
    
}