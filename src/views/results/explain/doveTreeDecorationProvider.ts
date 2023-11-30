import { window, Event, EventEmitter, TreeItem, ThemeColor, FileDecorationProvider, FileDecoration, Uri, Disposable } from "vscode";
import { NodeHighlights, Highlighting } from "./nodes";

/**
 * The Uri scheme for VE node highlights
 */
const doveUriScheme = "db2i.dove";

/**
 * Generates a {@link DoveTreeDecorationProvider} compatible Uri. The Uri scheme is set to {@link doveUriScheme}.
 */
export function toDoveTreeDecorationProviderUri(highlights: NodeHighlights): Uri {
    return highlights.formatValue != 0 ? Uri.parse(doveUriScheme + ":" + highlights.formatValue, false) : null;
}

/**
 * Provides tree node decorations specific to Db2 for i Visual Explain.
 */
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

    /**
     * @inheritdoc
     * Provides tree node decorations specific to Db2 for i Visual Explain.
     */
    async provideFileDecoration(uri: Uri): Promise<FileDecoration | undefined> {
        // Only decorate tree items tagged with the VE scheme
        if (uri?.scheme === doveUriScheme) {
            // The Uri path should simply be a number that represents the highlight attributes
            const value: number = Number(uri.fsPath);
            if (!isNaN(value) && value > 0) {
                const nodeHighlights = new NodeHighlights(value);
                let color: ThemeColor;
                let badge: string;
                let tooltip: string;
                // For attribute section headings, only the color needs to be applied, which is not controlled by the highlight preferences
                if (nodeHighlights.isSet(Highlighting.ATTRIBUTE_SECTION_HEADING)) {
                    color = Highlighting.Colors[Highlighting.ATTRIBUTE_SECTION_HEADING];
                } else {
                    color = nodeHighlights.getPriorityColor();
                    badge = String(nodeHighlights.getCount()); // The number of highlights set for the node
                    tooltip = "\n" + nodeHighlights.getNames().map(h => "🔥 " + Highlighting.Descriptions[Highlighting[h]]).join("\n");
                }
                return {
                    color: color,
                    badge: badge,
                    tooltip: tooltip,
                }
            }
        }
        return null;
    }

    dispose() {
        this.disposables.forEach((d) => d.dispose());
    }
}