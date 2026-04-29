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
