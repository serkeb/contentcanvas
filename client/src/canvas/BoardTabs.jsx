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
