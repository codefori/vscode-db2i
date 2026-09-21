import * as vscode from "vscode";

/**
 * A self-contained webview data table — the single engine behind every result set in
 * the extension: finite, fully-loaded listings (MTIs, locks…) and server-paged, optionally
 * editable SQL query results alike. Every capability beyond the base grid is opt-in through
 * {@link DataTableOptions}. Kept free of Db2-specific dependencies so it can move into Core.
 */

// Inlined as raw source by webpack (see webpack.config.js) and dropped into a
// <script type="module"> tag. Requiring it here resolves to the same module
// wherever else it is required, so it is only bundled once.
const webComponents: string = require(`@vscode-elements/elements/dist/bundled.js`);

export interface DataTableColumn<T> {
  /** Stable id, used for the sort state, the editable-cell column match, and nothing the user sees */
  id: string;
  /** Header label */
  title: string;
  /** Plain text value for a row — used for display, search and sorting */
  value: (row: T) => string | number | null | undefined;
  /** Optional rich HTML for the cell body. Trusted: it is not escaped. Not editable even when `updatable` is set. */
  html?: (row: T) => string;
  /**
   * Explicit CSS grid track for this column (`"200px"`, `"minmax(80px, 1fr)"`…).
   * Defaults to `max-content` so the column is exactly as wide as its content.
   */
  width?: string;
  align?: "left" | "right" | "center";
  /** Include this column's text when matching the search box (default true) */
  searchable?: boolean;
  /** Allow clicking the header to sort by this column (default true). Ignored when `streaming` is set. */
  sortable?: boolean;
  /** Native tooltip shown on the header cell, e.g. a SQL type description */
  headerTooltip?: string;
}

/** Right-click row action: contribute a `webview/context` command with `when: webviewSection == dtRow && dtAction_<id>` that calls {@link runDataTableRowAction} */
export interface DataTableRowAction<T> {
  id: string;
  /** Return false to hide this action for a given row (default: always shown) */
  when?: (row: T) => boolean;
}

/** A column an updatable table can edit in place */
export interface BasicColumn {
  name: string;
  useInWhere: boolean;
  jsType: "number" | "asString";
  isNullable: boolean;
  maxInputLength?: number;
}

/** Describes an updatable query result: the table an edited cell writes back to, and how */
export interface UpdatableInfo {
  table: string;
  columns: BasicColumn[];
}

export interface DataTableOptions<T> {
  /** Title text shown in the toolbar. Omit (with `search: false`) to hide the toolbar entirely. */
  title?: string;
  /** Static text, or a function of (rows shown, rows total) rebuilt as the user searches. Ignored when `streaming`. */
  subtitle?: string | ((shown: number, total: number) => string);
  columns: DataTableColumn<T>[];
  rows: T[];
  actions?: DataTableRowAction<T>[];
  /** Rows per page. 0 disables pagination. Default 100. Forced to 0 when `streaming`. */
  pageSize?: number;
  /** Show the search box (default true). Set false to drop it (and, with an empty `title`, the whole toolbar). */
  search?: boolean;
  searchPlaceholder?: string;
  /** Shown when there are no rows at all, or the search matches nothing */
  emptyMessage?: string;
  /** Initial sort. Omit to keep the natural order of `rows`. With `serverQuery` it only marks the sorted column. */
  sort?: { columnId: string; direction?: "asc" | "desc" };
  /** Text the search box starts with — used when the table is re-opened elsewhere */
  initialQuery?: string;
  /**
   * Show a button beside the search box that moves the table into an editor tab.
   * Only makes sense when the table is hosted in a view; default false. Forced off when `streaming`.
   */
  openInEditor?: boolean;
  /**
   * Server-paged mode: `rows` is just the current page, more pages arrive via
   * {@link appendDataTableRows} and auto-load on scroll. Client-side sort/pagination are
   * disabled (meaningless over an unknown-total, partially-loaded set).
   */
  streaming?: boolean;
  /** With `streaming: true` — routes sort/search through `handlers.onSortChange`/`onSearchChange` instead of disabling them, so the caller can re-run the query server-side */
  serverQuery?: boolean;
  /** Enables click-to-edit cells that write back with an `UPDATE ... WHERE ...` statement */
  updatable?: UpdatableInfo;
  /** Enables drag-to-resize column headers (and a double-click to reset a column to its natural width) */
  resizable?: boolean;
  /** Only with `resizable: true` — caps every column's initial width (still user-adjustable by drag) */
  collapsedInitialWidth?: string;
  /** Shows an in-webview Cancel button while `loadingText` is showing; posts to `handlers.onCancel` */
  cancellable?: boolean;
  /** Spinner + text shown until the first page of data arrives (streaming) or the table is rendered (static, if set) */
  loadingText?: string;
}

/** What the user is currently looking at — carried over when the table moves to the editor */
export interface DataTableViewState {
  /** Text in the search box */
  query: string;
  /** Column the table is sorted by, if any */
  sort?: { columnId: string; direction: "asc" | "desc" };
}

export interface DataTableHandlers<T> {
  /** Fired when the user picks a row action */
  onAction?: (actionId: string, row: T) => void | Promise<void>;
  /**
   * Fired when the user clicks the "move to editor" button, or the host asks for it with
   * {@link requestDataTableOpenInEditor}, with the state the table is in.
   */
  onOpenInEditor?: (state: DataTableViewState) => void | Promise<void>;
  /** Fired when a `streaming` table wants its next page (scrolled to bottom, or a caller-driven "load more"/"load all") */
  onFetchMore?: (params: { allRows: boolean; queryId?: string }) => void | Promise<void>;
  /** `serverQuery` only — fired when the user clicks a sortable column header */
  onSortChange?: (params: { columnId: string; direction: "asc" | "desc" }) => void | Promise<void>;
  /** `serverQuery` only — fired (debounced) when the search box's text changes */
  onSearchChange?: (params: { query: string }) => void | Promise<void>;
  /** Fired when the user finishes editing an updatable cell */
  onCellUpdate?: (params: { id: number; statement: string; bindings: (string | number)[] }) => void | Promise<void>;
  /** Fired when the user clicks the in-webview Cancel button (see `cancellable`) */
  onCancel?: () => void | Promise<void>;
}

const escapeHtml = (value: unknown): string =>
  String(value ?? ``).replace(/[&<>"']/g, ch => ({
    "&": `&amp;`,
    "<": `&lt;`,
    ">": `&gt;`,
    '"': `&quot;`,
    "'": `&#39;`,
  }[ch] as string));

/** Formats a cell value (pretty-printing JSON-looking strings); wraps it in `.dt-hoverable` when `wrapEditable` so the click-to-edit logic can find it */
function formatCellValue(value: string | number | null | undefined, wrapEditable: boolean, nullable: boolean): string {
  const nullableClass = wrapEditable && nullable ? ` dt-nullable` : ``;

  if (value === null || value === undefined) {
    return wrapEditable
      ? `<div class="dt-hoverable dt-null${nullableClass}" contenteditable="false">null</div>`
      : `<span class="dt-null">null</span>`;
  }

  const str = String(value);
  const trimmed = str.trim();
  const looksJson =
    (trimmed.startsWith(`{`) && trimmed.endsWith(`}`)) ||
    (trimmed.startsWith(`[`) && trimmed.endsWith(`]`));

  if (looksJson) {
    try {
      const pretty = escapeHtml(JSON.stringify(JSON.parse(trimmed), null, 2));
      return wrapEditable
        ? `<div class="dt-hoverable dt-json${nullableClass}" contenteditable="false">${pretty}</div>`
        : `<span class="dt-json">${pretty}</span>`;
    } catch {
      // Not actually JSON — fall through to plain text
    }
  }

  const escaped = escapeHtml(str);
  return wrapEditable
    ? `<div class="dt-hoverable${nullableClass}" contenteditable="false">${escaped}</div>`
    : escaped;
}

interface WireColumn {
  id: string;
  title: string;
  track: string;
  align: "left" | "right" | "center";
  sortable: boolean;
  tooltip: string;
}

interface WireRow {
  /** Original index — travels with the row through filter/sort/paginate, and identifies it to the extension */
  i: number;
  /** Display HTML per column */
  c: string[];
  /** Lowercased searchable text, pre-joined */
  s: string;
  /** Raw sort keys per column */
  k: (string | number)[];
  /** Ids of the actions enabled for this row */
  a: string[];
}

function toWireColumns<T>(columns: DataTableColumn<T>[], streaming: boolean, serverQuery: boolean): WireColumn[] {
  return columns.map(col => ({
    id: col.id,
    title: col.title,
    track: col.width ?? `max-content`,
    align: col.align ?? `left`,
    sortable: streaming && !serverQuery ? false : col.sortable !== false,
    tooltip: col.headerTooltip ?? ``,
  }));
}

function nullableColumnIds(updatable: UpdatableInfo | undefined): Set<string> | undefined {
  return updatable ? new Set(updatable.columns.filter(c => c.isNullable).map(c => c.name)) : undefined;
}

function rowToWire<T>(
  row: T,
  i: number,
  columns: DataTableColumn<T>[],
  actions: DataTableRowAction<T>[],
  wrapEditable: boolean,
  nullableIds: Set<string> | undefined,
): WireRow {
  const rawValues = columns.map(col => col.value(row));
  const cells = columns.map((col, c) =>
    col.html ? col.html(row) : formatCellValue(rawValues[c], wrapEditable, !!nullableIds?.has(col.id)),
  );
  const searchText = columns
    .map((col, c) => (col.searchable === false ? `` : String(rawValues[c] ?? ``)))
    .join(` `)
    .toLowerCase();
  const sortKeys = rawValues.map(v => (typeof v === `number` ? v : String(v ?? ``)));
  const enabled = actions.filter(action => !action.when || action.when(row)).map(a => a.id);

  return { i, c: cells, s: searchText, k: sortKeys, a: enabled };
}

/** Keeps every render unique: VS Code ignores assigning a webview the html it already has */
let renderCount = 0;

function toWire<T>(options: DataTableOptions<T>, tableId: string) {
  const columns = options.columns;
  const actions = options.actions ?? [];
  const streaming = options.streaming === true;
  const serverQuery = streaming && options.serverQuery === true;
  const wrapEditable = options.updatable !== undefined;
  const nullableIds = nullableColumnIds(options.updatable);

  const wireColumns = toWireColumns(columns, streaming, serverQuery);
  const wireRows = options.rows.map((row, i) => rowToWire(row, i, columns, actions, wrapEditable, nullableIds));

  let initialSort = -1;
  let initialDir: "asc" | "desc" = `asc`;
  if (options.sort && (!streaming || serverQuery)) {
    initialSort = columns.findIndex(col => col.id === options.sort!.columnId);
    initialDir = options.sort.direction ?? `asc`;
  }

  return {
    tableId,
    renderId: ++renderCount,
    title: options.title ?? ``,
    subtitleTemplate: typeof options.subtitle === `string` ? options.subtitle : null,
    hasSubtitleFn: typeof options.subtitle === `function`,
    columns: wireColumns,
    rows: wireRows,
    pageSize: streaming ? 0 : (options.pageSize ?? 100),
    search: options.search !== false,
    searchPlaceholder: options.searchPlaceholder ?? `Search…`,
    emptyMessage: options.emptyMessage ?? `Nothing to show.`,
    initialSort,
    initialDir,
    initialQuery: options.initialQuery ?? ``,
    canOpenInEditor: streaming ? false : options.openInEditor === true,
    streaming,
    serverQuery,
    updatable: options.updatable ?? null,
    resizable: options.resizable === true,
    collapsedInitialWidth: options.collapsedInitialWidth ?? null,
    cancellable: options.cancellable === true,
    loadingText: options.loadingText ?? null,
  };
}

const liveTables = new Map<string, { options: DataTableOptions<any>; handlers: DataTableHandlers<any> }>();
let nextTableId = 0;

/** Makes a table's rows reachable from its right-click commands; render it with the returned id */
export function registerDataTable<T>(options: DataTableOptions<T>, handlers: DataTableHandlers<T>): vscode.Disposable & { id: string } {
  const id = `dt${++nextTableId}`;
  liveTables.set(id, { options, handlers });
  return { id, dispose: () => liveTables.delete(id) };
}

export async function runDataTableRowAction(actionId: string, context: any): Promise<void> {
  const table = liveTables.get(context?.dtTable);
  const row = table?.options.rows[context?.dtRow];
  if (table && row !== undefined) {
    await table.handlers.onAction?.(actionId, row);
  }
}

/**
 * Render a complete HTML page for the data table. Assign it to a webview's
 * `.html`, then route its messages through {@link handleDataTableMessage}. Pass the id of
 * a {@link registerDataTable} registration when the table has row actions.
 */
export function renderDataTable<T>(options: DataTableOptions<T>, tableId = ``): string {
  const model = toWire(options, tableId);
  const subtitleFn = typeof options.subtitle === `function` ? options.subtitle : undefined;
  const initialSubtitle = subtitleFn
    ? subtitleFn(model.rows.length, model.rows.length)
    : (model.subtitleTemplate ?? ``);
  const showToolbar = Boolean(model.title || model.search);
  // With serverQuery it also signals a modified query
  const searchIcon = /*html*/ `<span slot="content-before" class="dt-search-icon"${model.serverQuery ? ` id="dtModified"` : ``}>
          <!-- codicon "search" -->
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M10.02 10.727a5.5 5.5 0 1 1 .707-.707l3.127 3.126a.5.5 0 0 1-.708.708l-3.127-3.127ZM11 6.5a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0Z"/>
          </svg>
        </span>`;
  // Server-side search needs the columns of the first page
  const searchDisabled = model.serverQuery && model.columns.length === 0;

  return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script defer type="module">${webComponents}</script>
  <style>
    /* Palette aligned with Core's FastTable (frontendTables.generateFastTable) */
    :root {
      --dt-fg-rgb: var(--vscode-editor-foreground-rgb, 204, 204, 204);
      --dt-accent: var(--vscode-focusBorder);
      --dt-surface: rgba(var(--dt-fg-rgb), 0.03);
      --dt-border: rgba(var(--dt-fg-rgb), 0.08);
      --dt-header-a: rgba(var(--dt-fg-rgb), 0.08);
      --dt-header-b: rgba(var(--dt-fg-rgb), 0.05);
      --dt-zebra-odd: rgba(var(--dt-fg-rgb), 0.06);
      --dt-zebra-even: rgba(var(--dt-fg-rgb), 0.20);
      --dt-muted: var(--vscode-descriptionForeground);
      /* Yellow is too washed-out on a light theme; overridden below via VS Code's body class */
      --dt-null-color: var(--vscode-charts-yellow);
    }
    body.vscode-light, body.vscode-high-contrast-light {
      --dt-null-color: var(--vscode-charts-red);
    }

    html, body { height: 100%; }
    body {
      margin: 0;
      padding: 0;               /* override the webview's injected body padding */
      display: flex;
      flex-direction: column;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }

    /* --- top bar: title + search --- */
    #toolbar {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 14px;
      background-color: var(--dt-surface);
      border-bottom: 1px solid var(--dt-border);
    }
    #title { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #search { width: min(280px, 45vw); }
    #toolbarEnd { margin-left: auto; display: flex; align-items: center; gap: 6px; }
    .dt-search-icon { display: flex; align-items: center; color: var(--dt-muted); }
    .dt-search-clear { display: flex; align-items: center; cursor: pointer; border-radius: 3px; color: var(--vscode-icon-foreground, var(--vscode-foreground)); }
    .dt-search-clear:hover { background-color: var(--vscode-toolbar-hoverBackground); }
    .dt-search-clear[hidden] { display: none; }
    #dtModified.active { color: var(--vscode-editorInfo-foreground, var(--dt-accent)); cursor: help; }
    #openInEditor { flex: 0 0 auto; }
    #openInEditor svg { display: block; }

    /* --- the scrollable grid --- */
    #gridScroll {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      font-size: 0.9em;
      position: relative;
    }
    #grid {
      display: grid;
      width: max-content;
      min-width: 100%;
      align-content: start;
    }
    .dt-row { display: contents; }

    .dt-h, .dt-c {
      padding: 5px 15px;
      border-bottom: 1px solid var(--dt-border);
    }

    .dt-h {
      position: sticky;
      top: 0;
      z-index: 1;
      background:
        linear-gradient(180deg, var(--dt-header-a) 0%, var(--dt-header-b) 100%),
        var(--vscode-editor-background);
      border-bottom: 2px solid var(--dt-accent);
      border-right: 1px solid var(--dt-border);   /* column separator */
      color: var(--vscode-foreground);
      font-weight: 700;
      font-size: 0.95em;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      white-space: pre-line;   /* lets a two-line "name / label" heading wrap on \\n */
      cursor: default;
      user-select: none;
    }
    .dt-h.sortable { cursor: pointer; }
    .dt-h .arrow { margin-left: 5px; opacity: 0.7; font-size: 0.85em; }
    .dt-h-label { display: inline; }

    /* Match the SQL results grid: monospace cell values */
    .dt-c {
      font-family: monospace;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      max-width: 520px;
    }
    .dt-c.right { text-align: right; }
    .dt-c.center { text-align: center; }
    .dt-row.odd > .dt-c { background-color: var(--dt-zebra-odd); }
    .dt-row.even > .dt-c { background-color: var(--dt-zebra-even); }
    .dt-row:hover > .dt-c { background-color: var(--vscode-list-hoverBackground); }

    /* Pretty-printed JSON values keep their indentation, like the results grid */
    .dt-json { display: block; white-space: pre; }
    .dt-c:has(.dt-json) { max-width: none; }

    /* NULL values: italic bold, orange on dark themes / red on light themes (see --dt-null-color) */
    .dt-null {
      font-style: italic;
      font-weight: bold;
      color: var(--dt-null-color);
    }

    .dt-hoverable[contenteditable="true"] {
      outline: 1px solid var(--dt-accent);
      outline-offset: -1px;
    }
    .dt-hoverable[contenteditable="true"].dt-nullable:before {
      color: var(--vscode-foreground);
      position: absolute;
      transform: translateY(-24px);
      content: "Shift+Enter for null";
      background-color: var(--vscode-list-hoverBackground);
      opacity: 1;
      padding: 2px;
      font-style: normal;
      font-weight: normal;
      border: 1px solid var(--dt-accent);
      width: max-content;
      z-index: 2;
    }
    .dt-c:has(.dt-hoverable) { position: relative; }

    .dt-grip {
      position: absolute;
      top: 0; right: 0; bottom: 0;
      width: 6px;
      cursor: col-resize;
      border-right: 1px solid var(--dt-border);
    }

    /* Soaks up leftover width so the header band and row hover reach the right edge */
    .dt-filler { padding: 0; max-width: none; border-right: none; }

    /* Search matches, colored like the editor's find matches */
    mark.dt-match {
      background-color: var(--vscode-editor-findMatchHighlightBackground);
      outline: 1px solid var(--vscode-editor-findMatchHighlightBorder, transparent);
      color: inherit;
    }

    #empty, #dtMessage { display: none; padding: 22px 16px; color: var(--dt-muted); text-align: center; }

    /* --- bottom bar: count + pagination / streaming status --- */
    #footer {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 3px 14px;
      background-color: var(--dt-surface);
      border-top: 1px solid var(--dt-border);
    }
    #subtitle, #dtStatus, #dtJobId { color: var(--dt-muted); }
    #footer .spacer { flex: 1 1 auto; }
    #pager { display: flex; align-items: center; gap: 4px; }
    #pager[hidden] { display: none; }
    #rangeInfo { color: var(--dt-muted); }
    #dtUpdateMessage { font-family: monospace; }
    #dtUpdateMessage:empty { display: none; }

    /* --- initial loading overlay (streaming, or a static table opened while still loading) --- */
    #dtLoading {
      position: absolute;
      inset: 0;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      background-color: var(--vscode-editor-background);
    }
    /* https://cssloaders.github.io */
    .dt-loader {
      width: 32px;
      height: 90px;
      position: relative;
      border-radius: 50% 50% 0 0;
      border-bottom: 10px solid #0055ff;
      background-color: #d6dce3;
      background-image: radial-gradient(ellipse at center, #d6dce3 34%, #0055ff 35%, #0055ff 54%, #d6dce3 55%), linear-gradient(#0055ff 10px, transparent 0);
      background-size: 28px 28px;
      background-position: center 20px , center 2px;
      background-repeat: no-repeat;
      box-sizing: border-box;
      animation: dtLoaderBack 1s linear infinite alternate;
    }
    .dt-loader::before {
      content: '';
      box-sizing: border-box;
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 64px;
      height: 44px;
      border-radius: 50%;
      box-shadow: 0px 15px #0055ff inset;
      top: 67px;
    }
    .dt-loader::after {
      content: '';
      position: absolute;
      left: 50%;
      transform: translateX(-50%) rotate(45deg);
      width: 34px;
      height: 34px;
      top: 112%;
      background: radial-gradient(ellipse at center, #ffdf00 8%, rgba(249, 62, 0, 0.6) 24%, rgba(0, 0, 0, 0) 100%);
      border-radius: 50% 50% 0;
      background-repeat: no-repeat;
      background-position: -44px -44px;
      background-size: 100px 100px;
      box-shadow: 4px 4px 12px 0px rgba(255, 61, 0, 0.5);
      box-sizing: border-box;
      animation: dtLoaderFront 1s linear infinite alternate;
    }
    @keyframes dtLoaderBack {
      0%, 30%, 70% { transform: translateY(0px); }
      20%, 40%, 100% { transform: translateY(-5px); }
    }
    @keyframes dtLoaderFront {
      0% {
        box-shadow: 4px 4px 12px 2px rgba(255, 61, 0, 0.75);
        width: 34px; height: 34px;
        background-position: -44px -44px;
        background-size: 100px 100px;
      }
      100% {
        box-shadow: 2px 2px 8px 0px rgba(255, 61, 0, 0.5);
        width: 30px; height: 28px;
        background-position: -36px -36px;
        background-size: 80px 80px;
      }
    }
  </style>
</head>
<body style="padding: 0;">
  <div id="toolbar" ${showToolbar ? `` : `style="display:none"`}>
    <span id="title" title="${escapeHtml(model.title)}">${escapeHtml(model.title)}</span>
    <span id="toolbarEnd">
      ${model.search ? /*html*/ `<vscode-textfield id="search" type="text" placeholder="${escapeHtml(model.searchPlaceholder)}" value="${escapeHtml(model.initialQuery)}"${searchDisabled ? ` disabled` : ``}>
        ${searchIcon}
        <span slot="content-after" id="searchClear" class="dt-search-clear" title="Clear"${model.initialQuery ? `` : ` hidden`}>
          <!-- codicon "close" -->
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="m8.707 8 3.646-3.646a.5.5 0 0 0-.707-.707L8 7.293 4.354 3.647a.5.5 0 0 0-.707.707L7.293 8l-3.646 3.646a.5.5 0 0 0 .708.707l3.646-3.646 3.646 3.646a.498.498 0 0 0 .708 0 .5.5 0 0 0 0-.707L8.709 8h-.002Z"/>
          </svg>
        </span>
      </vscode-textfield>` : ``}
      ${model.canOpenInEditor ? /*html*/ `<vscode-button id="openInEditor" secondary title="Move this table into the editor">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12.5 9.5V13a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1H7"/>
          <path d="M10 2.5h3.5V6"/>
          <path d="M13.5 2.5 8 8"/>
        </svg>
      </vscode-button>` : ``}
    </span>
  </div>

  <div id="gridScroll">
    <div id="grid"></div>
    <div id="empty">${escapeHtml(model.emptyMessage)}</div>
    <div id="dtMessage"></div>
    <div id="dtSentinel" style="height:1px;"></div>
    <div id="dtLoading">
      <span class="dt-loader"></span>
      <p id="dtLoadingText">${escapeHtml(model.loadingText ?? ``)}</p>
      ${model.cancellable ? /*html*/ `<vscode-button id="dtCancel">Cancel</vscode-button>` : ``}
    </div>
  </div>

  <div id="footer">
    ${model.streaming ? /*html*/ `
      <span id="dtStatus"></span>
      <span id="dtJobId"></span>
      <span class="spacer"></span>
      <span id="dtUpdateMessage"></span>
    ` : /*html*/ `
      <span id="subtitle">${escapeHtml(initialSubtitle)}</span>
      <span class="spacer"></span>
      <span id="pager" hidden>
        <vscode-button id="firstPage" appearance="secondary" title="First page">«</vscode-button>
        <vscode-button id="prevPage" appearance="secondary" title="Previous page">‹</vscode-button>
        <span id="pageInfo"></span>
        <vscode-button id="nextPage" appearance="secondary" title="Next page">›</vscode-button>
        <vscode-button id="lastPage" appearance="secondary" title="Last page">»</vscode-button>
      </span>
      <span id="rangeInfo"></span>
    `}
  </div>

  <script defer>
    const vscode = acquireVsCodeApi();
    const MODEL = ${JSON.stringify(model)};

    const state = {
      query: MODEL.initialQuery,
      // serverQuery: the search the shown rows were fetched with
      appliedQuery: MODEL.initialQuery,
      page: 1,
      sortCol: MODEL.initialSort,
      sortDir: MODEL.initialDir,
      view: [],
      isFetching: false,
      noMoreRows: false,
      isDone: false,
      allRows: false,
      myQueryId: undefined,
      zebraCount: 0,
      adjustingColumn: undefined,
      startOffset: 0,
    };
    let headerBuilt = false;
    let handleCellResponse = function (id, success) {};

    const el = (id) => document.getElementById(id);
    const grid = el("grid");

    function gridTemplate() {
      const capped = MODEL.resizable && MODEL.collapsedInitialWidth;
      const tracks = MODEL.columns.map((c) => (capped ? MODEL.collapsedInitialWidth : c.track));
      return tracks.join(" ") + " minmax(0, 1fr)";
    }

    function headerCellCount() {
      return MODEL.columns.length + 1;
    }

    // ----- header ----------------------------------------------------------
    function attachGrip(headerCell, index) {
      const grip = document.createElement("div");
      grip.className = "dt-grip";
      grip.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        state.adjustingColumn = index;
        state.startOffset = headerCell.offsetWidth - e.pageX;
      });
      // Otherwise the click generated on mouseup bubbles to the header and toggles sort.
      grip.addEventListener("click", (e) => e.stopPropagation());
      grip.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        const tracks = grid.style.gridTemplateColumns.split(" ");
        tracks[index] = "max-content";
        grid.style.gridTemplateColumns = tracks.join(" ");
      });
      headerCell.appendChild(grip);
    }

    if (MODEL.resizable) {
      document.addEventListener("mousemove", (e) => {
        if (state.adjustingColumn === undefined) return;
        const tracks = grid.style.gridTemplateColumns.split(" ");
        tracks[state.adjustingColumn] = Math.max(state.startOffset + e.pageX, 40) + "px";
        grid.style.gridTemplateColumns = tracks.join(" ");
      });
      document.addEventListener("mouseup", () => { state.adjustingColumn = undefined; });
    }

    function buildHeader() {
      Array.from(grid.querySelectorAll(":scope > .dt-h")).forEach((n) => n.remove());
      grid.style.gridTemplateColumns = gridTemplate();
      MODEL.columns.forEach((col, index) => {
        const h = document.createElement("div");
        h.className = "dt-h" + (col.sortable ? " sortable" : "");
        if (col.tooltip) h.title = col.tooltip;
        const label = document.createElement("span");
        label.className = "dt-h-label";
        label.textContent = col.title;
        h.appendChild(label);
        if (col.sortable) h.addEventListener("click", () => toggleSort(index));
        const arrow = document.createElement("span");
        arrow.className = "arrow";
        arrow.dataset.for = String(index);
        h.appendChild(arrow);
        if (MODEL.resizable) attachGrip(h, index);
        grid.appendChild(h);
      });
      const filler = document.createElement("div");
      filler.className = "dt-h dt-filler";
      grid.appendChild(filler);
      refreshArrows();
    }

    function updateHeaderTitles() {
      const headers = Array.from(grid.querySelectorAll(":scope > .dt-h:not(.dt-filler)"));
      MODEL.columns.forEach((col, i) => {
        const h = headers[i];
        if (!h) return;
        const label = h.querySelector(".dt-h-label");
        if (label) label.textContent = col.title;
        if (col.tooltip) h.title = col.tooltip; else h.removeAttribute("title");
      });
    }

    function setColumns(newColumns) {
      MODEL.columns = newColumns;
      if (!headerBuilt) {
        buildHeader();
        headerBuilt = true;
      } else {
        updateHeaderTitles();
      }
    }

    function refreshArrows() {
      document.querySelectorAll("#grid .dt-h .arrow").forEach((a) => {
        const idx = Number(a.dataset.for);
        a.textContent = idx === state.sortCol ? (state.sortDir === "asc" ? "▲" : "▼") : "";
      });
    }

    function toggleSort(index) {
      if (MODEL.streaming && !MODEL.serverQuery) return;
      if (state.sortCol === index) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortCol = index;
        state.sortDir = "asc";
      }
      state.page = 1;
      refreshArrows();
      if (MODEL.streaming) {
        vscode.postMessage({ command: "sortChange", columnId: MODEL.columns[index].id, direction: state.sortDir });
      } else {
        render();
      }
    }

    // ----- filter / sort / paginate (static tables) ------------------------
    function compare(a, b) {
      const col = state.sortCol;
      if (col < 0) return 0;
      const ka = a.k[col];
      const kb = b.k[col];
      if (typeof ka === "number" && typeof kb === "number") return ka - kb;
      const sa = String(ka), sb = String(kb);
      const na = Number(sa), nb = Number(sb);
      if (sa.trim() !== "" && sb.trim() !== "" && !Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" });
    }

    function computeView() {
      const terms = state.query.toLowerCase().split(/\\s+/).filter(Boolean);
      let rows = MODEL.rows.filter((r) => terms.every((t) => r.s.includes(t)));
      if (state.sortCol >= 0) {
        rows = rows.slice().sort((a, b) => {
          const c = compare(a, b);
          return state.sortDir === "asc" ? c : -c;
        });
      }
      state.view = rows;
    }

    function pageCount() {
      if (!MODEL.pageSize) return 1;
      return Math.max(1, Math.ceil(state.view.length / MODEL.pageSize));
    }

    function currentPageRows() {
      if (!MODEL.pageSize) return state.view;
      const start = (state.page - 1) * MODEL.pageSize;
      return state.view.slice(start, start + MODEL.pageSize);
    }

    // ----- search match highlighting ---------------------------------------
    function highlightTerms() {
      const text = (MODEL.serverQuery ? state.appliedQuery : state.query).trim().toLowerCase();
      if (!text) return [];
      return MODEL.serverQuery ? [text] : text.split(/\\s+/).filter(Boolean);
    }

    function highlightIn(root, terms) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);

      textNodes.forEach((node) => {
        const text = node.nodeValue;
        const lower = text.toLowerCase();
        const ranges = [];
        terms.forEach((term) => {
          let at = lower.indexOf(term);
          while (at !== -1) {
            ranges.push([at, at + term.length]);
            at = lower.indexOf(term, at + term.length);
          }
        });
        if (!ranges.length) return;

        // Merge overlapping terms into single marks
        ranges.sort((a, b) => a[0] - b[0]);
        const merged = [];
        ranges.forEach((r) => {
          const last = merged[merged.length - 1];
          if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
          else merged.push(r.slice());
        });

        const frag = document.createDocumentFragment();
        let pos = 0;
        merged.forEach(([start, end]) => {
          if (start > pos) frag.appendChild(document.createTextNode(text.slice(pos, start)));
          const mark = document.createElement("mark");
          mark.className = "dt-match";
          mark.textContent = text.slice(start, end);
          frag.appendChild(mark);
          pos = end;
        });
        if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
        node.parentNode.replaceChild(frag, node);
      });
    }

    // ----- row DOM construction (shared: static render + streaming append) -
    function buildRowElement(wireRow, zebraIndex, terms) {
      const rowEl = document.createElement("div");
      rowEl.className = "dt-row " + (zebraIndex % 2 ? "even" : "odd");
      rowEl.dataset.i = String(wireRow.i);
      if (wireRow.a.length) {
        // Read by VS Code's webview/context menu
        const context = { webviewSection: "dtRow", dtTable: MODEL.tableId, dtRow: wireRow.i, preventDefaultContextMenuItems: true };
        wireRow.a.forEach((id) => { context["dtAction_" + id] = true; });
        rowEl.dataset.vscodeContext = JSON.stringify(context);
      }
      wireRow.c.forEach((cellHtml, c) => {
        const col = MODEL.columns[c];
        const cell = document.createElement("div");
        cell.className = "dt-c" + (col && col.align !== "left" ? " " + col.align : "");
        if (MODEL.updatable && col) cell.dataset.col = col.id;
        cell.innerHTML = cellHtml;
        if (terms.length) highlightIn(cell, terms);
        rowEl.appendChild(cell);
      });
      const filler = document.createElement("div");
      filler.className = "dt-c dt-filler";
      rowEl.appendChild(filler);
      return rowEl;
    }

    // ----- rendering (static tables: full rebuild per search/sort/page) ---
    function render() {
      computeView();
      if (state.page > pageCount()) state.page = pageCount();

      // Drop existing rows, keep the header cells
      const headerCount = headerCellCount();
      while (grid.children.length > headerCount) grid.removeChild(grid.lastChild);

      const terms = highlightTerms();
      const frag = document.createDocumentFragment();
      currentPageRows().forEach((r, rowIndex) => frag.appendChild(buildRowElement(r, rowIndex, terms)));
      grid.appendChild(frag);

      el("empty").style.display = state.view.length ? "none" : "";
      grid.style.display = state.view.length ? "grid" : "none";

      updateSubtitle();
      updatePager();
    }

    function updateSubtitle() {
      if (MODEL.hasSubtitleFn) {
        vscode.postMessage({ command: "subtitle", shown: state.view.length, total: MODEL.rows.length });
      } else if (MODEL.subtitleTemplate === null) {
        el("subtitle").textContent = state.view.length + " of " + MODEL.rows.length;
      }
    }

    function updatePager() {
      const pager = el("pager");
      if (!MODEL.pageSize || state.view.length <= MODEL.pageSize) {
        pager.hidden = true;
        el("rangeInfo").textContent = "";
        return;
      }
      pager.hidden = false;
      const pages = pageCount();
      el("pageInfo").textContent = " " + state.page + " / " + pages + " ";
      const start = (state.page - 1) * MODEL.pageSize + 1;
      const end = Math.min(state.view.length, state.page * MODEL.pageSize);
      el("rangeInfo").textContent = start + "–" + end;
      el("firstPage").disabled = state.page <= 1;
      el("prevPage").disabled = state.page <= 1;
      el("nextPage").disabled = state.page >= pages;
      el("lastPage").disabled = state.page >= pages;
    }

    function goto(page) {
      state.page = Math.min(Math.max(1, page), pageCount());
      render();
    }
    if (el("firstPage")) {
      el("firstPage").addEventListener("click", () => goto(1));
      el("prevPage").addEventListener("click", () => goto(state.page - 1));
      el("nextPage").addEventListener("click", () => goto(state.page + 1));
      el("lastPage").addEventListener("click", () => goto(pageCount()));
    }

    // ----- streaming: append-only fast path (never touches existing rows) -
    function hideLoading() {
      el("dtLoading").style.display = "none";
    }

    // Drops rows on screen and shows the loading overlay again, keeping the built header.
    function resetStreamingRows() {
      const headerCount = headerCellCount();
      while (grid.children.length > headerCount) grid.removeChild(grid.lastChild);
      MODEL.rows = [];
      state.zebraCount = 0;
      state.isDone = false;
      state.noMoreRows = false;
      state.isFetching = false;
      el("dtMessage").style.display = "none";
      el("dtSentinel").style.display = "";
      grid.style.display = "grid";
      if (MODEL.loadingText) el("dtLoading").style.display = "flex";
    }

    function showStreamingMessage(text) {
      grid.style.display = "none";
      el("dtSentinel").style.display = "none";
      const msg = el("dtMessage");
      msg.textContent = text;
      msg.style.display = "";
    }

    function hideStreamingMessage() {
      el("dtMessage").style.display = "none";
      grid.style.display = "grid";
    }

    function updateStreamingStatus(data) {
      const updatableSuffix = MODEL.updatable ? " Updatable." : "";
      const doneSuffix = state.isDone ? " End of data." : " More available.";
      const statusEl = el("dtStatus");
      if (typeof data.executionTimeMs === "number") {
        statusEl.textContent = "Loaded " + MODEL.rows.length + " rows in " + Math.round(data.executionTimeMs) + "ms." + doneSuffix + updatableSuffix;
      } else {
        statusEl.textContent = "Loaded " + MODEL.rows.length + " rows." + doneSuffix + updatableSuffix;
      }
      if (data.jobId) el("dtJobId").textContent = data.jobId;
    }

    function appendRowsToDom(wireRows) {
      const terms = highlightTerms();
      const frag = document.createDocumentFragment();
      wireRows.forEach((r) => {
        frag.appendChild(buildRowElement(r, state.zebraCount, terms));
        state.zebraCount++;
      });
      grid.appendChild(frag);
      MODEL.rows.push(...wireRows);
    }

    function requestFetch(allRows) {
      state.isFetching = true;
      if (MODEL.rows.length) el("dtStatus").textContent = "Loaded " + MODEL.rows.length + " rows. Fetching more…";
      vscode.postMessage({ command: "fetchRows", allRows: !!allRows, queryId: state.myQueryId });
    }

    // The observer won't fire again if a short page leaves the sentinel in view
    function fetchIfSentinelVisible() {
      if (state.isFetching || state.noMoreRows || !MODEL.rows.length) return;
      const sentinel = el("dtSentinel").getBoundingClientRect();
      if (sentinel.top <= el("gridScroll").getBoundingClientRect().bottom) requestFetch(state.allRows);
    }

    if (MODEL.streaming) {
      new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !state.isFetching && !state.noMoreRows) {
          requestFetch(state.allRows);
        }
      }, { threshold: [0] }).observe(el("dtSentinel"));

      const cancelButton = el("dtCancel");
      if (cancelButton) {
        cancelButton.addEventListener("click", () => vscode.postMessage({ command: "cancel" }));
      }
    }

    // ----- search (static tables: local filter; serverQuery: re-run the query) -------
    let searchTimer;

    // Re-runs the query only when the trimmed text actually changed
    function applyServerSearch() {
      clearTimeout(searchTimer);
      if (state.query.trim() === state.appliedQuery.trim()) return;
      state.appliedQuery = state.query;
      vscode.postMessage({ command: "searchChange", query: state.query });
    }

    function applyLocalSearch() {
      clearTimeout(searchTimer);
      state.page = 1;
      render();
    }

    if (el("search")) {
      el("search").addEventListener("input", (ev) => {
        clearTimeout(searchTimer);
        state.query = ev.target.value || "";
        el("searchClear").hidden = !state.query;

        if (MODEL.streaming) {
          if (!MODEL.serverQuery) return;
          // Server round trip costs more than a local filter, so wait for a longer pause in typing
          searchTimer = setTimeout(applyServerSearch, 500);
          return;
        }

        searchTimer = setTimeout(applyLocalSearch, 150);
      });

      el("search").addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" && MODEL.serverQuery) applyServerSearch();
      });

      el("searchClear").addEventListener("click", () => {
        el("search").value = "";
        state.query = "";
        el("searchClear").hidden = true;
        if (MODEL.serverQuery) applyServerSearch();
        else if (!MODEL.streaming) applyLocalSearch();
      });
    }

    // ----- move to the editor -------------------------------------
    function postOpenInEditor() {
      vscode.postMessage({
        command: "openInEditor",
        query: state.query,
        sortCol: state.sortCol,
        sortDir: state.sortDir,
      });
    }
    const openInEditor = el("openInEditor");
    if (openInEditor) openInEditor.addEventListener("click", postOpenInEditor);

    // ----- editable cells (updatable tables) --------------------------------
    (function setupEditableCells() {
      if (!MODEL.updatable) return;
      const updateTable = MODEL.updatable;
      const updateRequests = {};
      let cellCounter = 0;
      const validKeyPresses = ["Enter", "Backspace", "Delete", "ArrowLeft", "ArrowRight"];

      function isNumeric(str) {
        if (typeof str !== "string") return false;
        return !isNaN(str) && !isNaN(parseFloat(str));
      }

      function updateMessageContent(show, initialMessage) {
        const box = el("dtUpdateMessage");
        if (!box) return;
        if (initialMessage) box.innerHTML = initialMessage;
        box.style.display = show ? "" : "none";
      }

      function requestCellUpdate(cellNode, originalValue, statement, bindings) {
        const id = ++cellCounter;
        updateRequests[id] = { cellNode, originalValue };
        vscode.postMessage({ command: "update", id, update: statement, bindings });
      }

      handleCellResponse = function (id, success) {
        const req = updateRequests[id];
        if (req) {
          if (!success) req.cellNode.innerText = req.originalValue;
          delete updateRequests[id];
        }
      };

      grid.addEventListener("click", (e) => {
        const hoverable = e.target.closest(".dt-hoverable");
        if (!hoverable) return;
        const cellDiv = hoverable.closest(".dt-c");
        if (!cellDiv) return;
        const chosenColumn = cellDiv.dataset.col;
        if (!chosenColumn || chosenColumn === "RRN") return;
        const chosenColumnDetail = updateTable.columns.find((c) => c.name === chosenColumn);
        if (!chosenColumnDetail) return;
        if (hoverable.contentEditable === "true") return; // already editing

        const rowEl = cellDiv.parentElement;
        const updateKeyColumns = updateTable.columns.filter((c) => c.useInWhere);
        if (updateKeyColumns.length === 0) return;

        // Keyed by column name: the row's cell order need not match updateKeyColumns' order. null = SQL NULL.
        const idValues = {};
        Array.from(rowEl.children).forEach((cell) => {
          if (updateKeyColumns.some((c) => c.name === cell.dataset.col)) {
            const h = cell.querySelector(".dt-hoverable");
            idValues[cell.dataset.col] = h && h.classList.contains("dt-null") ? null : (h ? h.innerText : "");
          }
        });

        const originalValue = hoverable.innerText;
        const editableNode = hoverable;

        const getSqlStatement = (newValue, withSane, nullify) => {
          const useRrn = updateKeyColumns.length === 1 && updateKeyColumns.some((c) => c.name === "RRN");
          let bindings = [];
          let updateStatement = "UPDATE " + updateTable.table + " t SET t." + chosenColumn + " = ";

          if (nullify) {
            updateStatement += "NULL";
          } else {
            switch (chosenColumnDetail.jsType) {
              case "number":
                if (isNumeric(newValue)) {
                  bindings.push(newValue);
                  updateStatement += "?";
                } else {
                  return undefined;
                }
                break;
              case "asString":
                updateStatement += "?";
                bindings.push(newValue);
                break;
            }
          }

          const conditions = [];
          updateKeyColumns.forEach((keyColumn) => {
            if (!(keyColumn.name in idValues)) return;
            const value = idValues[keyColumn.name];
            const target = useRrn && keyColumn.name === "RRN" ? "RRN(t)" : keyColumn.name;
            if (value === null) {
              conditions.push(target + " IS NULL");
              return;
            }
            conditions.push(target + " = ?");
            switch (keyColumn.jsType) {
              case "number": bindings.push(Number(value)); break;
              case "asString": bindings.push(value); break;
            }
          });
          // Never send an UPDATE that would hit every row
          if (conditions.length === 0) return undefined;
          updateStatement += " WHERE " + conditions.join(" AND ");

          let statementParts = updateStatement.split("?");
          let saneStatement = "";
          if (withSane) {
            for (let i = 0; i < statementParts.length; i++) {
              saneStatement += statementParts[i];
              if (bindings[i] !== undefined) {
                saneStatement += typeof bindings[i] === "string" ? "'" + bindings[i] + "'" : bindings[i];
              }
            }
          }

          return { updateStatement, bindings, saneStatement };
        };

        const updateMessageWithSql = (newValue) => {
          const sql = getSqlStatement(newValue, true, false);
          if (sql) updateMessageContent(true, "<pre style=\\"margin:0;\\">" + sql.saneStatement + "</pre>");
        };

        if (editableNode.classList.contains("dt-null") && editableNode.innerText === "null") {
          editableNode.innerText = "";
        }
        editableNode.contentEditable = true;
        editableNode.focus();
        updateMessageWithSql(originalValue);

        let nullify = false;

        const keydownEvent = (ev) => {
          const newValue = editableNode.innerText;
          if (chosenColumnDetail.maxInputLength && newValue.length >= chosenColumnDetail.maxInputLength) {
            if (!validKeyPresses.includes(ev.key)) ev.preventDefault();
          }
          switch (ev.key) {
            case "Enter":
              if (chosenColumnDetail.isNullable && ev.shiftKey) nullify = true;
              ev.preventDefault();
              editableNode.blur();
              break;
            case "Escape":
              editableNode.innerText = originalValue;
              editableNode.blur();
              break;
          }
        };

        const keyupEvent = () => {
          if (editableNode.firstChild && editableNode.firstChild.tagName && editableNode.firstChild.tagName.toLowerCase() === "br") {
            editableNode.removeChild(editableNode.firstChild);
          }
          updateMessageWithSql(editableNode.innerText);
        };

        const finishEditing = () => {
          updateMessageContent(false);
          editableNode.removeEventListener("keydown", keydownEvent);
          editableNode.removeEventListener("keyup", keyupEvent);
          editableNode.contentEditable = false;

          let newValue = editableNode.innerText;
          if (!nullify && newValue === originalValue) return;
          if (chosenColumnDetail.maxInputLength && newValue.length > chosenColumnDetail.maxInputLength) {
            newValue = newValue.substring(0, chosenColumnDetail.maxInputLength);
            editableNode.innerText = newValue;
          }

          const sql = getSqlStatement(newValue, false, nullify);
          if (!sql) {
            editableNode.innerText = originalValue;
            return;
          }

          if (nullify) {
            editableNode.innerText = "null";
            editableNode.classList.add("dt-null");
          } else {
            editableNode.classList.remove("dt-null");
          }

          requestCellUpdate(editableNode, originalValue, sql.updateStatement, sql.bindings);
        };

        editableNode.addEventListener("blur", (ev) => { ev.stopPropagation(); finishEditing(); }, { once: true });
        editableNode.addEventListener("keydown", keydownEvent);
        editableNode.addEventListener("keyup", keyupEvent);
      });
    })();

    // ----- messages from the extension ----------------------------
    window.addEventListener("message", (event) => {
      const data = event.data || {};
      switch (data.command) {
        case "setSubtitle":
          el("subtitle").textContent = data.text || "";
          break;
        case "setRows":
          MODEL.rows = data.rows;
          if (typeof data.subtitleTemplate === "string") MODEL.subtitleTemplate = data.subtitleTemplate;
          state.page = 1;
          render();
          break;
        case "setColumns":
          setColumns(data.columns);
          break;
        case "resetRows":
          resetStreamingRows();
          break;
        case "appendRows":
          hideLoading();
          state.myQueryId = data.queryId !== undefined ? data.queryId : state.myQueryId;
          state.isFetching = false;
          state.isDone = data.isDone === true;
          state.noMoreRows = state.isDone;
          if (data.rows && data.rows.length) appendRowsToDom(data.rows);
          if (el("search")) el("search").disabled = false;
          if (MODEL.rows.length === 0) {
            showStreamingMessage(state.appliedQuery.trim()
              ? MODEL.emptyMessage
              : "Statement executed with no result set returned. Rows affected: " + (data.updateCount !== undefined ? data.updateCount : 0));
          } else {
            hideStreamingMessage();
            updateStreamingStatus(data);
            fetchIfSentinelVisible();
          }
          break;
        case "cellResponse":
          if (data.id) handleCellResponse(data.id, data.success === true);
          break;
        case "requestFetch":
          state.myQueryId = data.queryId !== undefined ? data.queryId : state.myQueryId;
          state.allRows = state.allRows || data.allRows === true;
          if (!state.isFetching) requestFetch(state.allRows);
          break;
        case "requestOpenInEditor":
          postOpenInEditor();
          break;
        case "setQueryModification": {
          const icon = el("dtModified");
          if (icon) {
            icon.classList.toggle("active", Boolean(data.text));
            icon.title = data.text || "";
          }
          break;
        }
      }
    });

    if (MODEL.search && el("search")) el("search").value = MODEL.initialQuery;

    if (MODEL.streaming) {
      if (MODEL.loadingText) el("dtLoading").style.display = "flex";
      if (MODEL.columns.length > 0) {
        buildHeader();
        headerBuilt = true;
      }
      el("empty").style.display = "none";
      grid.style.display = "grid";
    } else {
      buildHeader();
      headerBuilt = true;
      render();
    }
  </script>
</body>
</html>`;
}

/**
 * Process one message posted by a data table webview. Wire this to whatever
 * carries the webview's messages — a panel's `onDidReceiveMessage`, or a shared
 * view's message router.
 *
 * @param post   how to send a message back to that same webview
 * @returns whether the message belonged to the table — useful when the webview is shared
 */
export async function handleDataTableMessage<T>(
  message: any,
  options: DataTableOptions<T>,
  handlers: DataTableHandlers<T>,
  post: (message: any) => void,
): Promise<boolean> {
  switch (message?.command) {
    case `subtitle`: {
      const fn = typeof options.subtitle === `function` ? options.subtitle : undefined;
      if (fn) {
        post({ command: `setSubtitle`, text: fn(message.shown, message.total) });
      }
      return true;
    }
    case `openInEditor`: {
      const sortColumn = options.columns[message.sortCol];
      await handlers.onOpenInEditor?.({
        query: message.query ?? ``,
        sort: sortColumn ? { columnId: sortColumn.id, direction: message.sortDir } : undefined,
      });
      return true;
    }
    case `fetchRows`: {
      await handlers.onFetchMore?.({ allRows: message.allRows === true, queryId: message.queryId });
      return true;
    }
    case `update`: {
      await handlers.onCellUpdate?.({ id: message.id, statement: message.update, bindings: message.bindings ?? [] });
      return true;
    }
    case `cancel`: {
      await handlers.onCancel?.();
      return true;
    }
    case `sortChange`: {
      await handlers.onSortChange?.({ columnId: message.columnId, direction: message.direction === `desc` ? `desc` : `asc` });
      return true;
    }
    case `searchChange`: {
      await handlers.onSearchChange?.({ query: message.query ?? `` });
      return true;
    }
  }

  return false;
}

/**
 * Replace the rows of an open data table without rebuilding the page (keeps the
 * search box focus and text). Pass the same `options` object you rendered with;
 * its `rows` are updated so later row actions resolve against the new data.
 */
export function updateDataTableRows<T>(
  post: (message: any) => void,
  options: DataTableOptions<T>,
  newRows: T[],
): void {
  options.rows = newRows;
  const model = toWire(options, ``);
  post({ command: `setRows`, rows: model.rows, subtitleTemplate: model.subtitleTemplate });
}

/**
 * Push the next page of a `streaming` table's rows without touching already-rendered DOM
 * (no full re-render — avoids O(n²) churn across many pages) or resetting a dragged column
 * width. Pass `meta.columns` on the first call (and again on a title/heading-mode change).
 */
export function appendDataTableRows<T>(
  post: (message: any) => void,
  options: DataTableOptions<T>,
  newRows: T[],
  meta: {
    isDone: boolean;
    /** The query's current id, so the webview's next fetch keeps continuing it instead of restarting */
    queryId?: string;
    columns?: DataTableColumn<T>[];
    executionTimeMs?: number;
    jobId?: string;
    updateCount?: number;
  },
): void {
  if (meta.columns) {
    updateDataTableColumns(post, options, meta.columns);
  }

  const actions = options.actions ?? [];
  const wrapEditable = options.updatable !== undefined;
  const nullableIds = nullableColumnIds(options.updatable);
  const startIndex = options.rows.length;
  const wireRows = newRows.map((row, i) => rowToWire(row, startIndex + i, options.columns, actions, wrapEditable, nullableIds));
  options.rows.push(...newRows);

  post({
    command: `appendRows`,
    rows: wireRows,
    isDone: meta.isDone,
    queryId: meta.queryId,
    executionTimeMs: meta.executionTimeMs,
    jobId: meta.jobId,
    updateCount: meta.updateCount,
  });
}

/** (Re)build a `streaming` table's header — see {@link appendDataTableRows} for when to call this directly. */
export function updateDataTableColumns<T>(
  post: (message: any) => void,
  options: DataTableOptions<T>,
  newColumns: DataTableColumn<T>[],
): void {
  options.columns = newColumns;
  const streaming = options.streaming === true;
  post({ command: `setColumns`, columns: toWireColumns(newColumns, streaming, streaming && options.serverQuery === true) });
}

/** Tell an updatable table's edited cell whether its `UPDATE` succeeded (reverts the cell text on failure) */
export function postDataTableCellResponse(post: (message: any) => void, id: number, success: boolean): void {
  post({ command: `cellResponse`, id, success });
}

/** Clears a `streaming` table's rows and shows the loading overlay again, keeping its header — call before a fresh page-1 fetch on a `serverQuery` sort/search change */
export function resetDataTableRows<T>(post: (message: any) => void, options: DataTableOptions<T>): void {
  options.rows = [];
  post({ command: `resetRows` });
}

/** Asks the table to fire {@link DataTableHandlers.onOpenInEditor} with its current state */
export function requestDataTableOpenInEditor(post: (message: any) => void): void {
  post({ command: `requestOpenInEditor` });
}

/** `serverQuery` only — marks the rows as coming from a modified query, with `text` as tooltip */
export function setDataTableQueryModification(post: (message: any) => void, text: string | undefined): void {
  post({ command: `setQueryModification`, text: text ?? `` });
}
