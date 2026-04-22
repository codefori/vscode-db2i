import { Disposable, Webview, WebviewPanel, window, Uri, ViewColumn, commands, workspace, ProgressLocation, Range, TextEditorRevealType, Selection, ExtensionContext } from "vscode";
import { InitialState, WebviewRequestMessageBase, WebviewRequestTypes, NodeSelectedRequest } from "./types";
import { DoveNodeView } from "../explain/doveNodeView";
import { ExplainNode } from "../explain/nodes";

export class VisualExplainPanel {
    private static webRoot: Uri;
    public static currentPanel: VisualExplainPanel | undefined;
    private readonly panel: WebviewPanel;
    private disposables: Disposable[] = [];
    private static doveNodeView: DoveNodeView | undefined;
    private static explainTree: Map<number, ExplainNode> | undefined;

    private constructor(panel: WebviewPanel, initialState: InitialState) {
        this.panel = panel;
        this.panel.webview.html = this.getWebviewContent(this.panel.webview, initialState);
        this.setWebviewMessageListener(this.panel.webview);
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        
        // Build a map of node IDs to nodes for quick lookup
        if (initialState.topLevelNode) {
            VisualExplainPanel.explainTree = this.buildNodeMap(initialState.topLevelNode);
        }
    }

    public static initialize(context: ExtensionContext) {
        VisualExplainPanel.webRoot = Uri.joinPath(context.extensionUri, `dist`, `web`);
    }

    public static render(initialState: InitialState, doveNodeView: DoveNodeView) {
        VisualExplainPanel.doveNodeView = doveNodeView;
        
        if (VisualExplainPanel.currentPanel) {
            VisualExplainPanel.currentPanel.panel.reveal(ViewColumn.One);
        } else {
            const panel = window.createWebviewPanel(
                "custom",
                "Visual Explain",
                ViewColumn.One,
                {
                    enableScripts: true,
                    enableCommandUris: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        VisualExplainPanel.webRoot,
                        Uri.joinPath(this.webRoot, `assets`),
                    ]
                }
            );

            VisualExplainPanel.currentPanel = new VisualExplainPanel(panel, initialState);
        }
    }

    public dispose() {
        VisualExplainPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private getWebviewContent(webview: Webview, initialState: InitialState) {
        const stylesUri = webview.asWebviewUri(Uri.joinPath(VisualExplainPanel.webRoot, `assets`, `index.css`));
        const scriptUri = webview.asWebviewUri(Uri.joinPath(VisualExplainPanel.webRoot, `assets`, `index.js`));
        const nonce = this.getNonce();

        const stateJson = JSON.stringify(initialState ?? {});

        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <link rel="stylesheet" type="text/css" href="${stylesUri}">
                <title>
                    Visual Explain
                </title>
            </head>
            <body>
                <div id="root"></div>
                <script nonce="${nonce}">
                    window.initialState = ${stateJson};
                </script>
                <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
            </body>
        </html>
        `;
    }

    private setWebviewMessageListener(webview: Webview) {
        webview.onDidReceiveMessage(async (message: WebviewRequestMessageBase) => {
            switch (message.type) {
                case WebviewRequestTypes.NODE_SELECTED: {
                    const request = message as NodeSelectedRequest;
                    const node = VisualExplainPanel.explainTree?.get(request.nodeId);
                    if (node && VisualExplainPanel.doveNodeView) {
                        VisualExplainPanel.doveNodeView.setNode(node);
                    }
                    break;
                }
            }
        },
            undefined,
            this.disposables
        );
    }

    private buildNodeMap(node: ExplainNode): Map<number, ExplainNode> {
        const map = new Map<number, ExplainNode>();
        
        function traverse(n: ExplainNode) {
            map.set(n.id, n);
            if (n.children && n.children.length > 0) {
                n.children.forEach(child => traverse(child));
            }
        }
        
        traverse(node);
        return map;
    }


    private getNonce() {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private getUri(webview: Webview, extensionUri: Uri, pathList: string[]) {
        return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
    }
}