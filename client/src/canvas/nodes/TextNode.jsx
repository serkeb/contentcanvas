/**
 * TextNode — Plain canvas text node, Miro-style.
 * No box by default. Uses the same FloatingToolbar as ShapeNode
 * (minus shape/fill/stroke controls) + an extra background panel.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, NodeResizer, useReactFlow, useStore } from '@xyflow/react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style'
import { Underline } from '@tiptap/extension-underline'
import { Highlight } from '@tiptap/extension-highlight'
import FloatingToolbar from './FloatingToolbar'

const BG_OPTIONS = [
  { id: 'none',   bg: 'transparent', label: 'Sin fondo' },
  { id: 'white',  bg: '#ffffff',     label: 'Blanco' },
  { id: 'yellow', bg: '#fefce8',     label: 'Amarillo' },
  { id: 'blue',   bg: '#eff6ff',     label: 'Azul' },
  { id: 'green',  bg: '#f0fdf4',     label: 'Verde' },
  { id: 'purple', bg: '#f5f3ff',     label: 'Violeta' },
  { id: 'pink',   bg: '#fdf4ff',     label: 'Rosa' },
  { id: 'orange', bg: '#fff7ed',     label: 'Naranja' },
  { id: 'dark',   bg: '#1e293b',     label: 'Oscuro' },
]

const BORDER_COLORS = [
  'none','#94a3b8','#6366f1','#f59e0b','#22c55e','#f43f5e','#8b5cf6','#1e293b',
]

function Swatch({ bg, selected, onClick, title }) {
  return (
    <button onMouseDown={e => e.preventDefault()} onClick={onClick} title={title}
      style={{
        width: 20, height: 20, borderRadius: 4, cursor: 'pointer', padding: 0,
        background: bg === 'transparent'
          ? 'repeating-conic-gradient(#e2e8f0 0% 25%,#fff 0% 50%) 0 0/8px 8px'
          : bg,
        border: selected ? '2.5px solid #6366f1' : '1.5px solid #e2e8f0',
        boxShadow: selected ? '0 0 0 1px #6366f160' : 'none',
        flexShrink: 0,
      }}
    />
  )
}

export default function TextNode({ id, data, selected }) {
  const { setNodes, deleteElements } = useReactFlow()
  const transform = useStore(s => s.transform)

  const [bgId,        setBgId]        = useState(data.bgId        ?? 'none')
  const [borderColor, setBorderColor] = useState(data.borderColor ?? 'none')
  const [borderWidth, setBorderWidth] = useState(data.borderWidth ?? 0)
  const [borderStyle, setBorderStyle] = useState(data.borderStyle ?? 'solid')
  const [padding,     setPadding]     = useState(data.padding     ?? 8)
  const [showBgPanel, setShowBgPanel] = useState(false)
  const [bgAnchor,    setBgAnchor]    = useState({ left: 0, top: 0 })
  const [editing,     setEditing]     = useState(false)

  const nodeRef = useRef(null)
  const bg = BG_OPTIONS.find(o => o.id === bgId) || BG_OPTIONS[0]
  const hasBorder = borderColor !== 'none' && borderWidth > 0

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle, Color, FontSize,
      Underline,
      Highlight.configure({ multicolor: false }),
    ],
    content: data.html || data.text || '<p></p>',
    onUpdate: ({ editor }) => persist({ html: editor.getHTML() }),
    onFocus: () => setEditing(true),
    onBlur:  () => setEditing(false),
    editorProps: {
      attributes: {
        class: 'text-node-editor',
        style: 'outline:none;min-height:20px;font-family:system-ui,-apple-system,sans-serif;',
      },
    },
  })

  useEffect(() => {
    const el = nodeRef.current
    if (!el) return
    const stop = e => e.stopPropagation()
    el.addEventListener('wheel', stop)
    return () => el.removeEventListener('wheel', stop)
  }, [])

  const persist = useCallback((updates) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n))
  }, [id, setNodes])

  // Close bg panel on outside click
  useEffect(() => {
    if (!showBgPanel) return
    const h = e => { setShowBgPanel(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showBgPanel])

  // Background panel (portaled)
  const BgPanel = showBgPanel && createPortal(
    <div
      className="nodrag nopan"
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed', left: bgAnchor.left, top: bgAnchor.top,
        zIndex: 100001, background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 12, padding: '12px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        width: 220, fontFamily: 'system-ui',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>FONDO</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {BG_OPTIONS.map(o => (
            <Swatch key={o.id} bg={o.bg} title={o.label} selected={bgId === o.id}
              onClick={() => { setBgId(o.id); persist({ bgId: o.id }) }} />
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>BORDE</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
          {BORDER_COLORS.map(c => (
            <Swatch key={c} bg={c === 'none' ? 'transparent' : c} title={c === 'none' ? 'Sin borde' : c}
              selected={borderColor === c}
              onClick={() => {
                setBorderColor(c)
                if (c !== 'none' && borderWidth === 0) { setBorderWidth(1); persist({ borderColor: c, borderWidth: 1 }) }
                else persist({ borderColor: c })
              }}
            />
          ))}
        </div>
        {borderColor !== 'none' && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[1, 2, 3, 4].map(w => (
              <button key={w} onMouseDown={e => e.preventDefault()}
                onClick={() => { setBorderWidth(w); persist({ borderWidth: w }) }}
                style={{
                  padding: '2px 8px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600,
                  background: borderWidth === w ? '#6366f1' : '#f1f5f9',
                  color: borderWidth === w ? '#fff' : '#64748b',
                }}
              >{w}px</button>
            ))}
          </div>
        )}
      </div>
      {(bgId !== 'none' || hasBorder) && (
        <label style={{ fontSize: 10, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 4 }}>
          Relleno interno: {padding}px
          <input type="range" min={0} max={40} value={padding}
            onChange={e => { const v = +e.target.value; setPadding(v); persist({ padding: v }) }}
            style={{ width: '100%' }} />
        </label>
      )}
    </div>,
    document.body
  )

  return (
    <>
      <style>{`
        .text-node-editor { outline: none; }
        .text-node-editor p { margin: 0 0 4px; }
        .text-node-editor h1 { font-size: 1.6em; font-weight: 800; margin: 0 0 6px; }
        .text-node-editor h2 { font-size: 1.3em; font-weight: 700; margin: 0 0 6px; }
        .text-node-editor h3 { font-size: 1.1em; font-weight: 600; margin: 0 0 4px; }
        .text-node-editor ul { padding-left: 18px; margin: 0; }
        .text-node-editor ol { padding-left: 18px; margin: 0; }
        .text-node-editor li { margin: 0 0 2px; }
        .text-node-editor mark { background: #fde68a; border-radius: 2px; padding: 0 1px; }
        .text-node-editor p:first-child:empty::before {
          content: "Doble clic para editar…"; color: #94a3b8; pointer-events: none; float: left; height: 0;
        }
      `}</style>

      <NodeResizer
        isVisible={selected}
        minWidth={80} minHeight={30}
        handleStyle={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', border: '2px solid #94a3b8' }}
        lineStyle={{ borderColor: '#94a3b870', borderWidth: 1 }}
      />

      {/* Floating toolbar — text-only (no shape/fill/stroke) + a "background" button */}
      {selected && (
        <FloatingToolbar
          editor={editor}
          nodeRef={nodeRef}
          transform={transform}
          fillId={bgId}
          onFillChange={v => { setBgId(v); persist({ bgId: v }) }}
          strokeColor={borderColor === 'none' ? '#94a3b8' : borderColor}
          onStrokeColor={v => { setBorderColor(v); persist({ borderColor: v }) }}
          strokeWidth={borderWidth}
          onStrokeWidth={v => { setBorderWidth(v); persist({ borderWidth: v }) }}
          strokeStyle={borderStyle}
          onStrokeStyle={v => { setBorderStyle(v); persist({ borderStyle: v }) }}
          onDelete={() => deleteElements({ nodes: [{ id }] })}
          showShapeControls={false}
        />
      )}

      {BgPanel}

      <div
        ref={nodeRef}
        onDoubleClick={() => { editor?.chain().focus().run() }}
        style={{
          width: '100%', height: '100%',
          minWidth: 80, minHeight: 32,
          background: bg.bg,
          border: hasBorder ? `${borderWidth}px ${borderStyle} ${borderColor}` : 'none',
          borderRadius: bgId !== 'none' || hasBorder ? 8 : 0,
          padding: bgId !== 'none' || hasBorder ? `${padding}px` : 0,
          boxSizing: 'border-box',
          outline: selected && !editing ? '1.5px dashed #6366f140' : 'none',
          outlineOffset: 3,
          transition: 'background 0.15s',
          overflow: 'hidden',
          cursor: editing ? 'text' : 'move',
        }}
      >
        <div
          className={editing ? 'nodrag nopan' : ''}
          style={{ width: '100%', height: '100%', overflow: 'hidden' }}
        >
          <EditorContent
            editor={editor}
            style={{ color: bgId === 'dark' ? '#f1f5f9' : '#1e293b' }}
          />
        </div>
      </div>

      <Handle type="source" position={Position.Right}
        style={{ background: '#94a3b8', border: '2px solid #fff', width: 9, height: 9, borderRadius: '50%' }} />
      <Handle type="target" position={Position.Left}
        style={{ background: '#94a3b8', border: '2px solid #fff', width: 9, height: 9, borderRadius: '50%' }} />
    </>
  )
}
