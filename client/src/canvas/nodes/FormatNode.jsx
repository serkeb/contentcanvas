import { useState, useRef, useCallback, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, useReactFlow, NodeResizer, NodeToolbar } from '@xyflow/react'
import { X, Plus, Trash2, Lock, Unlock, Maximize2, Minimize2, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'

const ACCENT = '#10b981'

const PRIORITIES = [
  { name: 'alta',  color: '#ef4444' },
  { name: 'media', color: '#f59e0b' },
  { name: 'baja',  color: '#22c55e' },
]

function FormatNode({ id, data, selected }) {
  const { setNodes, deleteElements } = useReactFlow()
  const nodeRef = useRef(null)

  const {
    format = 'table',
    title = 'Formato',
    columns = [],
    rows = [],
    cards = {},
    content = '',
    events = [],
    month,
    year,
  } = data

  // ── Local state ──────────────────────────────────────────────────────────────
  const [localCards, setLocalCards]     = useState(cards || {})
  const [localRows, setLocalRows]       = useState(rows || [])
  const [localColumns, setLocalColumns] = useState(columns || [])
  const [localContent, setLocalContent] = useState(content || '')
  const [localEvents, setLocalEvents]   = useState(events || [])
  const [localMonth, setLocalMonth]     = useState(month ?? new Date().getMonth())
  const [localYear, setLocalYear]       = useState(year ?? new Date().getFullYear())

  // Kanban UI state
  const [draggedCard, setDraggedCard]     = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)
  const [dragOverIndex, setDragOverIndex]   = useState(null)
  const [menuOpenCol, setMenuOpenCol]       = useState(null)
  const cardListRefs = useRef({})

  // Toolbar state
  const [locked, setLocked]         = useState(data.locked || false)
  const [fullscreen, setFullscreen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [cardFields, setCardFields] = useState(() => {
    const base = { description: true, dueDate: true, assignee: true, priority: true, checklist: false }
    ;(data.propertyDefs || []).forEach(d => { base[`prop_${d.id}`] = true })
    return base
  })

  // Sync cardFields when propertyDefs change (new props added externally)
  useEffect(() => {
    const defs = data.propertyDefs || []
    setCardFields(prev => {
      const next = { ...prev }
      defs.forEach(d => { if (!(  `prop_${d.id}` in next)) next[`prop_${d.id}`] = true })
      return next
    })
  }, [data.propertyDefs])

  // ── Sync localCards when ContentCanvas updates data.cards externally ─────────
  const isLocalUpdate = useRef(false)

  useEffect(() => {
    if (isLocalUpdate.current) { isLocalUpdate.current = false; return }
    setLocalCards(data.cards || {})
  }, [data.cards])

  useEffect(() => {
    if (isLocalUpdate.current) return
    setLocalColumns(data.columns || [])
  }, [data.columns])

  // ── Persist ─────────────────────────────────────────────────────────────────
  const persist = useCallback((updates) => {
    if ('cards' in updates || 'columns' in updates) isLocalUpdate.current = true
    setNodes(nds => nds.map(n =>
      n.id === id ? { ...n, data: { ...n.data, ...updates } } : n
    ))
  }, [id, setNodes])

  const toggleLock = () => {
    const next = !locked
    setLocked(next)
    persist({ locked: next })
  }

  // ── KANBAN ───────────────────────────────────────────────────────────────────
  function renderKanban(isFullscreen = false) {
    const kanbanColumns = localColumns.length > 0 ? localColumns : ['Por hacer', 'En progreso', 'Completado']
    const kanbanCards   = localCards || {}

    const priorityBorderColor = (p) =>
      p === 'alta' ? '#ef4444' : p === 'media' ? '#f59e0b' : p === 'baja' ? '#22c55e' : '#e8eaed'

    const handleDragStart = (e, card, column) => {
      e.stopPropagation()
      setDraggedCard({ card, column })
      e.dataTransfer.effectAllowed = 'move'
    }

    const handleColumnDragOver = (e, column) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverColumn(column)
      const listEl = cardListRefs.current[column]
      if (!listEl) return
      const items = Array.from(listEl.querySelectorAll('[data-card-item]'))
      let insertIdx = (kanbanCards[column] || []).length
      for (let i = 0; i < items.length; i++) {
        const rect = items[i].getBoundingClientRect()
        if (e.clientY < rect.top + rect.height / 2) { insertIdx = i; break }
      }
      setDragOverIndex(insertIdx)
    }

    const handleColumnDragLeave = (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) {
        setDragOverColumn(null)
        setDragOverIndex(null)
      }
    }

    const handleDrop = (e, targetColumn) => {
      e.preventDefault()
      if (!draggedCard) return
      const { card, column: sourceColumn } = draggedCard
      const insertAt = dragOverIndex !== null ? dragOverIndex : (kanbanCards[targetColumn] || []).length

      let newCards
      if (sourceColumn === targetColumn) {
        const withoutCard = (kanbanCards[targetColumn] || []).filter(c => c.id !== card.id)
        withoutCard.splice(insertAt, 0, { ...card })
        newCards = { ...kanbanCards, [targetColumn]: withoutCard }
      } else {
        const sourceCards  = (kanbanCards[sourceColumn] || []).filter(c => c.id !== card.id)
        const targetCards  = [...(kanbanCards[targetColumn] || [])]
        targetCards.splice(insertAt, 0, { ...card, status: targetColumn })
        newCards = { ...kanbanCards, [sourceColumn]: sourceCards, [targetColumn]: targetCards }
      }

      setLocalCards(newCards)
      persist({ cards: newCards })
      setDraggedCard(null)
      setDragOverColumn(null)
      setDragOverIndex(null)
    }

    const deleteColumn = (col) => {
      setMenuOpenCol(null)
      if (kanbanColumns.length <= 1) { alert('Debe haber al menos una columna'); return }
      if (!confirm(`¿Eliminar la columna "${col}" y todas sus tarjetas?`)) return
      const newColumns = kanbanColumns.filter(c => c !== col)
      const newCards   = { ...kanbanCards }
      delete newCards[col]
      setLocalColumns(newColumns)
      setLocalCards(newCards)
      persist({ columns: newColumns, cards: newCards })
    }

    const addCard = (column) => {
      if (locked) return
      const newCard = {
        id:          `card-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title:       '',
        description: '',
        color:       '#fff',
        priority:    null,
        status:      column,
        checklist:   [],
      }
      const newCards = { ...kanbanCards, [column]: [...(kanbanCards[column] || []), newCard] }
      setLocalCards(newCards)
      persist({ cards: newCards })
      window.dispatchEvent(new CustomEvent('open-kanban-panel', {
        detail: {
          nodeId:       id,
          card:         { ...newCard, column, index: newCards[column].length - 1 },
          columns:      kanbanColumns,
          propertyDefs: data.propertyDefs || [],
        }
      }))
    }

    // Filter bar
    const builtInFields = [
      { key: 'description', label: 'Descripción' },
      { key: 'dueDate',     label: 'Vencimiento' },
      { key: 'assignee',    label: 'Asignado' },
      { key: 'priority',    label: 'Prioridad (borde)' },
      { key: 'checklist',   label: 'Progreso checklist' },
    ]
    const customFields = (data.propertyDefs || []).map(d => ({ key: `prop_${d.id}`, label: d.name }))
    const allFields = [...builtInFields, ...customFields]

    const filterBar = filterOpen && (
      <div
        style={{
          position: 'absolute', top: 0, right: 0, zIndex: 20,
          background: '#fff', border: '1px solid #e8eaed', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          padding: '10px 14px', minWidth: 200, maxHeight: 340, overflowY: 'auto',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: '#8c8fa1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Mostrar en tarjetas
        </div>
        {customFields.length > 0 && (
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', marginBottom: 4, marginTop: 4 }}>PROPIEDADES FIJAS</div>
        )}
        {builtInFields.map(({ key, label }) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
            <input type="checkbox" checked={!!cardFields[key]} onChange={() => setCardFields(prev => ({ ...prev, [key]: !prev[key] }))} style={{ accentColor: '#6366f1', width: 14, height: 14 }} />
            {label}
          </label>
        ))}
        {customFields.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', margin: '8px 0 4px' }}>PROPIEDADES CUSTOM</div>
            {customFields.map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                <input type="checkbox" checked={cardFields[key] !== false} onChange={() => setCardFields(prev => ({ ...prev, [key]: !prev[key] }))} style={{ accentColor: '#6366f1', width: 14, height: 14 }} />
                {label}
              </label>
            ))}
          </>
        )}
        <button onClick={() => setFilterOpen(false)} style={{ marginTop: 8, width: '100%', padding: '5px 0', fontSize: 12, color: '#6b7280', background: 'none', border: '1px solid #e8eaed', borderRadius: 6, cursor: 'pointer' }}>
          Cerrar
        </button>
      </div>
    )

    const kanbanContent = (
      <div style={{ display: 'flex', height: '100%', position: 'relative' }} onMouseDown={() => menuOpenCol && setMenuOpenCol(null)}>
        {filterBar}
        <div style={{ padding: '10px 12px', display: 'flex', gap: 10, height: '100%', overflowX: 'auto', flex: 1, alignItems: 'flex-start' }}>
          {kanbanColumns.map((column, colIndex) => {
            const colCards  = kanbanCards[column] || []
            const isDragOver = dragOverColumn === column

            return (
              <div
                key={colIndex}
                style={{
                  flexShrink: 0, width: 260,
                  background: isDragOver ? '#f5f3ff' : '#f9fafb',
                  borderRadius: 10,
                  border: isDragOver ? '2px solid #6366f1' : '1px solid #e8eaed',
                  display: 'flex', flexDirection: 'column', maxHeight: '100%',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onDragOver={(e) => handleColumnDragOver(e, column)}
                onDragLeave={handleColumnDragLeave}
                onDrop={(e) => handleDrop(e, column)}
              >
                {/* Column header */}
                <div style={{ padding: '10px 12px', background: 'transparent', borderBottom: '1px solid #e8eaed', borderRadius: '10px 10px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    value={column}
                    disabled={locked}
                    onChange={e => {
                      const newVal  = e.target.value
                      const newCols = [...kanbanColumns]
                      newCols[colIndex] = newVal
                      const newCards = {}
                      kanbanColumns.forEach((old, i) => { newCards[newCols[i]] = kanbanCards[old] || [] })
                      setLocalColumns(newCols)
                      setLocalCards(newCards)
                      persist({ columns: newCols, cards: newCards })
                    }}
                    onMouseDown={e => e.stopPropagation()}
                    style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, color: '#1a1a1a', outline: 'none', minWidth: 0 }}
                  />
                  <span style={{ fontSize: 11, background: '#e5e7eb', color: '#6b7280', padding: '1px 7px', borderRadius: 10, fontWeight: 600, flexShrink: 0 }}>
                    {colCards.length}
                  </span>
                  {!locked && (
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <button
                        onClick={e => { e.stopPropagation(); setMenuOpenCol(menuOpenCol === column ? null : column) }}
                        onMouseDown={e => e.stopPropagation()}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1, padding: '2px 4px', borderRadius: 4, display: 'flex', alignItems: 'center' }}
                      >⋯</button>
                      {menuOpenCol === column && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 999, background: '#fff', border: '1px solid #e8eaed', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 160, overflow: 'hidden' }} onMouseDown={e => e.stopPropagation()}>
                          <button
                            onClick={() => deleteColumn(column)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: 'none', border: 'none', fontSize: 13, color: '#dc2626', cursor: 'pointer', textAlign: 'left' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <Trash2 size={14} strokeWidth={2} /> Eliminar columna
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card list */}
                <div
                  ref={el => cardListRefs.current[column] = el}
                  style={{ flex: 1, padding: 8, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 60 }}
                >
                  {colCards.map((card, cardIndex) => {
                    const isOverHere = isDragOver && dragOverIndex === cardIndex
                    const today = new Date(); today.setHours(0,0,0,0)
                    const dueDate   = card.dueDate ? new Date(card.dueDate) : null
                    const isOverdue = dueDate && dueDate < today
                    const checkDone = (card.checklist || []).filter(i => i.done).length
                    const checkTotal = (card.checklist || []).length

                    return (
                      <div key={card.id || cardIndex}>
                        {isOverHere && <div style={{ height: 2, background: '#6366f1', borderRadius: 2, marginBottom: 4 }} />}
                        <div
                          data-card-item
                          draggable={!locked}
                          onMouseDown={e => e.stopPropagation()}
                          onDragStart={(e) => handleDragStart(e, card, column)}
                          onClick={(e) => {
                            e.stopPropagation()
                            window.dispatchEvent(new CustomEvent('open-kanban-panel', {
                              detail: {
                                nodeId:       id,
                                card:         { ...card, column, index: cardIndex },
                                columns:      kanbanColumns,
                                propertyDefs: data.propertyDefs || [],
                              }
                            }))
                          }}
                          style={{
                            background:  card.color || '#fff',
                            border:      '1px solid #e8eaed',
                            borderLeft:  cardFields.priority ? `3px solid ${priorityBorderColor(card.priority)}` : '1px solid #e8eaed',
                            borderRadius: 8,
                            padding:     '10px 12px',
                            cursor:      locked ? 'pointer' : 'grab',
                            transition:  'box-shadow 0.15s',
                            userSelect:  'none',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)' }}
                          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
                        >
                          {/* Emoji + Title */}
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.4, display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                            {card.emoji && <span style={{ fontSize: 14, lineHeight: 1 }}>{card.emoji}</span>}
                            <span>{card.title || <span style={{ color: '#9ca3af', fontStyle: 'italic', fontWeight: 400 }}>Sin título</span>}</span>
                          </div>

                          {/* Description */}
                          {cardFields.description && card.description && (
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 5, lineHeight: 1.4 }}>
                              {card.description.length > 70 ? card.description.slice(0, 70) + '…' : card.description}
                            </div>
                          )}

                          {/* Checklist progress */}
                          {cardFields.checklist && checkTotal > 0 && (
                            <div style={{ marginTop: 6 }}>
                              <div style={{ height: 3, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ height: '100%', background: '#22c55e', width: `${(checkDone / checkTotal) * 100}%`, transition: 'width 0.2s' }} />
                              </div>
                              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{checkDone}/{checkTotal}</div>
                            </div>
                          )}

                          {/* Footer chips — built-in + custom props */}
                          {(() => {
                            const propVals = card.propertyValues || {}
                            const visibleCustom = (data.propertyDefs || []).filter(d => cardFields[`prop_${d.id}`] !== false && propVals[d.id] != null && propVals[d.id] !== '' && propVals[d.id] !== false)
                            const showFooter = (cardFields.dueDate && card.dueDate) || (cardFields.assignee && card.assignee) || visibleCustom.length > 0
                            if (!showFooter) return null
                            const SELECT_CHIP_COLORS = ['#e0e7ff','#dcfce7','#fef3c7','#fce7f3','#cffafe','#fef2f2','#f3e8ff','#ecfccb']
                            const SELECT_TEXT_COLORS = ['#4338ca','#15803d','#b45309','#be185d','#0e7490','#dc2626','#7e22ce','#4d7c0f']
                            return (
                              <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                {cardFields.dueDate && card.dueDate && (
                                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, fontWeight: 500, background: isOverdue ? '#fef2f2' : '#fef9c3', color: isOverdue ? '#dc2626' : '#92400e' }}>
                                    {new Date(card.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                  </span>
                                )}
                                {cardFields.assignee && card.assignee && (
                                  <span style={{ fontSize: 10, background: '#e0e7ff', color: '#4338ca', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                                    {card.assignee.charAt(0).toUpperCase()}
                                  </span>
                                )}
                                {visibleCustom.map((def, di) => {
                                  const val = propVals[def.id]
                                  if (def.type === 'checkbox') return (
                                    <span key={def.id} style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 5, fontWeight: 600 }}>✓ {def.name}</span>
                                  )
                                  if (def.type === 'select' && val) return (
                                    <span key={def.id} style={{ fontSize: 10, background: SELECT_CHIP_COLORS[di % 8], color: SELECT_TEXT_COLORS[di % 8], padding: '2px 7px', borderRadius: 5, fontWeight: 500 }}>{val}</span>
                                  )
                                  if (def.type === 'multi_select' && Array.isArray(val) && val.length > 0) return (
                                    <span key={def.id} style={{ fontSize: 10, background: SELECT_CHIP_COLORS[di % 8], color: SELECT_TEXT_COLORS[di % 8], padding: '2px 7px', borderRadius: 5, fontWeight: 500 }}>{val[0]}{val.length > 1 ? ` +${val.length - 1}` : ''}</span>
                                  )
                                  if (def.type === 'date' && val) return (
                                    <span key={def.id} style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 5, fontWeight: 500 }}>
                                      {new Date(val).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                    </span>
                                  )
                                  if ((def.type === 'text' || def.type === 'number' || def.type === 'person') && val) return (
                                    <span key={def.id} style={{ fontSize: 10, color: '#6b7280', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {String(val).slice(0, 20)}
                                    </span>
                                  )
                                  return null
                                })}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )
                  })}

                  {/* Drop line at end */}
                  {isDragOver && dragOverIndex === colCards.length && (
                    <div style={{ height: 2, background: '#6366f1', borderRadius: 2 }} />
                  )}

                  {/* Add card */}
                  {!locked && (
                    <button
                      onClick={() => addCard(column)}
                      onMouseDown={e => e.stopPropagation()}
                      style={{ width: '100%', padding: '7px 12px', background: 'transparent', border: 'none', borderRadius: 6, fontSize: 12, color: '#9ca3af', cursor: 'pointer', textAlign: 'left', marginTop: 2 }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f1f3f4'; e.currentTarget.style.color = '#374151' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af' }}
                    >
                      + Agregar tarjeta
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add column */}
          {!locked && (
            <button
              onClick={() => {
                const name     = 'Nueva columna'
                const newCols  = [...kanbanColumns, name]
                const newCards = { ...kanbanCards, [name]: [] }
                setLocalColumns(newCols)
                setLocalCards(newCards)
                persist({ columns: newCols, cards: newCards })
              }}
              onMouseDown={e => e.stopPropagation()}
              style={{ flexShrink: 0, width: 200, minHeight: 40, border: '1.5px dashed #d1d5db', background: '#f9fafb', borderRadius: 10, color: '#9ca3af', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', padding: '10px 12px' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#9ca3af'; e.currentTarget.style.color = '#374151' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#9ca3af' }}
            >
              + Agregar columna
            </button>
          )}
        </div>
      </div>
    )

    if (isFullscreen) return kanbanContent

    return kanbanContent
  }

  function renderTable() {
    const tableColumns = localColumns || []
    const tableRows    = localRows || []
    return (
      <div style={{ padding: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'system-ui' }}>
          <thead>
            <tr>
              {tableColumns.map((col, i) => (
                <th key={i} style={{ border: '1px solid #e2e8f0', padding: '10px 12px', background: '#f8fafc', fontWeight: 700, fontSize: 11, color: '#475569', textAlign: 'left' }}>
                  <input value={col} onChange={e => { const c = [...tableColumns]; c[i] = e.target.value; setLocalColumns(c); persist({ columns: c }) }} onMouseDown={e => e.stopPropagation()} style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 11, fontWeight: 700, color: '#475569', outline: 'none' }} />
                </th>
              ))}
              <th style={{ width: 50, border: '1px solid #e2e8f0', padding: 6 }}>
                <button onClick={() => { const c = [...tableColumns, `Col ${tableColumns.length + 1}`]; const r = tableRows.map(row => [...row, '']); setLocalColumns(c); setLocalRows(r); persist({ columns: c, rows: r }) }} style={{ width: 28, height: 28, border: 'none', background: '#f0fdf4', borderRadius: 6, cursor: 'pointer', color: '#16a34a', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ border: '1px solid #e2e8f0', padding: 0 }}>
                    <input value={cell} onChange={e => { const r = tableRows.map((row, i) => i === ri ? row.map((c, j) => j === ci ? e.target.value : c) : row); setLocalRows(r); persist({ rows: r }) }} onMouseDown={e => e.stopPropagation()} placeholder="Escribe..." style={{ width: '100%', border: 'none', padding: '10px 12px', fontSize: 11, fontFamily: 'system-ui', outline: 'none', background: 'transparent' }} />
                  </td>
                ))}
                <td style={{ border: '1px solid #e2e8f0', padding: 6, textAlign: 'center' }}>
                  <button onClick={() => { const r = tableRows.filter((_, i) => i !== ri); setLocalRows(r); persist({ rows: r }) }} style={{ width: 24, height: 24, border: 'none', background: '#fef2f2', borderRadius: 4, cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={12} strokeWidth={2} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => { const r = [...tableRows, new Array(tableColumns.length).fill('')]; setLocalRows(r); persist({ rows: r }) }} style={{ marginTop: 16, padding: '10px 16px', border: '2px dashed #10b981', background: '#f0fdf4', borderRadius: 8, color: '#16a34a', fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onMouseDown={e => e.stopPropagation()}>
          <Plus size={16} strokeWidth={2.5} /> Agregar fila
        </button>
      </div>
    )
  }

  function renderDocument() {
    return (
      <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <textarea value={localContent} onChange={e => { setLocalContent(e.target.value); persist({ content: e.target.value }) }} onMouseDown={e => e.stopPropagation()} placeholder="Empieza a escribir tu documento..." style={{ flex: 1, width: '100%', border: 'none', background: 'transparent', fontSize: 13, fontFamily: 'system-ui', lineHeight: 1.8, color: '#334155', outline: 'none', resize: 'none', padding: 0 }} />
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#94a3b8', display: 'flex', gap: 12 }}>
          <span>{localContent.length} caracteres</span><span>•</span>
          <span>{localContent.split(/\s+/).filter(w => w.length > 0).length} palabras</span>
        </div>
      </div>
    )
  }

  function renderCalendar() {
    const monthNames  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    const daysInMonth = new Date(localYear, localMonth + 1, 0).getDate()
    const firstDay    = new Date(localYear, localMonth, 1).getDay()
    return (
      <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
          <button onClick={() => { let m = localMonth - 1, y = localYear; if (m < 0) { m = 11; y-- } setLocalMonth(m); setLocalYear(y); persist({ month: m, year: y }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }} onMouseDown={e => e.stopPropagation()}><ChevronUp size={18} strokeWidth={2} /></button>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>{monthNames[localMonth]} {localYear}</div>
          <button onClick={() => { let m = localMonth + 1, y = localYear; if (m > 11) { m = 0; y++ } setLocalMonth(m); setLocalYear(y); persist({ month: m, year: y }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }} onMouseDown={e => e.stopPropagation()}><ChevronDown size={18} strokeWidth={2} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, fontSize: 10, fontWeight: 700, color: '#94a3b8', textAlign: 'center', marginBottom: 8 }}>
          {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => <div key={d} style={{ padding: 6 }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, flex: 1 }}>
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} style={{ padding: 4 }} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayEvents = (localEvents || []).filter(e => { const d = new Date(e.date); return d.getDate() === day && d.getMonth() === localMonth && d.getFullYear() === localYear })
            return (
              <div key={day} style={{ padding: 6, border: '1px solid #f1f5f9', borderRadius: 6, fontSize: 12, color: '#334155', minHeight: 50, background: dayEvents.length > 0 ? '#f0fdf4' : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}
                onClick={() => { const t = prompt(`Evento para el ${day} de ${monthNames[localMonth]}:`); if (t) { const ev = [...localEvents, { id: `event-${Date.now()}`, date: new Date(localYear, localMonth, day).toISOString(), title: t, description: '' }]; setLocalEvents(ev); persist({ events: ev }) } }}
                onMouseDown={e => e.stopPropagation()}
                onMouseEnter={e => e.currentTarget.style.background = '#dcfce7'}
                onMouseLeave={e => e.currentTarget.style.background = dayEvents.length > 0 ? '#f0fdf4' : 'transparent'}
              >
                <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{day}</div>
                {dayEvents.slice(0, 2).map((e, i) => <div key={i} style={{ fontSize: 8, background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: 3, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>)}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderTimeline() {
    const sorted = [...localEvents].sort((a, b) => new Date(a.date) - new Date(b.date))
    return (
      <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 20, top: 0, bottom: 0, width: 3, background: '#e2e8f0', borderRadius: 2 }} />
          {sorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', fontSize: 13 }}>No hay eventos aún.</div>
          ) : sorted.map((event, index) => (
            <div key={event.id || index} style={{ position: 'relative', marginBottom: 24, paddingLeft: 40 }}>
              <div style={{ position: 'absolute', left: 13, top: 8, width: 16, height: 16, borderRadius: '50%', background: '#10b981', border: '4px solid #fff', boxShadow: '0 0 0 3px #10b981' }} />
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#10b981', marginBottom: 6, textTransform: 'uppercase' }}>{new Date(event.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                <input value={event.title} onChange={e => { const ev = [...localEvents]; ev[index] = { ...event, title: e.target.value }; setLocalEvents(ev); persist({ events: ev }) }} placeholder="Evento..." onMouseDown={e => e.stopPropagation()} style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, fontFamily: 'system-ui', outline: 'none', padding: 0, marginBottom: 6, color: '#334155' }} />
                <button onClick={() => { const ev = localEvents.filter((_, i) => i !== index); setLocalEvents(ev); persist({ events: ev }) }} style={{ marginTop: 10, padding: '6px 12px', border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 6, color: '#dc2626', fontSize: 10, fontWeight: 700, cursor: 'pointer' }} onMouseDown={e => e.stopPropagation()}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => { const ev = [...localEvents, { id: `event-${Date.now()}`, date: new Date().toISOString(), title: 'Nuevo evento', description: '' }]; setLocalEvents(ev); persist({ events: ev }) }} style={{ marginTop: 16, padding: '12px 16px', border: '2px dashed #10b981', background: '#f0fdf4', borderRadius: 8, color: '#16a34a', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onMouseDown={e => e.stopPropagation()}>
          <Plus size={16} strokeWidth={2.5} /> Agregar evento
        </button>
      </div>
    )
  }

  function renderContent() {
    switch (format) {
      case 'table':    return renderTable()
      case 'kanban':   return renderKanban(false)
      case 'document': return renderDocument()
      case 'calendar': return renderCalendar()
      case 'timeline': return renderTimeline()
      default:         return renderTable()
    }
  }

  function getFormatIcon() {
    switch (format) {
      case 'table':    return '📊'
      case 'kanban':   return '📋'
      case 'document': return '📄'
      case 'calendar': return '📅'
      case 'timeline': return '⏱'
      default:         return '📊'
    }
  }

  const isKanban = format === 'kanban'

  // Fullscreen portal
  const fullscreenPortal = fullscreen && isKanban && createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#f9fafb', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui' }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Fullscreen header */}
      <div style={{ height: 52, background: '#fff', borderBottom: '1px solid #e8eaed', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 18 }}>{getFormatIcon()}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', flex: 1 }}>{title}</span>
        {locked && <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>🔒 Bloqueado</span>}
        <button
          onClick={() => setFilterOpen(p => !p)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: '1px solid #e8eaed', borderRadius: 7, background: filterOpen ? '#f5f3ff' : '#fff', color: filterOpen ? '#6366f1' : '#6b7280', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          <SlidersHorizontal size={13} /> Filtros
        </button>
        <button
          onClick={() => setFullscreen(false)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: '1px solid #e8eaed', borderRadius: 7, background: '#fff', color: '#6b7280', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          <Minimize2 size={13} /> Salir
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {renderKanban(true)}
      </div>
    </div>,
    document.body
  )

  return (
    <>
      <NodeToolbar isVisible={selected} position="top" align="end">
        <div style={{ display: 'flex', gap: 4, fontFamily: 'system-ui' }}>
          {isKanban && (
            <>
              <button
                onClick={() => setFilterOpen(p => !p)}
                style={{ background: filterOpen ? '#f5f3ff' : '#fff', border: '1px solid #e2e8f0', borderRadius: 7, color: filterOpen ? '#6366f1' : '#475569', fontSize: 10, fontWeight: 600, cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <SlidersHorizontal size={11} /> Vista
              </button>
              <button
                onClick={toggleLock}
                style={{ background: locked ? '#fef3c7' : '#fff', border: `1px solid ${locked ? '#fcd34d' : '#e2e8f0'}`, borderRadius: 7, color: locked ? '#92400e' : '#475569', fontSize: 10, fontWeight: 600, cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                title={locked ? 'Desbloquear' : 'Bloquear'}
              >
                {locked ? <><Lock size={11} /> Bloqueado</> : <><Unlock size={11} /> Bloquear</>}
              </button>
              <button
                onClick={() => setFullscreen(true)}
                style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 7, color: '#475569', fontSize: 10, fontWeight: 600, cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                title="Pantalla completa"
              >
                <Maximize2 size={11} /> Expandir
              </button>
            </>
          )}
          <button
            onClick={() => deleteElements({ nodes: [{ id }] })}
            style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, color: '#dc2626', fontSize: 10, fontWeight: 600, cursor: 'pointer', padding: '4px 10px' }}
          >
            Eliminar
          </button>
        </div>
      </NodeToolbar>

      <NodeResizer
        isVisible={selected}
        minWidth={300} minHeight={200}
        handleStyle={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', border: `2px solid ${ACCENT}` }}
        lineStyle={{ borderColor: `${ACCENT}60`, borderWidth: 1 }}
      />

      <div
        ref={nodeRef}
        style={{
          width: '100%', height: '100%',
          background: '#fff',
          border: `1.5px solid ${selected ? `${ACCENT}60` : '#e2e8f0'}`,
          borderRadius: 14,
          boxShadow: selected ? `0 0 0 3px ${ACCENT}12, 0 6px 20px rgba(16,185,129,0.13)` : '0 2px 8px rgba(0,0,0,0.06)',
          fontFamily: 'system-ui',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${selected ? `${ACCENT}20` : '#f1f5f9'}`, background: `${ACCENT}04`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{getFormatIcon()}</span>
          <input
            value={title}
            onChange={e => persist({ title: e.target.value })}
            onMouseDown={e => e.stopPropagation()}
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, color: '#334155', outline: 'none' }}
            placeholder="Sin título"
          />
          {locked && <span title="Bloqueado" style={{ fontSize: 13, color: '#92400e' }}>🔒</span>}
        </div>

        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {renderContent()}
        </div>
      </div>

      <Handle type="target" position={Position.Left} style={{ background: ACCENT, border: `2px solid ${ACCENT}60`, width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} style={{ background: ACCENT, border: `2px solid ${ACCENT}60`, width: 10, height: 10 }} />

      {fullscreenPortal}
    </>
  )
}

const MemoizedFormatNode = memo(FormatNode, (prevProps, nextProps) => {
  // Only re-render if critical props change
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.data.format === nextProps.data.format &&
    prevProps.data.title === nextProps.data.title &&
    prevProps.data.rows === nextProps.data.rows &&
    prevProps.data.cards === nextProps.data.cards
  )
})

MemoizedFormatNode.displayName = 'FormatNode'

export default MemoizedFormatNode
