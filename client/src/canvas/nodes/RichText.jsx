/**
 * RichText.jsx — TipTap rich-text editor for canvas nodes
 * IMPORTANT: wraps editor in `nodrag nopan` so React Flow doesn't intercept
 * mouse/keyboard events inside the editor.
 */
import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style'
import { Underline } from '@tiptap/extension-underline'
import { Highlight } from '@tiptap/extension-highlight'

// ─── Colour palette ───────────────────────────────────────────────────────────
const TEXT_COLORS = [
  '#000000','#1e293b','#374151','#6b7280','#94a3b8','#ffffff',
  '#dc2626','#ea580c','#ca8a04','#16a34a','#0891b2','#2563eb',
  '#7c3aed','#db2777','#f97316','#84cc16','#06b6d4','#ec4899',
]

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64]

// ─── Icon button ─────────────────────────────────────────────────────────────
const Ic = ({ ch, active, title, onClick, style: extra = {} }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 24, height: 24,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? 'rgba(99,102,241,0.14)' : 'transparent',
      border: active ? '1px solid #6366f140' : '1px solid transparent',
      borderRadius: 4, cursor: 'pointer',
      color: active ? '#6366f1' : '#374151',
      fontSize: 11, fontWeight: active ? 700 : 500,
      fontFamily: 'system-ui', flexShrink: 0, ...extra,
    }}
  >{ch}</button>
)

const Sep = () => (
  <div style={{ width: 1, height: 16, background: '#e2e8f0', margin: '0 2px', flexShrink: 0 }} />
)

// ─── Toolbar ─────────────────────────────────────────────────────────────────
function Toolbar({ editor }) {
  if (!editor) return null

  const curSize = parseInt(editor.getAttributes('textStyle').fontSize) || 14

  function changeSize(dir) {
    const idx  = FONT_SIZES.findIndex(s => s >= curSize)
    const next = FONT_SIZES[Math.max(0, Math.min(FONT_SIZES.length - 1, idx + dir))]
    editor.chain().focus().setFontSize(`${next}px`).run()
  }

  return (
    <div
      className="nodrag nopan"
      style={{
        display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
        padding: '3px 5px', boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
        fontFamily: 'system-ui', userSelect: 'none',
      }}
    >
      {/* Block type */}
      <Ic ch="¶"  title="Párrafo"  active={editor.isActive('paragraph')}
        onClick={() => editor.chain().focus().setParagraph().run()} />
      <Ic ch="H1" title="Título 1" active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
      <Ic ch="H2" title="Título 2" active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <Ic ch="H3" title="Título 3" active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <Sep />
      {/* Inline marks */}
      <Ic ch="B"  title="Negrita"   active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()} style={{ fontWeight: 700 }} />
      <Ic ch="I"  title="Cursiva"   active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()} style={{ fontStyle: 'italic' }} />
      <Ic ch="U"  title="Subrayado" active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()} style={{ textDecoration: 'underline' }} />
      <Ic ch="S̶"  title="Tachado"  active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()} />
      <Ic ch="◼"  title="Resaltado" active={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        style={{ color: editor.isActive('highlight') ? '#6366f1' : '#fbbf24' }} />
      <Sep />
      {/* Font size */}
      <Ic ch="−" title="Reducir" active={false} onClick={() => changeSize(-1)} />
      <span style={{ fontSize: 10, fontWeight: 600, color: '#475569', minWidth: 22, textAlign: 'center', userSelect: 'none' }}>
        {curSize}
      </span>
      <Ic ch="+" title="Aumentar" active={false} onClick={() => changeSize(1)} />
      <Sep />
      {/* Align */}
      <Ic ch="⬤" title="Izquierda" active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()} style={{ fontSize: 8, letterSpacing: -1 }} />
      <Ic ch="⬤" title="Centro"   active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()} style={{ fontSize: 8 }} />
      <Ic ch="⬤" title="Derecha"  active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()} style={{ fontSize: 8 }} />
      <Sep />
      {/* Lists */}
      <Ic ch="•≡" title="Lista"      active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <Ic ch="1≡" title="Numerada"   active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <Sep />
      {/* Colour swatches */}
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', maxWidth: 120 }}>
        {TEXT_COLORS.map(c => (
          <button key={c} onClick={() => editor.chain().focus().setColor(c).run()} title={c}
            style={{
              width: 12, height: 12, borderRadius: 3,
              background: c, border: '1px solid #e2e8f020',
              cursor: 'pointer', padding: 0, flexShrink: 0,
              outline: editor.isActive('textStyle', { color: c }) ? '2px solid #6366f1' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function RichText({
  initialContent = '',
  onChange,
  placeholder = 'Escribí acá…',
  style = {},
  showToolbar = true,
}) {
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
    content: initialContent || '<p></p>',
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        style: 'outline:none;min-height:100%;font-family:system-ui,-apple-system,sans-serif;',
      },
    },
  })

  // Sync on mount only
  useEffect(() => {
    if (!editor || !initialContent) return
    if (editor.getHTML() === initialContent) return
    editor.commands.setContent(initialContent, false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="nodrag nopan"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}
    >
      <style>{`
        .tiptap-editor { outline: none; min-height: 20px; }
        .tiptap-editor p { margin: 0 0 4px; }
        .tiptap-editor h1 { font-size: 1.6em; font-weight: 800; margin: 0 0 6px; }
        .tiptap-editor h2 { font-size: 1.3em; font-weight: 700; margin: 0 0 6px; }
        .tiptap-editor h3 { font-size: 1.1em; font-weight: 600; margin: 0 0 4px; }
        .tiptap-editor ul { padding-left: 18px; margin: 0 0 4px; }
        .tiptap-editor ol { padding-left: 18px; margin: 0 0 4px; }
        .tiptap-editor li { margin: 0 0 2px; }
        .tiptap-editor mark { background: #fde68a; border-radius: 2px; padding: 0 1px; }
        .tiptap-editor p:first-child:empty::before {
          content: "${placeholder}";
          color: #94a3b8; pointer-events: none; float: left; height: 0;
        }
      `}</style>

      {showToolbar && (
        <div style={{ flexShrink: 0, paddingBottom: 4 }}>
          <Toolbar editor={editor} />
        </div>
      )}

      <div
        style={{ flex: 1, overflow: 'auto', padding: '6px 2px', ...style }}
        onClick={() => editor?.chain().focus().run()}
      >
        <EditorContent editor={editor} style={{ height: '100%' }} />
      </div>
    </div>
  )
}
