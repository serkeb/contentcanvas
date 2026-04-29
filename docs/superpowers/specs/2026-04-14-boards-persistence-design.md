# Boards, Persistence & Canvas UX — Design Spec
**Date:** 2026-04-14  
**Status:** Approved

---

## Overview

Add multi-board support (tabs at top), per-board local persistence (localStorage), copy/paste of node selections across boards, and improved canvas mouse interaction (right-click to pan, left-click drag to select).

---

## 1. Data Model

Four localStorage keys:

```
canvas-boards-v1          → [{ id: string, name: string, createdAt: number }]
canvas-current-board-v1   → string  (active board id)
canvas-board-{id}         → { nodes: Node[], edges: Edge[] }
```

**Migration on first load:** If `canvas-boards-v1` is absent but `content-research-canvas-v1` (legacy key) exists, migrate it automatically:
- Create board `{ id: "default", name: "Tablero 1", createdAt: Date.now() }`
- Copy legacy data to `canvas-board-default`
- Write `canvas-boards-v1` and `canvas-current-board-v1`
- Leave legacy key intact (silent migration, non-destructive)

If neither exists: create an empty `"Tablero 1"` board and set it as current.

---

## 2. `storage.js` — New Board Functions

Add to existing file (keep all existing exports unchanged):

```ts
listBoards(): Board[]             // reads canvas-boards-v1, runs migration if needed
getCurrentBoardId(): string       // reads canvas-current-board-v1
setCurrentBoardId(id: string)     // writes canvas-current-board-v1
saveBoard(id: string, nodes, edges)  // writes canvas-board-{id}
loadBoard(id: string): { nodes, edges }  // reads canvas-board-{id}
deleteBoardData(id: string)       // removes canvas-board-{id}
saveBoards(boards: Board[])       // writes canvas-boards-v1
```

All functions are synchronous, wrapped in try/catch. Failures log a warning and return safe defaults.

---

## 3. `useBoards.js` — Hook

```ts
useBoards(nodes, edges, setNodes, setEdges) → {
  boards: Board[],
  currentBoardId: string,
  switchBoard(id: string): void,
  createBoard(name?: string): void,
  renameBoard(id: string, name: string): void,
  deleteBoard(id: string): void,
}
```

**Behavior:**
- On init: loads `listBoards()` and `getCurrentBoardId()`, loads that board's nodes/edges
- `switchBoard(id)`: saves current nodes/edges to current board → sets new `currentBoardId` → loads new board's nodes/edges. **`fitView` is NOT called inside the hook** — ContentCanvas handles it via a `useEffect(() => { rfInstance?.fitView() }, [currentBoardId])`
- `createBoard(name?)`: generates `id = "board-" + Date.now()`, name defaults to `"Tablero N"` (N = boards.length + 1), saves empty board, calls `switchBoard`
- `renameBoard(id, name)`: updates boards list, saves
- `deleteBoard(id)`: if only 1 board → no-op; otherwise removes from list, deletes board data, if deleted board was current → switch to first remaining board
- Auto-save: ContentCanvas's existing `useEffect([nodes, edges])` becomes `saveBoard(currentBoardId, nodes, edges)` — no change to timing

---

## 4. `BoardTabs.jsx` — Component

**Layout:** `position: fixed; top: 0; left: 66px; right: 0; height: 36px; z-index: 100`  
Background: white, bottom border `1px solid #e2e8f0`

**Each tab:**
- Click → `switchBoard(id)`
- Double-click → inline rename (replace label with `<input>`, blur/Enter commits, Escape cancels)
- ✕ button → `deleteBoard(id)` (only shown on hover; hidden if only 1 board)
- Active tab: accent color background `#6366f108`, `border-bottom: 2px solid #6366f1`, text color `#6366f1`
- Inactive tab: `color: #64748b`, hover `background: #f8fafc`

**Overflow:** `overflow-x: auto; scrollbar-width: none` — horizontal scroll when many boards

**＋ button:** At end of tab list. Click → `createBoard()` with auto-generated name

**Props:** `{ boards, currentBoardId, onSwitch, onCreate, onRename, onDelete }`

---

## 5. `useCopyPaste.js` — Hook

```ts
useCopyPaste(getNodes, getEdges, setNodes, setEdges, deleteElements)
```

Attaches `keydown` listener on `window`. Guards: skip if `e.target` is `INPUT`, `TEXTAREA`, or has `contenteditable`.

**Ctrl+C (copy):**
1. `selected = getNodes().filter(n => n.selected)`
2. `selectedIds = new Set(selected.map(n => n.id))`
3. `selectedEdges = getEdges().filter(e => selectedIds.has(e.source) && selectedIds.has(e.target))`
4. Serialize `{ _type: 'rf-clipboard', nodes: selected, edges: selectedEdges }` → `navigator.clipboard.writeText(json)`

**Ctrl+X (cut):** Same as copy, then `deleteElements({ nodes: selected, edges: selectedEdges })`

**Ctrl+V (paste):**
1. `navigator.clipboard.readText()` → parse JSON
2. Validate `_type === 'rf-clipboard'`
3. Build ID map: `old id → "paste-" + crypto.randomUUID()`
4. New nodes: same data, new id, position offset `+30, +30`, `selected: true`
5. New edges: same data, new id, remap source/target via ID map
6. `setNodes(nds => [...nds.map(n => ({...n, selected: false})), ...newNodes])`
7. `setEdges(eds => [...eds.map(e => ({...e, selected: false})), ...newEdges])`

**Error handling:** If clipboard read fails (permissions) or JSON is invalid → silent no-op.

---

## 6. `ContentCanvas.jsx` — Changes

### ReactFlow props added:
```jsx
panOnDrag={[2]}                          // right mouse button pans
selectionOnDrag={true}                   // left drag = selection box
onContextMenu={e => e.preventDefault()}  // suppress browser context menu
```

### Hooks wired:
```jsx
const boards = useBoards(nodes, edges, setNodes, setEdges, rfInstance)
const { } = useCopyPaste(getNodes, getEdges, setNodes, setEdges, deleteElements)
```

### Auto-save effect change:
```js
// Before:
useEffect(() => { saveCanvas(nodes, edges) }, [nodes, edges])
// After:
useEffect(() => { saveBoard(boards.currentBoardId, nodes, edges) }, [nodes, edges, boards.currentBoardId])
```

### Mount effect change:
Remove `loadAndValidateCanvas()` call — `useBoards` handles initial load.

### Clear canvas:
`handleClearCanvas` resets nodes/edges to `[]` and also calls `saveBoard(currentBoardId, [], [])`.

### Render:
`<BoardTabs>` rendered as first child of root div (before ReactFlow). The top bar, left toolbar, and other fixed elements are unaffected.

---

## 7. Layout Impact

The tab bar sits at `top: 0` with `height: 36px`. The existing floating top bar is at `top: 16` — it now appears below the tab bar (needs to move to `top: 36`). The ReactFlow canvas fills the full viewport as before; the tab bar overlays only the very top edge of the canvas background (dots), which is visually fine.

---

## 8. Files Changed

| File | Action |
|---|---|
| `utils/storage.js` | Extend with board functions |
| `utils/useBoards.js` | New hook |
| `nodes/BoardTabs.jsx` | New component (or `canvas/BoardTabs.jsx`) |
| `utils/useCopyPaste.js` | New hook |
| `canvas/ContentCanvas.jsx` | Wire all above, add ReactFlow props |

---

## 9. Out of Scope

- Cloud sync / Supabase persistence (future)
- Board thumbnails / preview on hover
- Board ordering (drag to reorder tabs)
- Export/import boards to file
