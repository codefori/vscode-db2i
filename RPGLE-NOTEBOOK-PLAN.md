# RPG Notebook Integration — Implementation Plan

## Executive Summary

Add RPG cell support to IBM i Notebooks (vscode-db2i) using RPGLE-REPL as the
backend execution engine. Users write RPG snippets in notebook cells, the
extension calls the `REPL_EXECUTE` stored procedure with the cell source as a
CLOB, and receives results back as a SQL result set. Fixed-format ruler overlays
enhance the editing experience. A configuration setting gates the feature,
pointing to the RPGLE-REPL library.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  VS Code Notebook Cell  (languageId: "rpgle")           │
│  ┌───────────────────────────────────────────────────┐  │
│  │ dcl-s myName char(20);                            │  │
│  │ myName = 'Hello RPG';                             │  │
│  │ replPrint(myName);                                │  │
│  └───────────────────────────────────────────────────┘  │
│      Ctrl+R / Run Cell                                  │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│  IBMiController._doExecution()  (new `rpgle` case)      │
│                                                          │
│  1. Generate unique session ID                           │
│  2. CALL {lib}.REPL_EXECUTE(:source, :sessionId)         │
│  3. Read result set (returned by stored procedure)       │
│  4. Render results → NotebookCellOutput                  │
└──────────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│  IBM i  (RPGLE-REPL library)                             │
│                                                          │
│  REPL_EXECUTE stored procedure (REPLEXEC program):       │
│    1. Parse CLOB source into lines                       │
│    2. Write lines → REPLSRC (as named snippet)           │
│    3. Generate → Compile → Run (REPL pipeline)           │
│    4. Return REPLRSLT rows as result set                 │
│    5. Clean up REPLSRC snippet                           │
└──────────────────────────────────────────────────────────┘
```

---

## Phase 1: Detailed Design

### 1. Configuration Setting

**Setting:** `vscode-db2i.rpgleRepl.library`

| Property | Value |
|----------|-------|
| Type | `string` |
| Default | `""` (empty = feature disabled) |
| Description | Library containing RPGLE-REPL objects. Leave empty to disable RPG notebook cells. Install RPGLE-REPL from https://github.com/tom-writes-code/rpgle-repl |
| Scope | Global (user-level) |

**Behaviour:**
- **Empty/unset:** RPG language option is not registered for the notebook
  controller. If a user manually changes a cell to `rpgle`, execution shows a
  clear error message: _"RPG notebook cells require RPGLE-REPL. Set the
  `vscode-db2i.rpgleRepl.library` setting to the library containing RPGLE-REPL,
  or visit https://github.com/tom-writes-code/rpgle-repl for installation
  instructions."_
- **Set:** The library name is used in all SQL paths and CL calls (e.g.
  `CALL MYLIB/REPLWRPR ...`).

**Validation (on connect):** When the setting is non-empty and a connection is
established, run a lightweight check:

```sql
SELECT COUNT(*) FROM QSYS2.SYSTABLES
WHERE TABLE_SCHEMA = :lib AND TABLE_NAME = 'REPLRSLT'
```

If the table doesn't exist, show an informational warning:
_"RPGLE-REPL library 'MYLIB' does not appear to contain RPGLE-REPL objects.
RPG notebook cells will not work until RPGLE-REPL is installed."_

### 2. Language Registration

**Current state:** `supportedLanguages = ['sql', 'cl', 'shellscript']`

**Change:** Always include `rpgle` in the supported languages list. The
controller will handle the "not configured" case at execution time with a
helpful error message. This means:
- Users can always switch a cell to RPG language
- The language picker always shows RPG as an option
- Unconfigured users get guided to install RPGLE-REPL on first execution

**Serialisation:** No changes needed — the existing `metadata.tags[0]`
mechanism already stores arbitrary language IDs. An `rpgle` cell serialises
and deserialises correctly today.

**Contributes keybinding:** Add `rpgle` to the Ctrl+R keybinding activation:

```json
{
  "command": "notebook.cell.execute",
  "key": "ctrl+r",
  "mac": "cmd+r",
  "when": "editorLangId == rpgle && resourceExtname == .inb"
}
```

### 3. Execution Flow (Controller)

New case in `IBMiController._doExecution()`:

```
case 'rpgle':
```

#### Step 1 — Generate Session ID

Use a UUID-based session ID to isolate this cell execution from others:

```typescript
const sessionId = `NB-${crypto.randomUUID().substring(0, 22)}`;
```

This gives a unique 25-char ID (within the VARCHAR(28) limit) prefixed with
`NB-` to clearly identify notebook-originated sessions.

#### Step 2 — Call REPL_EXECUTE Stored Procedure

A single SQL CALL sends the cell source and receives the result set:

```typescript
const result = await selected.job.query(
  `CALL ${lib}.REPL_EXECUTE(?, ?)`,
  { parameters: [cellSource, sessionId] }
).execute();
```

The stored procedure handles everything internally:
1. Parses the CLOB into lines
2. Writes them to REPLSRC as a named snippet
3. Runs the full REPL pipeline (generate → compile → run)
4. Returns results from REPLRSLT as a result set
5. Cleans up the REPLSRC snippet

The result set columns are:

| Column | Type | Description |
|--------|------|-------------|
| `LINE_NUMBER` | DEC(4,0) | Source line that produced the result |
| `RESULT_NUMBER` | DEC(4,0) | Sequential result ID for the line |
| `RESULT_DESCRIPTION` | VARCHAR(1000) | The result text |
| `LOOP_COUNT` | DEC(5,0) | Loop iteration count |
| `RESULT_TYPE` | CHAR(32) | EVALUATION, TEST-SUCCESS, TEST-FAILURE, etc. |

#### Step 3 — Render Results

See [Section 5: Result Rendering](#5-result-rendering).

#### Step 4 — Cleanup

The stored procedure cleans up REPLSRC internally. REPLRSLT rows remain
tagged by `external_session_id` and accumulate harmlessly; periodic cleanup
can be added later if needed.

### 4. REPL_EXECUTE Stored Procedure

The stored procedure `REPL_EXECUTE` (backed by the `REPLEXEC` SQLRPGLE program)
provides a single-call interface for notebook integration. It replaces the
multi-step INSERT → CALL REPLWRPR → SELECT → DELETE dance with one SQL CALL
that accepts source and returns results.

**SQL signature:**

```sql
CALL {lib}.REPL_EXECUTE(
  'dcl-s greeting char(20);
   greeting = ''Hello from RPG!'';
   replPrint(greeting);',
  'NB-session-123'
)
```

**Internal flow (REPLEXEC.SQLRPGLE):**

1. Derive snippet name from session ID (first 20 chars)
2. Clear any previous snippet/results for this name
3. Parse CLOB by line-feed character, INSERT each line into REPLSRC as a
   named snippet
4. Call `createGeneratedSourceObject()` with the snippet location
5. Call `compileGeneratedSourceObject()` in batch mode
6. Call `runGeneratedProgramObject()`
7. UPDATE all REPLRSLT rows for this job with the external session ID
8. On any error, record the error via `replResult_recordCustomMessage()` and
   still tag results with the external session ID
9. DECLARE/OPEN a cursor on REPLRSLT filtered by external session ID
10. SET RESULT SETS to return the cursor to the caller
11. Clean up REPLSRC snippet rows and REPLVARS

**Registration (run after building REPLEXEC):**

```sql
CREATE OR REPLACE PROCEDURE {lib}.REPL_EXECUTE (
  IN P_SOURCE CLOB(64K),
  IN P_SESSION_ID VARCHAR(28)
)
DYNAMIC RESULT SETS 1
EXTERNAL NAME '{lib}/REPLEXEC'
LANGUAGE RPGLE
PARAMETER STYLE GENERAL;
```

**Why this approach:**
- Single SQL round-trip from the extension
- All REPLSRC/REPLRSLT management is internal to the procedure
- Error paths are handled — errors are always tagged with the session ID
- The extension never touches REPLSRC or REPLRSLT directly
- REPLWRPR and REPLPRTR remain available for 5250 and CI/CD use

### 5. Result Rendering

Results from `REPLRSLT` should be rendered in a rich, RPG-aware format.

#### 5a. Basic Table View

The simplest approach: render a markdown table mapping each source line to its
results.

```markdown
| Line | Code                              | Result           | Type       |
|------|-----------------------------------|------------------|------------|
| 1    | dcl-s myName char(20);            |                  |            |
| 2    | myName = 'Hello RPG';             | Hello RPG        | EVALUATION |
| 3    | replPrint(myName);                | Hello RPG        | EVALUATION |
```

#### 5b. Rich HTML View (Recommended)

A styled HTML output that mirrors the REPL experience:

```
┌──────────────────────────────────────────────────────────────────┐
│  1 │ dcl-s myName char(20);                                     │
│  2 │ myName = 'Hello RPG';                        → Hello RPG   │
│  3 │ replPrint(myName);                            → Hello RPG   │
└──────────────────────────────────────────────────────────────────┘
```

**Design:**
- Each source line is shown with its line number
- Results (from REPLRSLT) appear right-aligned or on the same line, styled
  distinctly (e.g. colour-coded by `result_type`)
- `EVALUATION` results: shown in muted colour alongside the line
- `TEST-SUCCESS`: green checkmark ✓ with result text  
- `TEST-FAILURE`: red cross ✗ with result text
- Loop results: show loop count (e.g. `→ Loop executed ×5`)
- Compile errors: red banner at the top with error details
- Lines with no results: shown without decoration

**HTML structure:**

```html
<div class="rpgle-results">
  <div class="rpgle-line">
    <span class="line-num">1</span>
    <span class="code">dcl-s myName char(20);</span>
  </div>
  <div class="rpgle-line has-result">
    <span class="line-num">2</span>
    <span class="code">myName = 'Hello RPG';</span>
    <span class="result evaluation">→ Hello RPG</span>
  </div>
  <div class="rpgle-line has-result">
    <span class="line-num">3</span>
    <span class="code">replPrint(myName);</span>
    <span class="result evaluation">→ Hello RPG</span>
  </div>
</div>
```

**CSS theming:** Use VS Code CSS variables for theme compatibility:
- `--vscode-editor-foreground` for code text
- `--vscode-testing-iconPassed` for test successes
- `--vscode-testing-iconFailed` for test failures
- `--vscode-descriptionForeground` for evaluation results
- `--vscode-editor-background` for the code background
- Monospace font (`var(--vscode-editor-font-family)`) for code lines

#### 5c. Error Handling in Rendering

- **REPLWRPR returns -1:** Show error banner with the error message
- **No results returned:** Show "Snippet compiled and ran successfully (no
  output)" message
- **Compilation failure:** Parse the error message and show it prominently.
  Consider also fetching from the job log or spool file for more detail.

### 6. Fixed-Format Ruler Overlay

When editing RPG cells, overlay column rulers for fixed-format specifications.

#### Detection Logic

A line is fixed-format if its first non-blank character (in column 6 position,
or equivalently the first character in the cell since notebooks don't have
sequence numbers) is an uppercase letter that corresponds to an RPG spec type.

RPGLE-REPL already has this logic in `REPL_INS.codeIsFixedFormat()` and
`REPL_EVAL.codeIsFixedFormat()`:

> First character is one of: `F`, `I`, `O`, `D`, `C`, `H`, `P`

For the notebook, detect on the **first character of the line** being one of
these uppercase letters.

#### Ruler Display

When any line in the cell starts with a fixed-format character, enable ruler
mode for the cell. The ruler should match the spec type being used.

**RPG IV Fixed-Format Column Rulers:**

```
H-spec:  ....+....1....+....2....+....3....+....4....+....5....+....6....+....7..
F-spec:  FFilename++IPEASFRlen+LKlen+AIDevice+.Functions+++++++++++++++++++++++++
D-spec:  DName+++++++++++ETDsFrom+++To/L+++IDc.Functions+++++++++++++++++++++++++
I-spec:  IFilename++SqNORiPos1+NCCPos2+CCPos3+NCC..................................
C-spec:  CL0N01Factor1+++++++Opcode(E)+Factor2+++++++Result++++++++Len++D+HiLoEq..
O-spec:  OFilename++DF..N01N02N03Excnam++++B++A++Sb+Sa+...........................
P-spec:  PName+++++++++++..B...................Functions++++++++++++++++++++++++++++
```

#### Implementation

This should be a **VS Code editor decoration** applied to cells with
`languageId === 'rpgle'`, not part of the cell output. Use:

```typescript
vscode.window.onDidChangeActiveTextEditor(editor => {
  if (isNotebookCellEditor(editor) && editor.document.languageId === 'rpgle') {
    applyFixedFormatRulers(editor);
  }
});
```

**Approach — Editor Decorations:**

- Create `DecorationTypes` for ruler lines
- Detect the spec type of each line (first character)
- Apply a decoration at line 0 (or as a sticky header) showing the ruler for
  the detected spec type(s)
- Use `vscode.DecorationRenderOptions` with `before` pseudo-element or an
  overlay approach
- The ruler text should be in a muted green colour (matching the 5250 REPL
  experience)

**Alternative — Simpler Approach with Status Bar:**

If editor decorations prove too complex for notebook cells, show the ruler in
the status bar or as a hover tooltip when the cursor is on a fixed-format line.

**Alternative — Top-of-cell Comment:**

```rpgle
//  ....+....1....+....2....+....3....+....4....+....5....+....6....+....7..
//  CL0N01Factor1+++++++Opcode(E)+Factor2+++++++Result++++++++Len++D+HiLoEq
C                   EVAL      MYVAR = 'HELLO'
```

Auto-insert the ruler as a comment at the top of the cell when fixed-format is
detected. This is the simplest approach and requires no decoration API — the
ruler is simply part of the cell content. However, it would need to be stripped
before sending to REPLSRC.

### 7. Serialisation

No changes needed to the serialisation format. The existing Jupyter-compatible
format already supports arbitrary language IDs via `metadata.tags[0]`. An RPG
cell serialises as:

```json
{
  "cell_type": "code",
  "metadata": { "tags": ["rpgle"] },
  "source": "dcl-s myName char(20);\nmyName = 'Hello RPG';\nreplPrint(myName);",
  "outputs": [...]
}
```

### 8. Export (HTML)

The export function in `export.ts` needs a new case for `rpgle` cells. It
should either:
- Re-execute the cell and render the rich HTML, or
- Use cached outputs if available

---

## Identified Gaps

### Gap 1: 71-Character Line Limit — RESOLVED

**Status:** Fixed. `REPLSRC.code` increased to `VARCHAR(200)`. Source PF record
length increased from 128 to 240 (giving 220 usable characters). Template
`t_lineOfCode.code` updated to `char(200)`.

### ~~Gap 2: REPLWRPR Cannot Read by Arbitrary Session ID~~ — RESOLVED

**Status:** No longer relevant. The `REPL_EXECUTE` stored procedure handles
everything internally — no need for the extension to write to REPLSRC or call
REPLWRPR.

### Gap 3: Session ID for Results Correlation — RESOLVED

**Status:** Fixed. `REPLWRPR` now tags results with `external_session_id` in
all error paths. `REPLEXEC` also handles this correctly.

### Gap 4: Concurrent Cell Execution

**Problem:** If two RPG cells are executed simultaneously (or via "Run All"),
they share the same RPGLE-REPL tables. The snippet-based approach helps
isolate source, but the compilation and execution pipeline in RPGLE-REPL uses
fixed names:
- Module: `QTEMP/REPL_MOD`
- Program: `QTEMP/REPL_PGM`
- Source: `QTEMP/QREPL_SRC(REPL_SRC)`

Since these are in `QTEMP`, they're job-scoped. If the extension uses a
**single SQL job** to run REPLWRPR, sequential execution is fine. But parallel
execution within the same job would collide.

**Resolution:** Execute RPG cells sequentially (the existing controller loop
already does this — `for...of` with `await`). Document that RPG cells cannot
run in parallel.

### Gap 5: Control Statements (ctl-opt)

**Problem:** The 5250 REPL has F16 to set control statements (ctl-opt). These
are stored in REPLSRC with `source_type = 'control'`. How should notebook
cells handle ctl-opt?

**Recommendations:**

1. **Inline approach:** Allow users to write `ctl-opt` at the top of their RPG
   cell. RPGLE-REPL already handles this naturally — if the first line is a
   control statement, it becomes part of the generated source.

2. **Separate cell approach:** Allow a dedicated "RPG Control" cell type that
   sets session-wide ctl-opt. This is more complex and probably unnecessary for
   v1.

3. **Use defaults:** Rely on the organisation/user default ctl-opt configured
   in RPGLE-REPL. This works without any changes.

**Recommendation:** Go with option 1 (inline) for simplicity. Users write
`ctl-opt` at the top of their cell if needed. The REPLWRPR/REPL_GEN pipeline
handles ctl-opt in the mainline source automatically.

**Actually, wait** — looking more carefully at the code: `REPL_GEN` fetches
control statements separately via `fetchSessionControlStatement()`, which
reads from REPLSRC where `source_type = 'control'`. Mainline code with
`ctl-opt` in it would be treated as regular code and may conflict.

**Revised recommendation:** Either:
- (a) Write any `ctl-opt` lines to REPLSRC with `source_type = 'control'`
  separately, or
- (b) Verify that RPGLE-REPL handles inline `ctl-opt` in mainline code
  gracefully (it probably does since it generates valid SQLRPGLE, and the
  compiler would accept `ctl-opt` at the top of mainline). Need to test this.

### Gap 6: Error Diagnostics Quality

**Problem:** When compilation fails, REPLWRPR writes a generic error message
to stdout/stderr. The actual compiler errors are in the job log or spool file.
The extension has no easy way to retrieve detailed compiler diagnostics.

**Recommendations:**

1. **Check spool files:** After a REPLWRPR failure, query
   `QSYS2.OUTPUT_QUEUE_ENTRIES` for the latest spool file containing CRTSQLRPGI
   output.

2. **Query job log:** Use `QSYS2.JOBLOG_INFO()` to fetch recent messages.

3. **Use verbosity level 3:** Set `STD('3')` on REPLWRPR to get full compiler
   output on stdout. Parse this output for error messages.

4. **RPGLE-REPL enhancement:** Add a results table entry for compilation
   errors that captures the error text. Currently, `writeError()` only writes
   a generic message.

**Recommendation:** Use verbosity level 2 or 3 and parse the CL command
output. For v1, this gives enough information. Consider RPGLE-REPL
enhancements for v2.

### Gap 7: Multi-Cell State

**Problem:** In the 5250 REPL, all code exists in a single session. Variables
declared on one line are available on subsequent lines. In notebooks, users
might expect variables declared in cell 1 to be available in cell 2.

**Resolution:** Each cell is independent. This matches how SQL notebook cells
work (each is a separate statement). Document this clearly:

_"Each RPG cell is compiled and run independently. Variables declared in one
cell are not available in other cells. Use a single cell for code that needs
shared state."_

This is actually consistent with how RPGLE-REPL works — each "Run" compiles
the entire snippet as one program.

### Gap 8: Large Result Sets and Loops

**Problem:** If RPG code has a loop that executes 10,000 times, REPLRSLT could
have 10,000+ rows. The loop_count mechanism helps (it merges them), but
`replPrint()` inside a loop would generate individual rows.

**Resolution:** Cap the number of results displayed (e.g. first 500 rows) and
show a "truncated" message. This prevents the notebook output from becoming
unwieldy.

---

## Changes Required to RPGLE-REPL

### Changes Made

| Change | Status |
|--------|--------|
| `REPLSRC.code` increased from `VARCHAR(71)` to `VARCHAR(200)` | Done |
| `t_lineOfCode.code` increased from `char(71)` to `char(200)` | Done |
| Source PF RCDLEN increased from 128 to 240 in `REPL_GEN` | Done |
| `REPLWRPR` now tags `external_session_id` on all error paths | Done |
| New `REPLEXEC.SQLRPGLE` stored procedure program | Done |
| New `REPLEXEC.SQL` DDL for procedure registration | Done |
| Build rules updated for REPLEXEC program | Done |

### Remaining Considerations

| Item | Notes |
|------|-------|
| The 5250 REPL display remains at 71 chars | By design — terminal width constraint |
| REPLEXEC CLOB line-splitting uses EBCDIC LF (x'25') | JDBC converts Unicode LF to EBCDIC LF |
| REPLRSLT rows accumulate across executions | Harmless; add periodic cleanup later if needed |

---

## Implementation Tasks (vscode-db2i)

### Task 1: Configuration Setting

**Files:** `package.json`, `src/configuration.ts`

- Add `vscode-db2i.rpgleRepl.library` setting to `package.json` contributes
- Add helper method to `Configuration` class
- Add validation on connect

### Task 2: Register RPG Language  

**Files:** `src/notebooks/Controller.ts`, `src/notebooks/contributes.json`

- Add `rpgle` to `supportedLanguages` array
- Add Ctrl+R keybinding for `rpgle` cells
- Language registration in notebook contributes

### Task 3: RPG Execution Logic

**Files:** `src/notebooks/Controller.ts` (or new file
`src/notebooks/logic/rpgle.ts`)

- Session ID generation (`NB-` + UUID, max 28 chars)
- Single SQL CALL to `{lib}.REPL_EXECUTE(:source, :sessionId)`
- Parse returned result set into source-line-to-result map
- Handle errors (procedure may return error rows with `result_type` info)
- No direct REPLSRC/REPLRSLT access needed from the extension

### Task 4: Result Rendering  

**Files:** new `src/notebooks/logic/rpgleResults.ts`

- HTML generation for RPG results display
- CSS theming with VS Code variables
- Error state rendering
- Test result colour coding

### Task 5: Fixed-Format Ruler  

**Files:** new `src/notebooks/logic/rpgleRuler.ts`

- Fixed-format detection
- Ruler decoration types
- Editor decoration application
- Spec-type to ruler mapping

### Task 6: Export Support  

**Files:** `src/notebooks/logic/export.ts`

- Add `rpgle` case to export function
- Re-execute or use cached output

### Task 7: Serialisation Verification

**Files:** `src/notebooks/IBMiSerializer.ts`

- Verify `rpgle` language round-trips correctly (it should work as-is)
- Add tests if not already covered

---

## Is This the Right Approach?

**Yes.** The `REPL_EXECUTE` stored procedure provides a clean, single-call
interface between the extension and RPGLE-REPL.

**Strengths:**
- Single SQL round-trip — no multi-step INSERT/CALL/SELECT/DELETE
- All internal state management (REPLSRC, REPLRSLT, REPLVARS) is encapsulated
- Error paths are handled — errors are always tagged and returned
- Uses RPGLE-REPL service programs directly (same pipeline as 5250 REPL)
- REPLWRPR and REPLPRTR remain untouched for 5250 and CI/CD use
- Extension code is simple — just CALL and render

**Alternatives considered and rejected:**

1. **Multi-step via REPLWRPR:** INSERT into REPLSRC, CALL REPLWRPR via CL,
   SELECT from REPLRSLT, DELETE cleanup. Works but requires 4+ round-trips
   and direct table manipulation from the extension.

2. **Direct service program calls:** Would require binding to RPGLE-REPL
   service programs from the server component. Too tightly coupled and requires
   a Java/native bridge.

3. **SSH shell execution of `replwrpr.sh`:** Slower (shell startup, PASE
   overhead) and harder to correlate results.

---

## Implementation Order

```
Phase 2a: Foundation
  ├── Task 1: Configuration setting
  ├── Task 2: Language registration
  └── Task 7: Serialisation verification

Phase 2b: Core Execution
  ├── Task 3: RPG execution logic
  └── Task 4: Result rendering

Phase 2c: Polish
  ├── Task 5: Fixed-format ruler
  └── Task 6: Export support
```

---

## Open Questions

1. **Should RPG cells share state across cells?** Current plan: no, each cell
   is independent. This is simpler and avoids complex state management. Users
   can write all related code in one cell.

2. **Should we support `/COPY` and `/INCLUDE` in notebook cells?** RPGLE-REPL
   supports this natively. It should "just work" since the generated source
   goes through the normal RPGLE-REPL pipeline.

3. **Should the ruler be auto-inserted or interactive?** Auto-detecting
   fixed-format and showing rulers is the plan. Should users be able to
   toggle rulers on/off?

4. **What happens to REPLSRC snippets if the extension crashes mid-execution?**
   Orphaned snippet rows would accumulate. Consider a periodic cleanup or
   unique prefix-based cleanup on startup.

5. **Should we support the `replPrint()` and `replEquals()` helpers explicitly
   in documentation?** These are the primary ways to output results. The
   auto-evaluation of assignments is a bonus.
