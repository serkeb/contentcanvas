/**
 * useBoards — board management backed by Supabase.
 *
 * All reads/writes go to the `boards` table (RLS-protected by user_id).
 * Auto-save is debounced 1.5s to avoid hammering the DB on every node drag.
 */
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const SAVE_DEBOUNCE_MS = 1500

export function useBoards(setNodes, setEdges) {
  const [boards, setBoards]                 = useState([])       // [{ id, name }]
  const [currentBoardId, setCurrentBoardId] = useState(null)
  const [isLoaded, setIsLoaded]             = useState(false)

  // Always-current refs so async callbacks (switchBoard, clear) read latest state
  const nodesRef    = useRef([])
  const edgesRef    = useRef([])
  const userIdRef   = useRef(null)
  const saveTimer   = useRef(null)

  /* ── Init: get user → load boards ─────────────────────────────────────── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        userIdRef.current = data.user.id
        initBoards(data.user.id)
      }
    })
  }, [])

  async function initBoards(uid) {
    const { data, error } = await supabase
      .from('boards')
      .select('id, name, nodes, edges, is_default, created_at')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[useBoards] Error loading boards:', error.message)
      setIsLoaded(true)
      return
    }

    let list = data || []

    // First time: create a default board
    if (list.length === 0) {
      const { data: created, error: createErr } = await supabase
        .from('boards')
        .insert({ user_id: uid, name: 'Tablero 1', is_default: true, nodes: [], edges: [] })
        .select('id, name, nodes, edges, is_default, created_at')
        .single()

      if (createErr) {
        console.error('[useBoards] Error creating default board:', createErr.message)
        setIsLoaded(true)
        return
      }
      list = [created]
    }

    // Populate state
    setBoards(list.map(b => ({ id: b.id, name: b.name })))

    const active = list.find(b => b.is_default) || list[0]
    setCurrentBoardId(active.id)
    setNodes(active.nodes || [])
    setEdges(active.edges || [])
    setIsLoaded(true)
  }

  /* ── Debounced auto-save (called by ContentCanvas on nodes/edges change) ─ */
  function saveCurrentBoard(boardId, nodes, edges) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      supabase
        .from('boards')
        .update({ nodes, edges })
        .eq('id', boardId)
        .then(({ error }) => {
          if (error) console.error('[useBoards] Auto-save error:', error.message)
        })
    }, SAVE_DEBOUNCE_MS)
  }

  /* ── Immediate save (used before switching boards) ─────────────────────── */
  async function flushSave(boardId) {
    clearTimeout(saveTimer.current)
    const { error } = await supabase
      .from('boards')
      .update({ nodes: nodesRef.current, edges: edgesRef.current })
      .eq('id', boardId)
    if (error) console.error('[useBoards] Flush save error:', error.message)
  }

  /* ── Switch board ───────────────────────────────────────────────────────── */
  async function switchBoard(id) {
    if (id === currentBoardId) return

    // Save current board immediately before switching
    await flushSave(currentBoardId)

    // Load the target board's data
    const { data, error } = await supabase
      .from('boards')
      .select('nodes, edges')
      .eq('id', id)
      .single()

    if (error) {
      console.error('[useBoards] Error switching board:', error.message)
      return
    }

    setNodes(data.nodes || [])
    setEdges(data.edges || [])
    setCurrentBoardId(id)
  }

  /* ── Create board ───────────────────────────────────────────────────────── */
  async function createBoard(name) {
    const newName = name?.trim() || `Tablero ${boards.length + 1}`
    const { data, error } = await supabase
      .from('boards')
      .insert({ user_id: userIdRef.current, name: newName, nodes: [], edges: [] })
      .select('id, name')
      .single()

    if (error || !data) {
      console.error('[useBoards] Error creating board:', error?.message)
      return
    }

    const updated = [...boards, { id: data.id, name: data.name }]
    setBoards(updated)
    await switchBoard(data.id)
  }

  /* ── Rename board ───────────────────────────────────────────────────────── */
  async function renameBoard(id, name) {
    if (!name?.trim()) return
    const trimmed = name.trim()
    const { error } = await supabase
      .from('boards')
      .update({ name: trimmed })
      .eq('id', id)
    if (error) { console.error('[useBoards] Rename error:', error.message); return }
    setBoards(prev => prev.map(b => b.id === id ? { ...b, name: trimmed } : b))
  }

  /* ── Delete board ───────────────────────────────────────────────────────── */
  async function deleteBoard(id) {
    if (boards.length <= 1) return

    const { error } = await supabase.from('boards').delete().eq('id', id)
    if (error) { console.error('[useBoards] Delete error:', error.message); return }

    const updated = boards.filter(b => b.id !== id)
    setBoards(updated)

    if (currentBoardId === id) {
      // Load the next board without saving to the deleted one
      const next = updated[0]
      const { data } = await supabase
        .from('boards')
        .select('nodes, edges')
        .eq('id', next.id)
        .single()

      setNodes(data?.nodes || [])
      setEdges(data?.edges || [])
      setCurrentBoardId(next.id)
    }
  }

  /* ── Clear current board (wipe nodes+edges, keep the board row) ─────────── */
  async function clearBoard(boardId) {
    clearTimeout(saveTimer.current)
    await supabase
      .from('boards')
      .update({ nodes: [], edges: [] })
      .eq('id', boardId)
  }

  return {
    boards,
    currentBoardId,
    isLoaded,
    nodesRef,
    edgesRef,
    saveCurrentBoard,
    switchBoard,
    createBoard,
    renameBoard,
    deleteBoard,
    clearBoard,
  }
}
