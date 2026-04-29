# Boards, Persistence & Canvas UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-board support with tab UI, per-board localStorage persistence, cross-board copy/paste, and right-click-to-pan canvas interaction.

**Architecture:** Extend `storage.js` with board-scoped keys and a migration shim for existing data. Encapsulate board switching logic in a `useBoards` hook that keeps node/edge refs current so switching always saves the latest state. Wire copy/paste into the existing paste event handler (for paste) and a new keydown listener (for copy/cut), keeping both inside `useCopyPaste`.

**Tech Stack:** React 18, @xyflow/react 12, localStorage, navigator.clipboard API, crypto.randomUUID()

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `client/src/canvas/utils/storage.js` | Modify | Board CRUD + migration from legacy key |
| `client/src/canvas/utils/useBoards.js` | Create | Board list state, switch/create/rename/delete |
| `client/src/canvas/BoardTabs.jsx` | Create | Tab bar UI component |
| `client/src/canvas/utils/useCopyPaste.js` | Create | Ctrl+C/X copy, paste event handling |
| `client/src/canvas/ContentCanvas.jsx` | Modify | Wire hooks, add ReactFlow props, adjust top bar position |

---

## Task 1: Extend storage.js with board functions and migration

**Files:**
- Modify: `client/src/canvas/utils/storage.js`

- [ ] **Step 1: Add board constants and migration function**

Open `client/src/canvas/utils/storage.js`. Add these constants and the migration function after the existing constants at the top:

```js
// ─── Board persistence ──────────────────────────────────────────────────────────

const BOARDS_KEY   = 'canvas-boards-v1'
const CURRENT_KEY  = 'canvas-current-board-v1'
const BOARD_PREFIX = 'canvas-board-'
const LEGACY_KEY   = 'content-research-canvas-v1'

// Runs once on first load. Promotes the legacy single-canvas key into a board.
function migrateIfNeeded() {
  if (localStorage.getItem(BOARDS_KEY)) return  // already migrated
  const defaultBoard = { id: 'default', name: 'Tablero 1', createdAt: Date.now() }
  localStorage.setItem(BOARDS_KEY, JSON.stringify([defaultBoard]))
  localStorage.setItem(CURRENT_KEY, 'default')
  const legacy = localStorage.getItem(LEGACY_KEY)
  localStorage.setItem(
    BOARD_PREFIX + 'default',
    legacy || JSON.stringify({ nodes: [], edges: [] })
  )
}
```

- [ ] **Step 2: Add board CRUD functions**

Append these exports to the bottom of `storage.js`:

```js
export function listBoards() {
  migrateIfNeeded()
  try {
    const raw = localStorage.getItem(BOARDS_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch { return [] }
}

export function saveBoards(boards) {
  try { localStorage.setItem(BOARDS_KEY, JSON.stringify(boards)) }
  catch (e) { console.warn('No se pudo guardar los tableros:', e) }
}

export function getCurrentBoardId() {
  migrateIfNeeded()
  return localStorage.getItem(CURRENT_KEY) || 'default'
}

export function setCurrentBoardId(id) {
  localStorage.setItem(CURRENT_KEY, id)
}

export function saveBoard(id, nodes, edges) {
  try { localStorage.setItem(BOARD_PREFIX + id, JSON.stringify({ nodes, edges })) }
  catch (e) { console.warn('No se pudo guardar el tablero:', e) }
}

export function loadBoard(id) {
  try {
    const raw = localStorage.getItem(BOARD_PREFIX + id)
    if (!raw) return { nodes: [], edges: [] }
    const data = JSON.parse(raw)
    // Validate: filter nodes/edges with missing required fields
    const nodes = (data.nodes || []).filter(n => n && n.id && n.type)
    const nodeIds = new Set(nodes.map(n => n.id))
    const edges = (data.edges || []).filter(
      e => e && e.source && e.target && nodeIds.has(e.source) && nodeIds.has(e.target)
    )
    return { nodes, edges }
  } catch { return { nodes: [], edges: [] } }
}

export function deleteBoardData(id) {
  localStorage.removeItem(BOARD_PREFIX + id)
}
```

- [ ] **Step 3: Verify in browser console**

Start the dev server if not running: `cd client && npm run dev`

Open browser console and run:
```js
// Should return [{ id: 'default', name: 'Tablero 1', ... }] (or existing boards)
import('/src/canvas/utils/storage.js').then(m => console.log(m.listBoards()))
```
Expected: array with at least one board object.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/sebag/OneDrive/Desktop/bolasinamarketing/content-research"
git add client/src/canvas/utils/storage.js
git commit -m "feat: extend storage with multi-board CRUD and legacy migration"
```

---

## Task 2: Create useBoards hook

**Files:**
- Create: `client/src/canvas/utils/useBoards.js`

- [ ] **Step 1: Create the hook file**

Create `client/src/canvas/utils/useBoards.js` with this complete content:

```js
import { useState, useEffect, useRef } from 'react'
import {
  listBoards, saveBoards, getCurrentBoardId, setCurrentBoardId,
  saveBoard, loadBoard, deleteBoardData,
} from './storage'

/**
 * useBoards — manages board list + current board switching.
 *
 * ContentCanvas must call nodesRef.current = nodes and edgesRef.current = edges
 * on every render (before any effects) so switchBoard always saves the latest state.
 *
 * @param {Function} setNodes  — from useNodesState
 * @param {Function} setEdges  — from useEdgesState
 * @returns {{ boards, currentBoardId, nodesRef, edgesRef,
 *             switchBoard, createBoard, renameBoard, deleteBoard }}
 */
export function useBoards(setNodes, setEdges) {
  const [boards, setBoards] = useState(() => listBoards())
  const [currentBoardId, setCurrentBoardIdState] = useState(() => getCurrentBoardId())

  // Refs are written by ContentCanvas on every render so switchBoard
  // always reads the latest nodes/edges without stale-closure issues.
  const nodesRef = useRef([])
  const edgesRef = useRef([])

  // Load the initial board on mount
  useEffect(() => {
    const { nodes, edges } = loadBoard(currentBoardId)
    setNodes(nodes)
    setEdges(edges)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // intentionally empty — only run on mount

  function switchBoard(id) {
    if (id === currentBoardId) return
    // Save current board with the latest state from refs
    saveBoard(currentBoardId, nodesRef.current, edgesRef.current)
    // Load the new board
    const { nodes, edges } = loadBoard(id)
    setNodes(nodes)
    setEdges(edges)
    setCurrentBoardId(id)
    setCurrentBoardIdState(id)
  }

  function createBoard(name) {
    const id = 'board-' + Date.now()
    const newName = name?.trim() || `Tablero ${boards.length + 1}`
    const newBoard = { id, name: newName, createdAt: Date.now() }
    const updated = [...boards, newBoard]
    saveBoards(updated)
    saveBoard(id, [], [])
    setBoards(updated)
    switchBoard(id)
  }

  function renameBoard(id, name) {
    if (!name?.trim()) return
    const updated = boards.map(b => b.id === id ? { ...b, name: name.trim() } : b)
    saveBoards(updated)
    setBoards(updated)
  }

  function deleteBoard(id) {
    if (boards.length <= 1) return  // can't delete the last board
    const updated = boards.filter(b => b.id !== id)
    saveBoards(updated)
    deleteBoardData(id)
    setBoards(updated)
    if (currentBoardId === id) {
      // Switch to the first remaining board without saving to the deleted one
      const newId = updated[0].id
      const { nodes, edges } = loadBoard(newId)
      setNodes(nodes)
      setEdges(edges)
      setCurrentBoardId(newId)
      setCurrentBoardIdState(newId)
    }
  }

  return { boards, currentBoardId, nodesRef, edgesRef, switchBoard, createBoard, renameBoard, deleteBoard }
}
```

- [ ] **Step 2: Verify no import errors**

In the browser, check the console after saving. No red errors should appear related to `useBoards`.

- [ ] **Step 3: Commit**

```bash
git add client/src/canvas/utils/useBoards.js
git commit -m "feat: add useBoards hook for multi-board state management"
```

---

## Task 3: Create BoardTabs component

**Files:**
- Create: `client/src/canvas/BoardTabs.jsx`

- [ ] **Step 1: Create the component**

Create `client/src/canvas/BoardTabs.jsx`:

```jsx
import { useState, useRef } from 'react'

const ACCENT = '#6366f1'

/**
 * BoardTabs — fixed tab bar at the very top of the screen.
 * Double-click a tab to rename it inline.
 * Hover a tab to see the × delete button.
 */
export default function BoardTabs({ boards, currentBoardId, onSwitch, onCreate, onRename, onDelete }) {
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const inputRef = useRef(null)

  function startRename(board, e) {
    e.stopPropagation()
    setRenamingId(board.id)
    setRenameValue(board.name)
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 0)
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim())
    }
    setRenamingId(null)
  }

  function handleRenameKey(e) {
    e.stopPropagation()
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') setRenamingId(null)
  }

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 36,
        zIndex: 200,
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'stretch',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        userSelect: 'none',
      }}
    >
      <style>{`
        .board-tab { display: flex; align-items: center; gap: 5px; padding: 0 12px;
          cursor: pointer; border-right: 1px solid #f1f5f9; flex-shrink: 0;
          font-size: 11px; font-weight: 600; color: #64748b;
          transition: background 0.1s, color 0.1s; position: relative; white-space: nowrap; }
        .board-tab:hover { background: #f8fafc; }
        .board-tab.active { color: ${ACCENT}; background: ${ACCENT}08;
          border-bottom: 2px solid ${ACCENT}; }
        .board-tab .del-btn { opacity: 0; font-size: 9px; color: #94a3b8;
          background: none; border: none; cursor: pointer; padding: 1px 3px;
          border-radius: 4px; line-height: 1; transition: opacity 0.1s, color 0.1s; }
        .board-tab:hover .del-btn { opacity: 1; }
        .board-tab .del-btn:hover { color: #dc2626; background: #fef2f2; }
        .board-tab-input { font-size: 11px; font-weight: 600; color: #0f172a;
          border: 1.5px solid ${ACCENT}; border-radius: 5px; padding: 1px 6px;
          outline: none; background: #fff; width: 100px; font-family: system-ui; }
        .new-board-btn { display: flex; align-items: center; padding: 0 12px;
          font-size: 16px; color: #94a3b8; cursor: pointer; flex-shrink: 0;
          background: none; border: none; transition: color 0.1s; line-height: 1; }
        .new-board-btn:hover { color: ${ACCENT}; }
      `}</style>

      {boards.map(board => {
        const isActive = board.id === currentBoardId
        const isRenaming = renamingId === board.id
        return (
          <div
            key={board.id}
            className={`board-tab${isActive ? ' active' : ''}`}
            onClick={() => !isRenaming && onSwitch(board.id)}
            onDoubleClick={e => startRename(board, e)}
          >
            {isRenaming ? (
              <input
                ref={inputRef}
                className="board-tab-input"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleRenameKey}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <>
                <span>📋</span>
                <span>{board.name}</span>
                {boards.length > 1 && (
                  <button
                    className="del-btn"
                    onClick={e => { e.stopPropagation(); onDelete(board.id) }}
                    title="Eliminar tablero"
                  >✕</button>
                )}
              </>
            )}
          </div>
        )
      })}

      <button className="new-board-btn" onClick={onCreate} title="Nuevo tablero">＋</button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/canvas/BoardTabs.jsx
git commit -m "feat: add BoardTabs component with rename/delete/create"
```

---

## Task 4: Create useCopyPaste hook

**Files:**
- Create: `client/src/canvas/utils/useCopyPaste.js`

- [ ] **Step 1: Create the hook**

Create `client/src/canvas/utils/useCopyPaste.js`:

```js
import { useEffect, useRef } from 'react'

const CLIPBOARD_TYPE = 'rf-clipboard'

function isEditableTarget(el) {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

/**
 * useCopyPaste — Ctrl+C/X copy, paste event handling for React Flow nodes.
 *
 * Copy writes JSON to navigator.clipboard.
 * Paste reads from e.clipboardData (synchronous, no permission prompt).
 * Both coexist with the existing URL paste handler in ContentCanvas because
 * they check for the _type marker before acting.
 *
 * Uses refs internally so event listeners are registered once (empty deps),
 * never re-registering on every render.
 *
 * @param {Node[]}    nodes     — from useNodesState
 * @param {Edge[]}    edges     — from useEdgesState
 * @param {Function}  setNodes  — from useNodesState
 * @param {Function}  setEdges  — from useEdgesState
 */
export function useCopyPaste(nodes, edges, setNodes, setEdges) {
  // Refs ensure the keydown handler always reads the latest nodes/edges
  // without being re-registered on every render.
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  nodesRef.current = nodes
  edgesRef.current = edges

  // ── COPY / CUT ────────────────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e) {
      if (!e.ctrlKey && !e.metaKey) return
      if (e.key !== 'c' && e.key !== 'x') return
      if (isEditableTarget(document.activeElement)) return

      const selected = nodesRef.current.filter(n => n.selected)
      if (selected.length === 0) return

      const selectedIds = new Set(selected.map(n => n.id))
      const selectedEdges = edgesRef.current.filter(
        edge => selectedIds.has(edge.source) && selectedIds.has(edge.target)
      )

      const payload = JSON.stringify({ _type: CLIPBOARD_TYPE, nodes: selected, edges: selectedEdges })
      navigator.clipboard.writeText(payload).catch(() => {})

      if (e.key === 'x') {
        // Cut: remove selected nodes and any edges that touch them
        setNodes(nds => nds.filter(n => !selectedIds.has(n.id)))
        setEdges(eds => eds.filter(e => !selectedIds.has(e.source) && !selectedIds.has(e.target)))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setNodes, setEdges])  // stable — nodesRef/edgesRef updated in render, not in effect

  // ── PASTE ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    function handlePaste(e) {
      if (isEditableTarget(document.activeElement)) return
      const text = (e.clipboardData?.getData('text') || '').trim()
      if (!text.startsWith(`{"_type":"${CLIPBOARD_TYPE}`)) return

      let parsed
      try { parsed = JSON.parse(text) } catch { return }
      if (!parsed || parsed._type !== CLIPBOARD_TYPE) return

      e.preventDefault()
      e.stopPropagation()   // don't let the URL paste handler also run

      const pastedNodes = parsed.nodes || []
      const pastedEdges = parsed.edges || []
      if (pastedNodes.length === 0) return

      // Build a new-ID map so every paste produces unique node IDs
      const idMap = {}
      pastedNodes.forEach(n => { idMap[n.id] = 'paste-' + crypto.randomUUID() })

      const newNodes = pastedNodes.map(n => ({
        ...n,
        id: idMap[n.id],
        position: { x: (n.position?.x || 0) + 30, y: (n.position?.y || 0) + 30 },
        selected: true,
        // Clear parent relationships — pasted nodes start free
        parentId: undefined,
        data: { ...n.data, groupId: null },
      }))

      const newEdges = pastedEdges
        .filter(e => idMap[e.source] && idMap[e.target])
        .map(e => ({
          ...e,
          id: 'paste-' + crypto.randomUUID(),
          source: idMap[e.source],
          target: idMap[e.target],
        }))

      // Deselect existing nodes, then add pasted ones (selected so user can see them)
      setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), ...newNodes])
      setEdges(eds => [...eds.map(e => ({ ...e, selected: false })), ...newEdges])
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [setNodes, setEdges])
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/canvas/utils/useCopyPaste.js
git commit -m "feat: add useCopyPaste hook (Ctrl+C/X copy, paste event)"
```

---

## Task 5: Wire everything in ContentCanvas.jsx

**Files:**
- Modify: `client/src/canvas/ContentCanvas.jsx`

This task has the most changes. Do them in this order to avoid a broken intermediate state.

- [ ] **Step 1: Update imports**

At the top of `ContentCanvas.jsx`, change the storage import and add new imports:

```js
// Replace the existing storage import line:
import { saveBoard, loadBoard, saveConfig, loadConfig } from './utils/storage'
// (remove: saveCanvas, loadCanvas, clearCanvas — no longer needed directly)

// Add after the storage import:
import { useBoards } from './utils/useBoards'
import { useCopyPaste } from './utils/useCopyPaste'
import BoardTabs from './BoardTabs'
```

Also add `useReactFlow` to the `@xyflow/react` import (needed for `getNodes`/`getEdges`):
```js
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  BackgroundVariant,
} from '@xyflow/react'
```

- [ ] **Step 2: Add useReactFlow and wire useBoards inside the component**

Inside the `ContentCanvas` function, right after the existing `useNodesState`/`useEdgesState` lines (line ~170):

```js
const [nodes, setNodes, onNodesChange] = useNodesState([])
const [edges, setEdges, onEdgesChange] = useEdgesState([])

// ── Board management ──────────────────────────────────────────────────────────
const boards = useBoards(setNodes, setEdges)

// Keep board refs current on every render so switchBoard saves latest state
boards.nodesRef.current = nodes
boards.edgesRef.current = edges

// React Flow instance ref — used for fitView after board switch
const rfRef = useRef(null)
```

- [ ] **Step 3: Wire useCopyPaste**

`useReactFlow()` can only be called inside a ReactFlow provider. ContentCanvas is OUTSIDE the provider, so we pass `nodes`/`edges` arrays directly. The hook manages its own refs internally so it doesn't re-register event listeners on every render.

Add this after the `boards` lines:

```js
// ── Copy/paste ────────────────────────────────────────────────────────────────
useCopyPaste(nodes, edges, setNodes, setEdges)
```

- [ ] **Step 4: Replace the two canvas-save effects**

Remove these two existing `useEffect` blocks:
```js
// REMOVE:
useEffect(() => { saveCanvas(nodes, edges) }, [nodes, edges])

// REMOVE:
useEffect(() => {
  const { nodes: validNodes, edges: validEdges } = loadAndValidateCanvas()
  if (validNodes.length > 0 || validEdges.length > 0) {
    setNodes(validNodes)
    setEdges(validEdges)
  }
}, [setNodes, setEdges])
```

Replace them with:
```js
// Auto-save current board on every nodes/edges change
useEffect(() => {
  saveBoard(boards.currentBoardId, nodes, edges)
}, [nodes, edges, boards.currentBoardId])

// fitView after board switch (skip first mount — ReactFlow's fitView prop handles that)
const boardSwitchMountRef = useRef(true)
useEffect(() => {
  if (boardSwitchMountRef.current) { boardSwitchMountRef.current = false; return }
  const timer = setTimeout(() => rfRef.current?.fitView({ padding: 0.2 }), 60)
  return () => clearTimeout(timer)
}, [boards.currentBoardId])
```

- [ ] **Step 5: Update handleClearCanvas**

Find `handleClearCanvas` and replace `clearCanvas()` with `saveBoard(...)`:

```js
function handleClearCanvas() {
  if (!window.confirm('¿Limpiar todo el canvas? Esta acción no se puede deshacer.')) return
  setNodes([]); setEdges([])
  saveBoard(boards.currentBoardId, [], [])
  processIndex.current = 0; activeUrls.current = new Set()
}
```

- [ ] **Step 6: Capture rfRef in onInit**

In the ReactFlow JSX, update `onInit`:

```jsx
onInit={rf => { viewportRef.current = rf.getViewport(); rfRef.current = rf }}
```

- [ ] **Step 7: Add pan/selection ReactFlow props**

Still in the `<ReactFlow ...>` JSX, add these three props:

```jsx
panOnDrag={[2]}
selectionOnDrag={true}
onContextMenu={e => e.preventDefault()}
```

- [ ] **Step 8: Render BoardTabs and adjust top bar position**

In the return JSX, add `<BoardTabs>` as the first child of the root div (before the `<style>` tag):

```jsx
return (
  <div style={{ width: '100vw', height: '100vh', background: '#f1f5f9' }}>
    <BoardTabs
      boards={boards.boards}
      currentBoardId={boards.currentBoardId}
      onSwitch={boards.switchBoard}
      onCreate={() => boards.createBoard()}
      onRename={boards.renameBoard}
      onDelete={boards.deleteBoard}
    />
    <style>{/* ... existing styles ... */}</style>
    {/* ... rest of JSX ... */}
```

Then find the top bar div (currently `position: 'fixed', top: 16`) and change `top: 16` to `top: 48`:

```jsx
{/* ── TOP BAR ── */}
<div style={{
  position: 'fixed', top: 48, left: '50%', transform: 'translateX(-50%)',
  // ... rest unchanged ...
}}>
```

- [ ] **Step 9: Remove now-unused functions and imports**

Remove `loadAndValidateCanvas` and `validateCanvas` functions from the top of ContentCanvas (they're no longer called — validation now happens inside `loadBoard` in storage.js).

Also remove the `clearCanvas` import if it's still in the import line (replaced by `saveBoard(id, [], [])`).

- [ ] **Step 10: Verify in browser**

1. Open the app — you should see the tab bar at the top with "Tablero 1" (or your existing board)
2. Click ＋ — a new tab "Tablero 2" appears, canvas clears
3. Add a sticky note to Tablero 2
4. Click back to Tablero 1 — original nodes appear
5. Switch back to Tablero 2 — sticky note is still there
6. Double-click a tab — you can rename it inline
7. Refresh the page — both boards and their content survive the reload
8. Right-click drag on empty canvas — canvas pans (no context menu)
9. Left-click drag on empty canvas — selection box appears
10. Select some nodes → Ctrl+C → click ＋ new board → Ctrl+V — nodes paste into new board at +30px offset

- [ ] **Step 11: Commit**

```bash
git add client/src/canvas/ContentCanvas.jsx
git commit -m "feat: wire multi-board tabs, board persistence, copy/paste, right-click pan"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|---|---|
| Board keys per localStorage (`canvas-board-{id}`) | Task 1 |
| Migration from legacy `content-research-canvas-v1` | Task 1 `migrateIfNeeded` |
| `listBoards`, `saveBoard`, `loadBoard`, `deleteBoardData` | Task 1 |
| `useBoards` hook with switch/create/rename/delete | Task 2 |
| Refs kept current so switchBoard always saves latest | Task 2 (`nodesRef`/`edgesRef`) + Task 5 Step 2 |
| Tab bar: fixed top, click=switch, double-click=rename, ×=delete, +=create | Task 3 |
| Tab overflow hidden scrollbar | Task 3 (`scrollbarWidth: 'none'`) |
| Copy Ctrl+C → clipboard JSON | Task 4 keydown handler |
| Cut Ctrl+X → copy + remove | Task 4 keydown handler |
| Paste → new IDs, +30 offset, deselect old | Task 4 paste handler |
| Cross-board paste (system clipboard) | Task 4 uses `navigator.clipboard` / `e.clipboardData` |
| `panOnDrag={[2]}` right-click pans | Task 5 Step 7 |
| `selectionOnDrag` left drag = selection box | Task 5 Step 7 |
| Suppress context menu | Task 5 Step 7 |
| Auto-save per board | Task 5 Step 4 |
| fitView after board switch | Task 5 Step 4 |
| Top bar moved down to avoid tab bar overlap | Task 5 Step 8 |

### Placeholder scan

No TBDs, no "similar to task N", no vague error handling — all code shown in full.

### Type consistency

- `boards.currentBoardId` used in Task 5 Steps 4, 5 — matches field returned by `useBoards` in Task 2
- `boards.nodesRef` / `boards.edgesRef` written in Task 5 Step 2 — match exports from Task 2
- `boards.switchBoard` / `createBoard` / `renameBoard` / `deleteBoard` passed to BoardTabs in Task 5 Step 8 — match prop names in Task 3
- `saveBoard(id, nodes, edges)` signature used in Tasks 5 Steps 4 and 5 — matches Task 1 definition ✓
