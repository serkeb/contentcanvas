import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, NodeResizer, NodeToolbar, useReactFlow } from '@xyflow/react'
import Markdown from './Markdown'
import { Layers, Mail, FileText, Film, X, Copy, Check, ExternalLink, RefreshCw, Sparkles } from 'lucide-react'
import { SiInstagram, SiX, SiLinkedin } from './SocialIcons'

const ACCENT = '#06b6d4'

const FORMAT_ICONS = {
  captionIG: SiInstagram,
  hiloX: SiX,
  email: Mail,
  carruselOutline: FileText,
  shortClipIdea: Film,
  linkedinPost: SiLinkedin,
}

const FORMAT_LABELS = {
  captionIG: 'Caption Instagram',
  hiloX: 'Hilo X/Twitter',
  email: 'Email / Newsletter',
  carruselOutline: 'Carrusel',
  shortClipIdea: 'Idea de Clip',
  linkedinPost: 'Post LinkedIn',
}

function OutputPanel({ content, format, sourceTitle, onClose }) {
  const [copied, setCopied] = useState(false)
  const FormatIcon = FORMAT_ICONS[format] || RefreshCw
  function copy() {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
        zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 640, maxHeight: '84vh', background: '#fff',
          borderRadius: 18, boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: 'system-ui', animation: 'fadeUp 0.18s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }`}</style>
        <div style={{ height: 4, flexShrink: 0, background: `linear-gradient(90deg, ${ACCENT}, #22d3ee, #67e8f9)` }} />
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, background: `${ACCENT}10`, border: `1px solid ${ACCENT}25`, borderRadius: 5, padding: '2px 8px' }}>
            ↺ REPURPOSE
          </span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FormatIcon size={16} /> {FORMAT_LABELS[format] || format}
          </span>
          <button onClick={copy} style={{
            padding: '5px 14px', background: copied ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${copied ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 7,
            color: copied ? '#16a34a' : '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}>{copied ? <><Check size={12} strokeWidth={2.5} /> Copiado</> : <><Copy size={12} strokeWidth={2} /> Copiar</>}</button>
          <button onClick={onClose} style={{
            width: 28, height: 28, background: '#f1f5f9', border: 'none', borderRadius: 7,
            color: '#64748b', fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={14} strokeWidth={2} /></button>
        </div>
        {sourceTitle && (
          <div style={{
            padding: '8px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9',
            fontSize: 10, color: '#64748b',
          }}>
            Fuente: {sourceTitle}
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <Markdown fontSize={13}>{content}</Markdown>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function RepurposingOutputNode({ id, data, selected }) {
  const { deleteElements } = useReactFlow()
  const nodeRef = useRef(null)
  const [showPanel, setShowPanel] = useState(false)
  const [copied, setCopied] = useState(false)

  const content       = data.content       || ''
  const format        = data.format        || ''
  const sourceTitle   = data.sourceTitle   || ''
  const version       = data.version       || null

  // Block canvas wheel inside node
  useEffect(() => {
    const el = nodeRef.current; if (!el) return
    const stop = e => e.stopPropagation()
    el.addEventListener('wheel', stop)
    return () => el.removeEventListener('wheel', stop)
  }, [])

  function handleCopy() {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const FormatIcon = FORMAT_ICONS[format] || RefreshCw
  const formatLabel = FORMAT_LABELS[format] || format

  return (
    <>
      <NodeToolbar isVisible={selected} position="top" align="end">
        <button
          onClick={() => deleteElements({ nodes: [{ id }] })}
          style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7,
            color: '#dc2626', fontSize: 10, fontWeight: 600, cursor: 'pointer',
            padding: '4px 10px', fontFamily: 'system-ui', display: 'flex', alignItems: 'center', gap: 4,
          }}
        ><X size={12} strokeWidth={2} /> Eliminar</button>
      </NodeToolbar>

      <NodeResizer
        isVisible={selected}
        minWidth={320} minHeight={200}
        handleStyle={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', border: `2px solid ${ACCENT}` }}
        lineStyle={{ borderColor: `${ACCENT}50` }}
      />

      {/* Left handle — receives from RepurposingNode */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: ACCENT, border: `2px solid ${ACCENT}60`, width: 10, height: 10 }}
      />

      {/* Right handle — connect to other nodes as text source */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#22c55e', border: '2px solid #16a34a60', width: 10, height: 10 }}
      />

      <div ref={nodeRef} style={{
        width: '100%', height: '100%',
        background: '#fff',
        border: `1.5px solid ${selected ? ACCENT + '80' : ACCENT + '28'}`,
        borderRadius: 14, display: 'flex', flexDirection: 'column',
        fontFamily: 'system-ui', overflow: 'hidden',
        boxShadow: selected
          ? `0 0 0 3px ${ACCENT}14, 0 8px 28px rgba(6,182,212,0.14)`
          : '0 2px 12px rgba(6,182,212,0.08)',
      }}>
        {/* Top gradient strip */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${ACCENT}, #22d3ee, #67e8f9)`, flexShrink: 0 }} />

        {/* Header */}
        <div style={{
          padding: '8px 12px', borderBottom: '1px solid #f1f5f9',
          background: `${ACCENT}04`, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: ACCENT,
            background: `${ACCENT}12`, border: `1px solid ${ACCENT}25`,
            borderRadius: 5, padding: '2px 7px', letterSpacing: '0.04em',
          }}><RefreshCw size={10} strokeWidth={2} /> REPURPOSE</span>

          <span style={{
            fontSize: 9, background: '#f1f5f9', border: '1px solid #e2e8f0',
            borderRadius: 4, padding: '2px 6px', color: '#475569', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <FormatIcon size={10} /> {formatLabel}{version ? ` v${version}` : ''}
          </span>

          {sourceTitle && (
            <span style={{
              flex: 1, fontSize: 10, color: '#64748b',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              De: {sourceTitle}
            </span>
          )}

          <button onClick={handleCopy} style={{
            padding: '3px 8px',
            background: copied ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${copied ? '#bbf7d0' : '#e2e8f0'}`,
            borderRadius: 5, color: copied ? '#16a34a' : '#64748b',
            fontSize: 9, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}>{copied ? <Check size={10} strokeWidth={2.5} /> : <Copy size={10} strokeWidth={2} />}</button>

          <button onClick={() => setShowPanel(true)} style={{
            padding: '3px 8px',
            background: `${ACCENT}10`, border: `1px solid ${ACCENT}25`,
            borderRadius: 5, color: ACCENT,
            fontSize: 9, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}><ExternalLink size={10} strokeWidth={2} /> Ver</button>
        </div>

        {/* Content */}
        <div className="nodrag nopan" style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
          <Markdown fontSize={11}>{content}</Markdown>
        </div>
      </div>

      {showPanel && (
        <OutputPanel
          content={content}
          format={format}
          sourceTitle={sourceTitle}
          onClose={() => setShowPanel(false)}
        />
      )}
    </>
  )
}
