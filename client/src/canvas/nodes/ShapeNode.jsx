import { useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position, NodeResizer, useReactFlow, useStore } from '@xyflow/react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style'
import { Underline } from '@tiptap/extension-underline'
import { Highlight } from '@tiptap/extension-highlight'
import FloatingToolbar, { SHAPES, FILLS } from './FloatingToolbar'

// ─── Clip-path shapes ─────────────────────────────────────────────────────────
function getClipPath(shape) {
  switch (shape) {
    case 'diamond':       return 'polygon(50% 0%,100% 50%,50% 100%,0% 50%)'
    case 'triangle':      return 'polygon(50% 0%,100% 100%,0% 100%)'
    case 'parallelogram': return 'polygon(12% 0%,100% 0%,88% 100%,0% 100%)'
    case 'hexagon':       return 'polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)'
    default: return null
  }
}

function getBorderRadius(shape, cornerR) {
  if (shape === 'circle')  return '50%'
  if (shape === 'rounded') return `${Math.max(cornerR, 16)}px`
  if (shape === 'callout') return `${Math.max(cornerR, 10)}px`
  if (shape === 'rect')    return `${cornerR}px`
  return 0
}

export default function ShapeNode({ id, data, selected }) {
  const [shape,       setShape]       = useState(data.shape       ?? 'rect')
  const [fillId,      setFillId]      = useState(data.fillId      ?? 'white')
  const [strokeColor, setStrokeColor] = useState(data.strokeColor ?? '#94a3b8')
  const [strokeWidth, setStrokeWidth] = useState(data.strokeWidth ?? 2)
  const [strokeStyle, setStrokeStyle] = useState(data.strokeStyle ?? 'solid')
  const [cornerR,     setCornerR]     = useState(data.cornerR     ?? 4)
  const [opacity,     setOpacity]     = useState(data.opacity     ?? 100)

  const nodeRef = useRef(null)
  const { setNodes, deleteElements } = useReactFlow()
  // Subscribe to canvas transform so toolbar repositions on pan/zoom/drag
  const transform = useStore(s => s.transform)

  const fill = FILLS.find(f => f.id === fillId) || FILLS[0]
  const clipPath = getClipPath(shape)
  const usesClip = !!clipPath
  const dashArray = strokeStyle === 'dashed' ? '6 4' : strokeStyle === 'dotted' ? '2 3' : undefined

  // ── TipTap editor ────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      FontSize,
      Underline,
      Highlight.configure({ multicolor: false }),
    ],
    content: data.html || '<p></p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      persist({ html })
    },
    editorProps: {
      attributes: {
        class: 'shape-editor',
        style: [
          'outline:none',
          'min-height:20px',
          'font-family:system-ui,-apple-system,sans-serif',
          'text-align:center',
        ].join(';'),
      },
    },
  })

  // Block canvas zoom while inside node
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleShapeChange  = useCallback(v => { setShape(v);       persist({ shape: v }) },       [persist])
  const handleFillChange   = useCallback(v => { setFillId(v);      persist({ fillId: v }) },      [persist])
  const handleStrokeColor  = useCallback(v => { setStrokeColor(v); persist({ strokeColor: v }) }, [persist])
  const handleStrokeWidth  = useCallback(v => { setStrokeWidth(v); persist({ strokeWidth: v }) }, [persist])
  const handleStrokeStyle  = useCallback(v => { setStrokeStyle(v); persist({ strokeStyle: v }) }, [persist])
  const handleDelete       = useCallback(() => deleteElements({ nodes: [{ id }] }), [id, deleteElements])

  const textColor = fill.id === 'slate' || fill.id === 'darkblue' ? '#f1f5f9' : '#1e293b'

  return (
    <>
      <style>{`
        .shape-editor { outline: none; }
        .shape-editor p { margin: 0 0 4px; }
        .shape-editor h1 { font-size: 1.6em; font-weight: 800; margin: 0 0 6px; }
        .shape-editor h2 { font-size: 1.3em; font-weight: 700; margin: 0 0 6px; }
        .shape-editor h3 { font-size: 1.1em; font-weight: 600; margin: 0 0 4px; }
        .shape-editor ul { padding-left: 18px; margin: 0 0 4px; }
        .shape-editor ol { padding-left: 18px; margin: 0 0 4px; }
        .shape-editor li { margin: 0 0 2px; }
        .shape-editor mark { background: #fde68a; border-radius: 2px; padding: 0 1px; }
        .shape-editor p:first-child:empty::before {
          content: "Texto…";
          color: #94a3b8; pointer-events: none; float: left; height: 0;
        }
      `}</style>

      <NodeResizer
        isVisible={selected}
        minWidth={80} minHeight={60}
        handleStyle={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', border: `2px solid ${strokeColor === 'none' ? '#94a3b8' : strokeColor}` }}
        lineStyle={{ borderColor: '#6366f140', borderWidth: 1 }}
      />

      {/* Floating horizontal toolbar (portaled above node) */}
      {selected && (
        <FloatingToolbar
          editor={editor}
          nodeRef={nodeRef}
          transform={transform}
          shape={shape}       onShapeChange={handleShapeChange}
          fillId={fillId}     onFillChange={handleFillChange}
          strokeColor={strokeColor} onStrokeColor={handleStrokeColor}
          strokeWidth={strokeWidth} onStrokeWidth={handleStrokeWidth}
          strokeStyle={strokeStyle} onStrokeStyle={handleStrokeStyle}
          onDelete={handleDelete}
          showShapeControls={true}
        />
      )}

      {/* ── Shape body ── */}
      <div ref={nodeRef} style={{ width: '100%', height: '100%', position: 'relative', opacity: opacity / 100 }}>

        {/* SVG border overlay for clip-path shapes */}
        {usesClip && strokeColor !== 'none' && strokeWidth > 0 && (
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2, overflow: 'visible' }}
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            {shape === 'diamond'       && <polygon points="50,2 98,50 50,98 2,50"           fill="none" stroke={strokeColor} strokeWidth={strokeWidth * 0.8} strokeDasharray={dashArray} vectorEffect="non-scaling-stroke" />}
            {shape === 'triangle'      && <polygon points="50,2 98,98 2,98"                 fill="none" stroke={strokeColor} strokeWidth={strokeWidth * 0.8} strokeDasharray={dashArray} vectorEffect="non-scaling-stroke" />}
            {shape === 'parallelogram' && <polygon points="12,2 98,2 88,98 2,98"            fill="none" stroke={strokeColor} strokeWidth={strokeWidth * 0.8} strokeDasharray={dashArray} vectorEffect="non-scaling-stroke" />}
            {shape === 'hexagon'       && <polygon points="25,2 75,2 98,50 75,98 25,98 2,50" fill="none" stroke={strokeColor} strokeWidth={strokeWidth * 0.8} strokeDasharray={dashArray} vectorEffect="non-scaling-stroke" />}
          </svg>
        )}

        {/* Main shape */}
        <div style={{
          width: '100%', height: '100%', boxSizing: 'border-box',
          background: fill.bg,
          ...(usesClip
            ? { clipPath }
            : {
                borderRadius: getBorderRadius(shape, cornerR),
                border: strokeColor !== 'none' && strokeWidth > 0
                  ? `${strokeWidth}px ${strokeStyle} ${strokeColor}`
                  : 'none',
              }
          ),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative',
          outline: selected && !usesClip ? '2px solid #6366f130' : 'none',
          outlineOffset: 2,
        }}>
          {/* Editor — nodrag nopan prevents React Flow from capturing events */}
          <div
            className="nodrag nopan"
            style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, boxSizing: 'border-box', overflow: 'auto' }}
            onClick={() => editor?.chain().focus().run()}
          >
            <EditorContent
              editor={editor}
              style={{ width: '100%', color: textColor }}
            />
          </div>
        </div>

        {/* Callout tail */}
        {shape === 'callout' && strokeWidth > 0 && strokeColor !== 'none' && (
          <svg style={{ position: 'absolute', bottom: -18, left: 20, width: 20, height: 20, pointerEvents: 'none' }} viewBox="0 0 20 20">
            <polygon points="0,0 20,0 6,20" fill={fill.bg} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <Handle type="source" position={Position.Right}  style={{ background: strokeColor === 'none' ? '#94a3b8' : strokeColor, width: 9, height: 9, borderRadius: '50%', border: '2px solid #fff', zIndex: 10 }} />
      <Handle type="target" position={Position.Left}   style={{ background: strokeColor === 'none' ? '#94a3b8' : strokeColor, width: 9, height: 9, borderRadius: '50%', border: '2px solid #fff', zIndex: 10 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: strokeColor === 'none' ? '#94a3b8' : strokeColor, width: 9, height: 9, borderRadius: '50%', border: '2px solid #fff', zIndex: 10 }} />
      <Handle type="target" position={Position.Top}    style={{ background: strokeColor === 'none' ? '#94a3b8' : strokeColor, width: 9, height: 9, borderRadius: '50%', border: '2px solid #fff', zIndex: 10 }} />
    </>
  )
}
