import * as vscode from "vscode";

/**
 * A self-contained webview data table.
 *
 * The chrome (search box, buttons, right-click menu) is built from
 * `@vscode-elements/elements`; the grid itself is a plain CSS grid with
 * `max-content` columns inside a scroll container — the same approach as the SQL
 * results view — because `<vscode-table>` is a fit-to-width component and cannot
 * scroll horizontally or show wide many-column data without truncating it.
 *
 * It is kept free of any Db2-specific dependency so that, once the API has
 * settled, the whole file can move into Core (code-for-ibmi) alongside
 * `frontendTables`.
 *
 * Features over the old FastTable pages:
 *  - client side search, sorting and pagination (the data is sent once, the
 *    webview does the rest) — for finite lists (MTIs, locks, indexes…), not
 *    streamed query result sets;
 *  - per row context menu actions (right click, the `⋯` button, or a double
 *    click for the first action) that post a message back to the extension;
 *  - a look tuned to match the results grid so it sits naturally in the same
 *    "Db2 for i" panel slot.
 */

// Inlined as raw source by webpack (see webpack.config.js) and dropped into a
// <script type="module"> tag. Requiring it here resolves to the same module
// wherever else it is required, so it is only bundled once.
const webComponents: string = require(`@vscode-elements/elements/dist/bundled.js`);

export interface DataTableColumn<T> {
  /** Stable id, used for the sort state and nothing the user sees */
  id: string;
  /** Header label */
  title: string;
  /** Plain text value for a row — used for display, search and sorting */
  value: (row: T) => string | number | null | undefined;
  /** Optional rich HTML for the cell body. Trusted: it is not escaped. */
  html?: (row: T) => string;
  /**
   * Explicit CSS grid track for this column (`"200px"`, `"minmax(80px, 1fr)"`…).
   * Defaults to `max-content` so the column is exactly as wide as its content.
   */
  width?: string;
  align?: "left" | "right" | "center";
  /** Include this column's text when matching the search box (default true) */
  searchable?: boolean;
  /** Allow clicking the header to sort by this column (default true) */
  sortable?: boolean;
}

export interface DataTableRowAction<T> {
  /** Sent back to the extension as `message.actionId` */
  id: string;
  label: string;
  /** Shown greyed on the right of the menu item, e.g. `"⌘K"` — cosmetic only */
  keybinding?: string;
  /** Return false to hide this action for a given row (default: always shown) */
  when?: (row: T) => boolean;
}

export interface DataTableOptions<T> {
  title: string;
  /** Static text, or a function of (rows shown, rows total) rebuilt as the user searches */
  subtitle?: string | ((shown: number, total: number) => string);
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Right click / double click actions available on every row it applies to */
  actions?: DataTableRowAction<T>[];
  /** Rows per page. 0 disables pagination. Default 100. */
  pageSize?: number;
  searchPlaceholder?: string;
  /** Shown when there are no rows at all, or the search matches nothing */
  emptyMessage?: string;
  /** Initial sort. Omit to keep the natural order of `rows`. */
  sort?: { columnId: string; direction?: "asc" | "desc" };
}

export interface DataTableHandlers<T> {
  /** Fired when the user picks a row action */
  onAction?: (actionId: string, row: T) => void | Promise<void>;
}

const escapeHtml = (value: unknown): string =>
  String(value ?? ``).replace(/[&<>"']/g, ch => ({
    "&": `&amp;`,
    "<": `&lt;`,
    ">": `&gt;`,
    '"': `&quot;`,
    "'": `&#39;`,
  }[ch] as string));

/**
 * Turn a plain cell value into cell HTML. JSON-looking strings are pretty-printed
 * and marked so the grid renders them with preserved indentation, the same way
 * the SQL results grid does.
 */
function formatCellValue(value: string | number | null | undefined): string {
  const str = String(value ?? ``);
  const trimmed = str.trim();
  const looksJson =
    (trimmed.startsWith(`{`) && trimmed.endsWith(`}`)) ||
    (trimmed.startsWith(`[`) && trimmed.endsWith(`]`));

  if (looksJson) {
    try {
      return `<span class="dt-json">${escapeHtml(JSON.stringify(JSON.parse(trimmed), null, 2))}</span>`;
    } catch {
      // Not actually JSON — fall through to plain text
    }
  }
  return escapeHtml(str);
}

interface WireColumn {
  title: string;
  track: string;
  align: "left" | "right" | "center";
  sortable: boolean;
}

interface WireRow {
  /** Original index — travels with the row through filter/sort/paginate */
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

function toWire<T>(options: DataTableOptions<T>) {
  const columns = options.columns;
  const actions = options.actions ?? [];

  const wireColumns: WireColumn[] = columns.map(col => ({
    title: col.title,
    track: col.width ?? `max-content`,
    align: col.align ?? `left`,
    sortable: col.sortable !== false,
  }));

  const wireRows: WireRow[] = options.rows.map((row, i) => {
    const rawValues = columns.map(col => col.value(row));
    const cells = columns.map((col, c) =>
      col.html ? col.html(row) : formatCellValue(rawValues[c]),
    );
    const searchText = columns
      .map((col, c) => (col.searchable === false ? `` : String(rawValues[c] ?? ``)))
      .join(` `)
      .toLowerCase();
    const sortKeys = rawValues.map(v => (typeof v === `number` ? v : String(v ?? ``)));
    const enabled = actions.filter(action => !action.when || action.when(row)).map(a => a.id);

    return { i, c: cells, s: searchText, k: sortKeys, a: enabled };
  });

  const wireActions = actions.map(a => ({ id: a.id, label: a.label, keybinding: a.keybinding ?? `` }));

  let initialSort = -1;
  let initialDir: "asc" | "desc" = `asc`;
  if (options.sort) {
    initialSort = columns.findIndex(col => col.id === options.sort!.columnId);
    initialDir = options.sort.direction ?? `asc`;
  }

  return {
    title: options.title,
    subtitleTemplate: typeof options.subtitle === `string` ? options.subtitle : null,
    hasSubtitleFn: typeof options.subtitle === `function`,
    columns: wireColumns,
    rows: wireRows,
    actions: wireActions,
    hasActions: wireActions.length > 0,
    pageSize: options.pageSize ?? 100,
    searchPlaceholder: options.searchPlaceholder ?? `Search…`,
    emptyMessage: options.emptyMessage ?? `Nothing to show.`,
    initialSort,
    initialDir,
  };
}

/**
 * Render a complete HTML page for the data table. Assign it to a webview's
 * `.html`, then route its messages through {@link handleDataTableMessage}. Use
 * {@link openDataTable} for the standalone-panel case.
 */
export function renderDataTable<T>(options: DataTableOptions<T>): string {
  const model = toWire(options);
  const subtitleFn = typeof options.subtitle === `function` ? options.subtitle : undefined;
  const initialSubtitle = subtitleFn
    ? subtitleFn(model.rows.length, model.rows.length)
    : (model.subtitleTemplate ?? ``);

  return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script defer type="module">${webComponents}</script>
  <style>
    /* Palette aligned with Core's FastTable (frontendTables.generateFastTable):
       a focusBorder accent, foreground-tint overlays for surfaces/zebra/borders,
       descriptionForeground for secondary text, list-hoverBackground on hover. */
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
    #search { margin-left: auto; width: min(280px, 45vw); }

    /* --- the scrollable grid --- */
    #gridScroll {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      font-size: 0.9em;
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
      white-space: nowrap;
      cursor: default;
      user-select: none;
    }
    .dt-h.sortable { cursor: pointer; }
    .dt-h .arrow { margin-left: 5px; opacity: 0.7; font-size: 0.85em; }

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

    /* Absorbs the horizontal space left over when the columns are narrower than
       the viewport, so the header band and row hover reach the right edge. */
    .dt-filler { padding: 0; max-width: none; border-right: none; }

    #empty { display: none; padding: 22px 16px; color: var(--dt-muted); text-align: center; }

    /* --- bottom bar: count + pagination --- */
    #footer {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 3px 14px;
      background-color: var(--dt-surface);
      border-top: 1px solid var(--dt-border);
    }
    #subtitle { color: var(--dt-muted); }
    #footer .spacer { flex: 1 1 auto; }
    #pager { display: flex; align-items: center; gap: 4px; }
    #pager[hidden] { display: none; }
    #rangeInfo { color: var(--dt-muted); }

    #ctxWrap { position: fixed; z-index: 1000; display: none; }
  </style>
</head>
<body style="padding: 0;">
  <div id="toolbar">
    <span id="title">${escapeHtml(model.title)}</span>
    <vscode-textfield id="search" type="search" placeholder="${escapeHtml(model.searchPlaceholder)}"></vscode-textfield>
  </div>

  <div id="gridScroll">
    <div id="grid"></div>
    <div id="empty">${escapeHtml(model.emptyMessage)}</div>
  </div>

  <div id="footer">
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
  </div>

  <div id="ctxWrap"><vscode-context-menu id="ctxMenu"></vscode-context-menu></div>

  <script defer>
    const vscode = acquireVsCodeApi();
    const MODEL = ${JSON.stringify(model)};

    const state = {
      query: "",
      page: 1,
      sortCol: MODEL.initialSort,
      sortDir: MODEL.initialDir,
      view: [],
    };

    const el = (id) => document.getElementById(id);
    const grid = el("grid");

    function gridTemplate() {
      return MODEL.columns.map((c) => c.track).join(" ") + " minmax(0, 1fr)";
    }

    // ----- header ----------------------------------------------------------
    function buildHeader() {
      grid.style.gridTemplateColumns = gridTemplate();
      MODEL.columns.forEach((col, index) => {
        const h = document.createElement("div");
        h.className = "dt-h" + (col.sortable ? " sortable" : "");
        h.textContent = col.title;
        if (col.sortable) h.addEventListener("click", () => toggleSort(index));
        const arrow = document.createElement("span");
        arrow.className = "arrow";
        arrow.dataset.for = String(index);
        h.appendChild(arrow);
        grid.appendChild(h);
      });
      const filler = document.createElement("div");
      filler.className = "dt-h dt-filler";
      grid.appendChild(filler);
      refreshArrows();
    }

    function refreshArrows() {
      document.querySelectorAll("#grid .dt-h .arrow").forEach((a) => {
        const idx = Number(a.dataset.for);
        a.textContent = idx === state.sortCol ? (state.sortDir === "asc" ? "▲" : "▼") : "";
      });
    }

    function toggleSort(index) {
      if (state.sortCol === index) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortCol = index;
        state.sortDir = "asc";
      }
      state.page = 1;
      refreshArrows();
      render();
    }

    // ----- filter / sort / paginate --------------------------------------
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

    // ----- rendering ----------------------------------------------------
    function render() {
      computeView();
      if (state.page > pageCount()) state.page = pageCount();

      // Drop existing rows, keep the header cells (columns + filler)
      const headerCount = MODEL.columns.length + 1;
      while (grid.children.length > headerCount) grid.removeChild(grid.lastChild);

      const frag = document.createDocumentFragment();
      currentPageRows().forEach((r, rowIndex) => {
        const rowEl = document.createElement("div");
        rowEl.className = "dt-row " + (rowIndex % 2 ? "even" : "odd");
        rowEl.dataset.i = String(r.i);
        if (MODEL.hasActions && r.a.length) rowEl.classList.add("actionable");
        r.c.forEach((cellHtml, c) => {
          const cell = document.createElement("div");
          cell.className = "dt-c" + (MODEL.columns[c].align !== "left" ? " " + MODEL.columns[c].align : "");
          cell.innerHTML = cellHtml;
          rowEl.appendChild(cell);
        });
        const filler = document.createElement("div");
        filler.className = "dt-c dt-filler";
        rowEl.appendChild(filler);
        frag.appendChild(rowEl);
      });
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
    el("firstPage").addEventListener("click", () => goto(1));
    el("prevPage").addEventListener("click", () => goto(state.page - 1));
    el("nextPage").addEventListener("click", () => goto(state.page + 1));
    el("lastPage").addEventListener("click", () => goto(pageCount()));

    // ----- search ------------------------------------------------------
    let searchTimer;
    el("search").addEventListener("input", (ev) => {
      clearTimeout(searchTimer);
      const value = ev.target.value || "";
      searchTimer = setTimeout(() => {
        state.query = value;
        state.page = 1;
        render();
      }, 150);
    });

    // ----- context menu ---------------------------------------------
    const ctxWrap = el("ctxWrap");
    const ctxMenu = el("ctxMenu");
    let ctxRow = null;
    ctxWrap.style.display = "none";

    function actionsFor(wireRow) {
      const allowed = new Set(wireRow.a);
      return MODEL.actions.filter((a) => allowed.has(a.id));
    }

    function openMenu(x, y, wireRow) {
      const actions = actionsFor(wireRow);
      if (!actions.length) return;
      ctxRow = wireRow;
      ctxMenu.data = actions.map((a) => ({ label: a.label, value: a.id, keybinding: a.keybinding }));
      ctxWrap.style.left = Math.max(4, Math.min(x, window.innerWidth - 240)) + "px";
      ctxWrap.style.top = Math.max(4, Math.min(y, window.innerHeight - 16 - actions.length * 28)) + "px";
      ctxWrap.style.display = "block";
      ctxMenu.show = true;
    }

    function closeMenu() {
      ctxWrap.style.display = "none";
      ctxMenu.show = false;
      ctxRow = null;
    }

    function rowFromNode(start) {
      let node = start;
      while (node && node !== document) {
        if (node.classList && node.classList.contains("dt-row")) {
          return state.view.find((r) => String(r.i) === node.dataset.i);
        }
        node = node.parentNode || node.host;
      }
      return undefined;
    }

    function rowFromEvent(ev) {
      const path = (ev.composedPath && ev.composedPath()) || [];
      for (const node of path) {
        if (node && node.classList && node.classList.contains("dt-row")) {
          return state.view.find((r) => String(r.i) === node.dataset.i);
        }
      }
      return rowFromNode(ev.target) || rowFromNode(document.elementFromPoint(ev.clientX, ev.clientY));
    }

    let lastMenuTrigger = 0;
    function triggerRowMenu(ev) {
      const wireRow = rowFromEvent(ev);
      if (!wireRow || !actionsFor(wireRow).length) return;
      // A single right-click surfaces as several of these events — suppress the
      // native menu on all of them, but only open ours once.
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      const now = Date.now();
      if (now - lastMenuTrigger < 350) return;
      lastMenuTrigger = now;
      openMenu(ev.clientX, ev.clientY, wireRow);
    }

    // The webview host may swallow "contextmenu"; also watch the raw button-2 events.
    document.addEventListener("contextmenu", triggerRowMenu, true);
    document.addEventListener("pointerup", (ev) => { if (ev.button === 2) triggerRowMenu(ev); }, true);
    document.addEventListener("mouseup", (ev) => { if (ev.button === 2) triggerRowMenu(ev); }, true);
    document.addEventListener("auxclick", (ev) => { if (ev.button === 2) triggerRowMenu(ev); }, true);

    ctxMenu.addEventListener("vsc-context-menu-select", (ev) => {
      const actionId = ev.detail && ev.detail.value;
      const row = ctxRow;
      closeMenu();
      if (actionId && row) fire(actionId, row.i);
    });

    document.addEventListener("click", (ev) => {
      if (ctxWrap.style.display !== "none" && !ev.composedPath().includes(ctxWrap)) closeMenu();
    });
    window.addEventListener("blur", closeMenu);
    el("gridScroll").addEventListener("scroll", closeMenu);

    function fire(actionId, rowIndex) {
      vscode.postMessage({ command: "rowAction", actionId, rowIndex });
    }

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
      }
    });

    buildHeader();
    render();
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
 */
export async function handleDataTableMessage<T>(
  message: any,
  options: DataTableOptions<T>,
  handlers: DataTableHandlers<T>,
  post: (message: any) => void,
): Promise<void> {
  switch (message?.command) {
    case `rowAction`: {
      const row = options.rows[message.rowIndex];
      if (row !== undefined) {
        await handlers.onAction?.(message.actionId, row);
      }
      break;
    }
    case `subtitle`: {
      const fn = typeof options.subtitle === `function` ? options.subtitle : undefined;
      if (fn) {
        post({ command: `setSubtitle`, text: fn(message.shown, message.total) });
      }
      break;
    }
  }
}

/**
 * Open a standalone webview panel (an editor tab) showing the data table with
 * its row action messages wired up. Prefer rendering into an existing view with
 * {@link renderDataTable} + {@link handleDataTableMessage} when the feature
 * already owns a panel slot.
 */
export function openDataTable<T>(
  viewType: string,
  options: DataTableOptions<T>,
  handlers: DataTableHandlers<T> = {},
  column: vscode.ViewColumn = vscode.ViewColumn.Active,
): vscode.WebviewPanel {
  const panel = vscode.window.createWebviewPanel(viewType, options.title, column, {
    enableScripts: true,
    retainContextWhenHidden: true,
  });

  panel.webview.html = renderDataTable(options);
  panel.webview.onDidReceiveMessage(message =>
    handleDataTableMessage(message, options, handlers, msg => panel.webview.postMessage(msg)),
  );

  return panel;
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
  const model = toWire(options);
  post({ command: `setRows`, rows: model.rows, subtitleTemplate: model.subtitleTemplate });
}
