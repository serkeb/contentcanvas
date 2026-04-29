/**
 * FloatingToolbar — Miro-style horizontal pill toolbar that floats above a node.
 * Portaled to document.body so it renders above React Flow's canvas stacking context.
 * Handles: shape picker, text formatting (via TipTap editor), fill color, stroke, delete.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, X } from 'lucide-react'

// ─── Data ────────────────────────────────────────────────────────────────────
export const SHAPES = [
  { id: 'rect',          icon: '▭', label: 'Rectángulo' },
  { id: 'rounded',       icon: '▢', label: 'Redondeado' },
  { id: 'circle',        icon: '◯', label: 'Círculo' },
  { id: 'diamond',       icon: '◇', label: 'Rombo' },
  { id: 'triangle',      icon: '△', label: 'Triángulo' },
  { id: 'parallelogram', icon: '▱', label: 'Paralelogramo' },
  { id: 'callout',       icon: null, Icon: MessageCircle, label: 'Globo' },
  { id: 'hexagon',       icon: '⬡', label: 'Hexágono' },
]

export const FILLS = [
  { id: 'white',       bg: '#ffffff',     label: 'Blanco' },
  { id: 'transparent', bg: 'transparent', label: 'Sin fondo' },
  { id: 'light-gray',  bg: '#f1f5f9',     label: 'Gris claro' },
  { id: 'slate',       bg: '#1e293b',     label: 'Carbón' },
  { id: 'indigo',      bg: '#6366f1',     label: 'Índigo' },
  { id: 'blue',        bg: '#3b82f6',     label: 'Azul' },
  { id: 'sky',         bg: '#bae6fd',     label: 'Cielo' },
  { id: 'teal',        bg: '#99f6e4',     label: 'Teal' },
  { id: 'green',       bg: '#86efac',     label: 'Verde' },
  { id: 'lime',        bg: '#d9f99d',     label: 'Lima' },
  { id: 'yellow',      bg: '#fde68a',     label: 'Amarillo' },
  { id: 'amber',       bg: '#fbbf24',     label: 'Ámbar' },
  { id: 'orange',      bg: '#fdba74',     label: 'Naranja' },
  { id: 'rose',        bg: '#fda4af',     label: 'Rosa' },
  { id: 'pink',        bg: '#f0abfc',     label: 'Pink' },
  { id: 'purple',      bg: '#c4b5fd',     label: 'Violeta' },
]

export const STROKE_COLORS = [
  '#1e293b','#94a3b8','#6366f1','#3b82f6','#0ea5e9','#06b6d4',
  '#22c55e','#84cc16','#f59e0b','#f97316','#f43f5e','#8b5cf6',
  '#ec4899','#ffffff','#000000','none',
]

const TEXT_COLORS = [
  '#000000','#1e293b','#374151','#6b7280','#ffffff',
  '#dc2626','#f97316','#ca8a04','#16a34a','#2563eb','#7c3aed','#db2777',
]

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64]

// ─── Separator ────────────────────────────────────────────────────────────────
function Sep() {
  return <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 4px', flexShrink: 0 }} />
}

// ─── Generic toolbar icon button ──────────────────────────────────────────────
function TBtn({ children, active, title, onClick, style: extra, danger }) {
  return (
    <button
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      title={title}
      className="nodrag nopan"
      style={{
        minWidth: 28, height: 28, padding: '0 5px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
        background: danger ? '#fef2f2' : active ? 'rgba(99,102,241,0.12)' : 'transparent',
        border: danger ? '1px solid #fecaca' : active ? '1px solid #6366f140' : '1px solid transparent',
        borderRadius: 7, cursor: 'pointer',
        color: danger ? '#dc2626' : active ? '#6366f1' : '#374151',
        fontSize: 12, fontWeight: active ? 700 : 500,
        fontFamily: 'system-ui', flexShrink: 0,
        transition: 'background 0.1s',
        ...extra,
      }}
    >{children}</button>
  )
}

// ─── Dropdown wrapper (portaled) ───────────────────────────────────────────────
function Dropdown({ anchor, onClose, children, dropRef }) {
  return createPortal(
    <div
      ref={dropRef}
      className="nodrag nopan"
      style={{
        position: 'fixed',
        left: Math.max(8, Math.min(anchor.left, window.innerWidth - 260)),
        top: anchor.top,
        zIndex: 100001,
        background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 12, padding: '10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        fontFamily: 'system-ui',
      }}
    >
      {children}
    </div>,
    document.body
  )
}

// ─── Shape picker dropdown ─────────────────────────────────────────────────────
function ShapePicker({ shape, onChange, anchor, onClose, dropRef }) {
  return (
    <Dropdown anchor={anchor} onClose={onClose} dropRef={dropRef}>
      <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>FORMAS</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {SHAPES.map(s => (
          <button key={s.id}
            onMouseDown={e => e.preventDefault()}
            onClick={() => { onChange(s.id); onClose() }}
            title={s.label}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: shape === s.id ? '#eef2ff' : 'transparent',
              color: shape === s.id ? '#6366f1' : '#475569',
              outline: shape === s.id ? '2px solid #6366f1' : 'none',
              fontSize: 20, minWidth: 52,
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (shape !== s.id) e.currentTarget.style.background = '#f8fafc' }}
            onMouseLeave={e => { if (shape !== s.id) e.currentTarget.style.background = 'transparent' }}
          >
            {s.Icon ? <s.Icon size={20} strokeWidth={2} /> : <span>{s.icon}</span>}
            <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600 }}>{s.label}</span>
          </button>
        ))}
      </div>
    </Dropdown>
  )
}

// ─── Fill color dropdown ──────────────────────────────────────────────────────
function FillPicker({ fillId, onChange, anchor, onClose, dropRef }) {
  return (
    <Dropdown anchor={anchor} onClose={onClose} dropRef={dropRef}>
      <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>COLOR DE RELLENO</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 200 }}>
        {FILLS.map(f => (
          <button key={f.id}
            onMouseDown={e => e.preventDefault()}
            onClick={() => { onChange(f.id); onClose() }}
            title={f.label}
            style={{
              width: 24, height: 24, borderRadius: 6, cursor: 'pointer', padding: 0, flexShrink: 0,
              background: f.bg === 'transparent'
                ? 'repeating-conic-gradient(#e2e8f0 0% 25%,#fff 0% 50%) 0 0/10px 10px'
                : f.bg,
              border: fillId === f.id ? '2.5px solid #6366f1' : '1.5px solid #e2e8f020',
              boxShadow: fillId === f.id ? '0 0 0 1.5px #6366f160' : '0 1px 3px rgba(0,0,0,0.1)',
              outline: 'none',
            }}
          />
        ))}
      </div>
    </Dropdown>
  )
}

// ─── Stroke dropdown ──────────────────────────────────────────────────────────
function StrokePicker({ strokeColor, strokeWidth, strokeStyle, onColor, onWidth, onStyle, anchor, onClose, dropRef }) {
  return (
    <Dropdown anchor={anchor} onClose={onClose} dropRef={dropRef}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>COLOR DE TRAZO</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: 200 }}>
            {STROKE_COLORS.map(c => (
              <button key={c}
                onMouseDown={e => e.preventDefault()}
                onClick={() => onColor(c)}
                title={c === 'none' ? 'Sin trazo' : c}
                style={{
                  width: 22, height: 22, borderRadius: 5, cursor: 'pointer', padding: 0,
                  background: c === 'none'
                    ? 'repeating-conic-gradient(#e2e8f0 0% 25%,#fff 0% 50%) 0 0/8px 8px'
                    : c,
                  border: strokeColor === c ? '2.5px solid #6366f1' : '1.5px solid #e2e8f030',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              />
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>GROSOR</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {[0, 1, 2, 3, 4, 6].map(w => (
              <button key={w}
                onMouseDown={e => e.preventDefault()}
                onClick={() => onWidth(w)}
                style={{
                  padding: '3px 9px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: strokeWidth === w ? '#6366f1' : '#f1f5f9',
                  color: strokeWidth === w ? '#fff' : '#64748b',
                  fontSize: 11, fontWeight: 600,
                }}
              >{w === 0 ? '—' : w}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>ESTILO</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {[
              { id: 'solid',  label: '────' },
              { id: 'dashed', label: '╌╌╌╌' },
              { id: 'dotted', label: '····' },
            ].map(s => (
              <button key={s.id}
                onMouseDown={e => e.preventDefault()}
                onClick={() => onStyle(s.id)}
                style={{
                  flex: 1, padding: '4px 0', borderRadius: 6, cursor: 'pointer',
                  background: strokeStyle === s.id ? '#eef2ff' : '#f8fafc',
                  border: strokeStyle === s.id ? '1px solid #6366f1' : '1px solid #e2e8f0',
                  color: strokeStyle === s.id ? '#6366f1' : '#94a3b8',
                  fontSize: 11, fontFamily: 'monospace',
                }}
              >{s.label}</button>
            ))}
          </div>
        </div>
      </div>
    </Dropdown>
  )
}

// ─── Text color dropdown ──────────────────────────────────────────────────────
function TextColorPicker({ editor, anchor, onClose, dropRef }) {
  return (
    <Dropdown anchor={anchor} onClose={onClose} dropRef={dropRef}>
      <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>COLOR DE TEXTO</div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: 160 }}>
        {TEXT_COLORS.map(c => (
          <button key={c}
            onMouseDown={e => e.preventDefault()}
            onClick={() => { editor?.chain().focus().setColor(c).run(); onClose() }}
            style={{
              width: 22, height: 22, borderRadius: 5, cursor: 'pointer', padding: 0,
              background: c, border: '1.5px solid #e2e8f030',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          />
        ))}
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={() => { editor?.chain().focus().unsetColor().run(); onClose() }}
          style={{
            padding: '2px 8px', borderRadius: 5, border: '1px solid #e2e8f0',
            background: '#f8fafc', color: '#94a3b8', fontSize: 10, cursor: 'pointer',
          }}
        >Sin color</button>
      </div>
    </Dropdown>
  )
}

// ─── Align dropdown ───────────────────────────────────────────────────────────
function AlignPicker({ editor, anchor, onClose, dropRef }) {
  const aligns = [
    { id: 'left',    label: '⬅ Izquierda' },
    { id: 'center',  label: '↔ Centro' },
    { id: 'right',   label: '➡ Derecha' },
    { id: 'justify', label: '⇔ Justificado' },
  ]
  return (
    <Dropdown anchor={anchor} onClose={onClose} dropRef={dropRef}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 140 }}>
        {aligns.map(a => (
          <button key={a.id}
            onMouseDown={e => e.preventDefault()}
            onClick={() => { editor?.chain().focus().setTextAlign(a.id).run(); onClose() }}
            style={{
              padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', textAlign: 'left',
              background: editor?.isActive({ textAlign: a.id }) ? '#eef2ff' : 'transparent',
              color: editor?.isActive({ textAlign: a.id }) ? '#6366f1' : '#374151',
              fontSize: 12, fontFamily: 'system-ui',
            }}
          >{a.label}</button>
        ))}
      </div>
    </Dropdown>
  )
}

// ─── Main FloatingToolbar ─────────────────────────────────────────────────────
export default function FloatingToolbar({
  editor,
  nodeRef,
  transform,           // [x, y, zoom] from React Flow store — triggers position recalculation
  shape,    onShapeChange,
  fillId,   onFillChange,
  strokeColor, onStrokeColor,
  strokeWidth, onStrokeWidth,
  strokeStyle, onStrokeStyle,
  onDelete,
  showShapeControls = true,
}) {
  const [openDrop, setOpenDrop]   = useState(null)
  const [anchor,   setAnchor]     = useState({ left: 0, top: 0 })
  const [pos,      setPos]        = useState({ left: 0, top: 0 })
  const toolbarRef = useRef(null)
  const dropRef    = useRef(null)

  // Recalculate position whenever node moves/zooms/pans
  const recalc = useCallback(() => {
    if (!nodeRef?.current) return
    const r = nodeRef.current.getBoundingClientRect()
    const TOOLBAR_W = 560
    const left = Math.max(8, Math.min(r.left + r.width / 2 - TOOLBAR_W / 2, window.innerWidth - TOOLBAR_W - 8))
    const top  = r.top > 56 ? r.top - 52 : r.bottom + 8
    setPos({ left, top })
  }, [nodeRef])

  useEffect(() => { recalc() }, [recalc, transform])

  // Click outside to close dropdown
  useEffect(() => {
    if (!openDrop) return
    const handler = e => {
      if (!toolbarRef.current?.contains(e.target) && !dropRef.current?.contains(e.target)) {
        setOpenDrop(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openDrop])

  function toggleDrop(name, el) {
    if (openDrop === name) { setOpenDrop(null); return }
    const r = el.getBoundingClientRect()
    setAnchor({ left: r.left, top: r.bottom + 6 })
    setOpenDrop(name)
  }

  // TipTap helpers
  const curSize  = parseInt(editor?.getAttributes('textStyle')?.fontSize) || 14
  const curShape = SHAPES.find(s => s.id === shape) || SHAPES[0]
  const curFill  = FILLS.find(f => f.id === fillId) || FILLS[0]
  const fillBg   = curFill.bg

  function changeSize(dir) {
    if (!editor) return
    const idx  = FONT_SIZES.findIndex(s => s >= curSize)
    const next = FONT_SIZES[Math.max(0, Math.min(FONT_SIZES.length - 1, idx + dir))]
    editor.chain().focus().setFontSize(`${next}px`).run()
  }

  return createPortal(
    <>
      {/* ── Main pill ── */}
      <div
        ref={toolbarRef}
        className="nodrag nopan"
        style={{
          position: 'fixed',
          left: pos.left,
          top: pos.top,
          zIndex: 99999,
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 1,
          padding: '4px 8px',
          userSelect: 'none',
          fontFamily: 'system-ui',
          whiteSpace: 'nowrap',
        }}
      >
        {/* Shape picker */}
        {showShapeControls && (
          <>
            <TBtn
              active={openDrop === 'shape'}
              title="Cambiar forma"
              onClick={e => toggleDrop('shape', e.currentTarget)}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{curShape.icon}</span>
              <span style={{ fontSize: 8, color: '#94a3b8', marginLeft: 1 }}>▾</span>
            </TBtn>
            <Sep />
          </>
        )}

        {/* Font size */}
        <span style={{ fontSize: 12, color: '#475569', minWidth: 22, textAlign: 'center', fontWeight: 600 }}>
          {curSize}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginLeft: 1 }}>
          <button onMouseDown={e => e.preventDefault()} onClick={() => changeSize(1)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '1px 4px', fontSize: 9, color: '#94a3b8', lineHeight: 1 }}>∧</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => changeSize(-1)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '1px 4px', fontSize: 9, color: '#94a3b8', lineHeight: 1 }}>∨</button>
        </div>

        <Sep />

        {/* Inline marks */}
        <TBtn active={editor?.isActive('bold')}      title="Negrita (Ctrl+B)"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          style={{ fontWeight: 800 }}>B</TBtn>
        <TBtn active={editor?.isActive('italic')}    title="Cursiva (Ctrl+I)"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          style={{ fontStyle: 'italic' }}>I</TBtn>
        <TBtn active={editor?.isActive('underline')} title="Subrayado (Ctrl+U)"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          style={{ textDecoration: 'underline' }}>U</TBtn>
        <TBtn active={editor?.isActive('strike')}    title="Tachado"
          onClick={() => editor?.chain().focus().toggleStrike().run()}>S̶</TBtn>

        {/* Heading */}
        <TBtn active={editor?.isActive('heading', { level: 1 })} title="Título 1"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          style={{ fontSize: 10, fontWeight: 700 }}>H1</TBtn>
        <TBtn active={editor?.isActive('heading', { level: 2 })} title="Título 2"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          style={{ fontSize: 10, fontWeight: 700 }}>H2</TBtn>

        <Sep />

        {/* Align */}
        <TBtn active={openDrop === 'align'} title="Alineación"
          onClick={e => toggleDrop('align', e.currentTarget)}>
          ≡ <span style={{ fontSize: 8, color: '#94a3b8' }}>▾</span>
        </TBtn>

        {/* Text color */}
        <TBtn active={openDrop === 'textColor'} title="Color de texto"
          onClick={e => toggleDrop('textColor', e.currentTarget)}>
          <span style={{ borderBottom: `3px solid ${editor?.getAttributes('textStyle')?.color || '#1e293b'}`, lineHeight: 1.1 }}>A</span>
          <span style={{ fontSize: 8, color: '#94a3b8', marginLeft: 1 }}>▾</span>
        </TBtn>

        {/* Highlight */}
        <TBtn active={editor?.isActive('highlight')} title="Resaltado"
          onClick={() => editor?.chain().focus().toggleHighlight().run()}
          style={{ color: editor?.isActive('highlight') ? '#6366f1' : '#f59e0b' }}>◼</TBtn>

        {/* Lists */}
        <TBtn active={editor?.isActive('bulletList')} title="Lista"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}>•≡</TBtn>

        {showShapeControls && (
          <>
            <Sep />

            {/* Fill color circle */}
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={e => toggleDrop('fill', e.currentTarget)}
              title="Color de relleno"
              className="nodrag nopan"
              style={{
                width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', padding: 0,
                flexShrink: 0, border: openDrop === 'fill' ? '2.5px solid #6366f1' : '2px solid #e2e8f0',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                background: fillBg === 'transparent'
                  ? 'repeating-conic-gradient(#e2e8f0 0% 25%,#fff 0% 50%) 0 0/8px 8px'
                  : fillBg,
              }}
            />

            {/* Stroke */}
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={e => toggleDrop('stroke', e.currentTarget)}
              title="Trazo"
              className="nodrag nopan"
              style={{
                width: 24, height: 24, borderRadius: 6, cursor: 'pointer', padding: 0, flexShrink: 0,
                border: openDrop === 'stroke' ? '2.5px solid #6366f1' : '2px solid ' + (strokeColor === 'none' ? '#e2e8f0' : strokeColor),
                background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{
                width: 10, height: 10, borderRadius: 2,
                border: `${Math.min(strokeWidth, 3)}px solid ${strokeColor === 'none' ? '#e2e8f0' : strokeColor}`,
              }} />
            </button>
          </>
        )}

        <Sep />

        {/* Delete */}
        <TBtn danger title="Eliminar" onClick={onDelete}><X size={14} strokeWidth={2.5} /></TBtn>
      </div>

      {/* ── Dropdowns ── */}
      {openDrop === 'shape' && (
        <ShapePicker
          shape={shape} onChange={onShapeChange}
          anchor={anchor} onClose={() => setOpenDrop(null)} dropRef={dropRef}
        />
      )}
      {openDrop === 'fill' && (
        <FillPicker
          fillId={fillId} onChange={onFillChange}
          anchor={anchor} onClose={() => setOpenDrop(null)} dropRef={dropRef}
        />
      )}
      {openDrop === 'stroke' && (
        <StrokePicker
          strokeColor={strokeColor} strokeWidth={strokeWidth} strokeStyle={strokeStyle}
          onColor={v => { onStrokeColor(v); }}
          onWidth={v => { onStrokeWidth(v); }}
          onStyle={v => { onStrokeStyle(v); }}
          anchor={anchor} onClose={() => setOpenDrop(null)} dropRef={dropRef}
        />
      )}
      {openDrop === 'textColor' && (
        <TextColorPicker
          editor={editor}
          anchor={anchor} onClose={() => setOpenDrop(null)} dropRef={dropRef}
        />
      )}
      {openDrop === 'align' && (
        <AlignPicker
          editor={editor}
          anchor={anchor} onClose={() => setOpenDrop(null)} dropRef={dropRef}
        />
      )}
    </>,
    document.body
  )
}
