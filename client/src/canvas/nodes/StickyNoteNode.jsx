import { useState, useRef, useEffect } from 'react'
import { Handle, Position, NodeResizer, NodeToolbar, useReactFlow } from '@xyflow/react'
import RichText from './RichText'

const COLORS = [
  { id: 'yellow', bg: '#fefce8', bar: '#fde047', text: '#713f12', border: '#fbbf24' },
  { id: 'pink',   bg: '#fdf4ff', bar: '#e879f9', text: '#701a75', border: '#d946ef' },
  { id: 'green',  bg: '#f0fdf4', bar: '#4ade80', text: '#14532d', border: '#22c55e' },
  { id: 'blue',   bg: '#eff6ff', bar: '#60a5fa', text: '#1e3a8a', border: '#3b82f6' },
  { id: 'orange', bg: '#fff7ed', bar: '#fb923c', text: '#7c2d12', border: '#f97316' },
  { id: 'purple', bg: '#f5f3ff', bar: '#a78bfa', text: '#4c1d95', border: '#8b5cf6' },
  { id: 'slate',  bg: '#f8fafc', bar: '#94a3b8', text: '#1e293b', border: '#64748b' },
]

export default function StickyNoteNode({ id, data, selected }) {
  const [colorId, setColorId] = useState(data.colorId || 'yellow')
  const [html, setHtml]       = useState(data.html || data.text || '')
  const nodeRef = useRef(null)
  const { setNodes, deleteElements } = useReactFlow()

  const color = COLORS.find(c => c.id === colorId) || COLORS[0]

  useEffect(() => {
    const el = nodeRef.current
    if (!el) return
    const stop = e => e.stopPropagation()
    el.addEventListener('wheel', stop)
    return () => el.removeEventListener('wheel', stop)
  }, [])

  function persist(updates) {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n))
  }

  return (
    <>
      <NodeToolbar isVisible={selected} position="top" align="end" style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => deleteElements({ nodes: [{ id }] })}
          style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7,
            color: '#dc2626', fontSize: 10, fontWeight: 600,
            cursor: 'pointer', padding: '4px 10px', fontFamily: 'system-ui',
          }}
        >
          ✕ Eliminar
        </button>
      </NodeToolbar>

      <NodeResizer
        isVisible={selected}
        minWidth={180} minHeight={140}
        handleStyle={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', border: `2px solid ${color.border}` }}
        lineStyle={{ borderColor: color.border + '60', borderWidth: 1 }}
      />

      <div
        ref={nodeRef}
        style={{
          width: '100%', height: '100%',
          background: color.bg,
          border: `2px solid ${selected ? color.border : color.border + '50'}`,
          borderRadius: 6,
          display: 'flex', flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          boxShadow: selected
            ? `0 8px 32px ${color.border}35`
            : `3px 4px 0 ${color.border}45`,
          transition: 'box-shadow 0.15s, border-color 0.15s',
          overflow: 'hidden',
        }}
      >
        {/* Header bar — color picker */}
        <div style={{
          background: color.bar,
          padding: '5px 10px',
          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
        }}>
          {COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => { setColorId(c.id); persist({ colorId: c.id }) }}
              onMouseDown={e => e.stopPropagation()}
              title={c.id}
              style={{
                width: 11, height: 11, borderRadius: '50%',
                background: c.bg, border: colorId === c.id
                  ? `2px solid ${c.text}`
                  : `1.5px solid ${c.border}60`,
                cursor: 'pointer', padding: 0, flexShrink: 0,
                boxShadow: colorId === c.id ? `0 0 0 1.5px ${c.bar}` : 'none',
              }}
            />
          ))}
        </div>

        {/* Rich text body */}
        <div style={{ flex: 1, overflow: 'hidden', color: color.text }}>
          <RichText
            initialContent={html}
            onChange={v => { setHtml(v); persist({ html: v }) }}
            placeholder="Escribí acá…"
            showToolbar={false}
            style={{ color: color.text, fontSize: 13 }}
          />
        </div>
      </div>

      <Handle type="source" position={Position.Right}
        style={{ background: color.border, border: '2px solid #fff', width: 9, height: 9, borderRadius: '50%' }}
      />
      <Handle type="target" position={Position.Left}
        style={{ background: color.border, border: '2px solid #fff', width: 9, height: 9, borderRadius: '50%' }}
      />
      <Handle type="source" position={Position.Bottom}
        style={{ background: color.border, border: '2px solid #fff', width: 9, height: 9, borderRadius: '50%' }}
      />
      <Handle type="target" position={Position.Top}
        style={{ background: color.border, border: '2px solid #fff', width: 9, height: 9, borderRadius: '50%' }}
      />
    </>
  )
}
