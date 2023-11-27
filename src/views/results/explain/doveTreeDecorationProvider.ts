import { window, Event, EventEmitter, TreeItem, ThemeColor, FileDecorationProvider, FileDecoration, Uri, Disposable } from "vscode";

/**
 * The Uri scheme for VE node highlights
 */
const uriScheme = "db2i.dove";

interface Highlight {
    uri: Uri,
    color: ThemeColor
}

/**
 * @param uriPath the Uri path that identifies the highlight.  The scheme will always be {@link uriScheme}
 * @param themeColor defined in {@file package.json}
 * @returns an instance of {@link Highlight}
 */
function newHighlight(uriPath: string, themeColor: string): Highlight {
    return {
        uri:   Uri.parse(uriScheme + ":" + uriPath, false),
        color: new ThemeColor(themeColor)
    }
};

export const TreeNodeHighlights: { [uriPath: string]: Highlight } = {
    "index_advised":            newHighlight("index_advised",            "db2i.dove.resultsView.HighlightIndexAdvised"),
    "actual_expensive_rows":    newHighlight("actual_expensive_rows",    "db2i.dove.resultsView.HighlightActualExpensiveRows"),
    "estimated_expensive_rows": newHighlight("estimated_expensive_rows", "db2i.dove.resultsView.HighlightEstimatedExpensiveRows"),
    "estimated_expensive_time": newHighlight("estimated_expensive_time", "db2i.dove.resultsView.HighlightEstimatedExpensiveTime"),
    // Lookahead Predicate Generation (LPG)
    "lpg":                      newHighlight("lpg",                      "db2i.dove.resultsView.HighlightLPG"),
    "mqt":                      newHighlight("mqt",                      "db2i.dove.resultsView.HighlightMQT"),
    // Note: refreshed node would only ever be used if mode were Explain While Running
    "refreshed_node":           newHighlight("refreshed_node",           "db2i.dove.resultsView.HighlightRefreshedNode"),
    "attribute_heading":        newHighlight("attribute_heading",        "db2i.dove.nodeView.AttributeSectionHeading")
  }
  
  export class DoveTreeDecorationProvider implements FileDecorationProvider {
    private disposables: Array<Disposable> = [];

    readonly _onDidChangeFileDecorations: EventEmitter<Uri | Uri[]> = new EventEmitter<Uri | Uri[]>();
    readonly onDidChangeFileDecorations: Event<Uri | Uri[]> = this._onDidChangeFileDecorations.event;

    constructor() {
        this.disposables = [];
        this.disposables.push(window.registerFileDecorationProvider(this));
    }

    async updateTreeItems(treeItem: TreeItem): Promise<void> {
        this._onDidChangeFileDecorations.fire(treeItem.resourceUri);
    }

    async provideFileDecoration(uri: Uri): Promise<FileDecoration | undefined> {
        if (uri?.scheme === uriScheme) {
            let color: ThemeColor = TreeNodeHighlights[uri.fsPath]?.color;
            if (color) {
                return {
                    color: color,
                    // badge: "⇐",
                    // tooltip: ""
                }
            }
        }
        return null;
    }

    dispose() {
        this.disposables.forEach((d) => d.dispose());
    }
}