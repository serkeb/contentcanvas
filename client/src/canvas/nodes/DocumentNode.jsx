import { useState } from 'react'
import { Handle, Position, NodeToolbar, useReactFlow } from '@xyflow/react'
import { FileText, FileCode, ClipboardList, BarChart } from 'lucide-react'

const TYPE_CFG = {
  pdf:  { color: '#e11d48', icon: FileText, label: 'PDF'        },
  gdoc: { color: '#1a73e8', icon: FileText, label: 'Google Doc' },
  txt:  { color: '#64748b', icon: FileCode, label: 'TXT'        },
  md:   { color: '#8b5cf6', icon: ClipboardList, label: 'Markdown'   },
  csv:  { color: '#f59e0b', icon: BarChart, label: 'CSV'        },
}

function Skeletons() {
  return (
    <div style={{ marginTop: 6 }}>
      {[100, 80, 90, 65].map((w, i) => (
        <div key={i} style={{
          height: 7, width: `${w}%`,
          background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
          backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
          borderRadius: 4, marginBottom: 5,
        }} />
      ))}
    </div>
  )
}

export default function DocumentNode({ data, id, selected }) {
  const { deleteElements } = useReactFlow()
  const { name, type, state, text, pages, error, url } = data
  const [expanded, setExpanded] = useState(false)

  const cfg = TYPE_CFG[type] || TYPE_CFG.txt
  const charCount = text ? text.length : 0

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <NodeToolbar isVisible={selected} position="top" align="end" style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => deleteElements({ nodes: [{ id }] })}
          style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7,
            color: '#dc2626', fontSize: 10, fontWeight: 600,
            cursor: 'pointer', padding: '4px 10px', fontFamily: 'system-ui',
            display: 'flex', alignItems: 'center', gap: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          ✕ Eliminar
        </button>
      </NodeToolbar>

      <div style={{
        background: '#ffffff',
        border: `1px solid ${cfg.color}33`,
        borderRadius: 14,
        minWidth: 260,
        maxWidth: 300,
        boxShadow: `0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px ${cfg.color}11`,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#0f172a',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: '12px 14px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`,
              borderRadius: 6, padding: '2px 8px',
              fontSize: 10, fontWeight: 700, color: cfg.color,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <cfg.icon size={12} strokeWidth={2} /> {cfg.label}
            </span>
            <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 'auto' }}>DOC</span>
            {url && (
              <a
                href={url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ fontSize: 10, color: cfg.color, textDecoration: 'none', flexShrink: 0 }}
              >
                ↗ Abrir
              </a>
            )}
          </div>
          <div style={{
            fontSize: 11, color: '#334155', fontWeight: 500,
            lineHeight: 1.4, wordBreak: 'break-word',
          }}>
            {name || 'Documento'}
          </div>
        </div>

        {/* State bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 14px',
          background: state === 'listo' ? '#22c55e08' : state === 'error' ? '#ef444408' : `${cfg.color}06`,
          borderTop: `1px solid ${state === 'listo' ? '#22c55e20' : state === 'error' ? '#ef444420' : cfg.color + '20'}`,
          borderBottom: `1px solid ${state === 'listo' ? '#22c55e20' : state === 'error' ? '#ef444420' : cfg.color + '20'}`,
        }}>
          {state === 'extracting' && (
            <span style={{
              display: 'inline-block', width: 8, height: 8,
              border: `2px solid ${cfg.color}33`, borderTopColor: cfg.color,
              borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0,
            }} />
          )}
          {state === 'listo' && <span style={{ fontSize: 9, color: '#22c55e' }}>✓</span>}
          {state === 'error' && <span style={{ fontSize: 9, color: '#ef4444' }}>✕</span>}

          <span style={{
            fontSize: 10, fontWeight: 600,
            color: state === 'listo' ? '#22c55e' : state === 'error' ? '#ef4444' : cfg.color,
          }}>
            {state === 'extracting' ? 'Extrayendo texto…'
              : state === 'listo' ? 'Texto listo'
              : 'Error'}
          </span>

          {state === 'listo' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {pages && (
                <span style={{ fontSize: 9, color: '#94a3b8', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '1px 5px' }}>
                  {pages}p
                </span>
              )}
              <span style={{ fontSize: 9, color: '#94a3b8', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '1px 5px' }}>
                {charCount > 1000 ? `${(charCount / 1000).toFixed(1)}k` : charCount} car.
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '10px 14px 12px' }}>
          {state === 'extracting' && <Skeletons />}

          {state === 'error' && (
            <div style={{
              fontSize: 11, color: '#dc2626', background: '#fef2f2',
              border: '1px solid #fecaca', borderRadius: 8,
              padding: '8px 10px', lineHeight: 1.5,
            }}>
              {error || 'No se pudo extraer el texto del documento.'}
            </div>
          )}

          {state === 'listo' && text && (
            <>
              <div style={{
                fontSize: 11, color: '#475569', lineHeight: 1.65,
                maxHeight: expanded ? 'none' : 120,
                overflow: expanded ? 'visible' : 'hidden',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {text}
              </div>
              {text.length > 250 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  style={{
                    background: 'none', border: '1px solid #e2e8f0', borderRadius: 6,
                    color: '#94a3b8', fontSize: 10, cursor: 'pointer',
                    padding: '3px 10px', marginTop: 6, display: 'block', width: '100%',
                  }}
                >
                  {expanded ? '▲ Colapsar' : '▼ Ver contenido'}
                </button>
              )}
            </>
          )}
        </div>

        <Handle type="source" position={Position.Right} style={{
          background: cfg.color, border: `2px solid ${cfg.color}60`,
          width: 10, height: 10, borderRadius: '50%',
        }} />
      </div>
    </>
  )
}
