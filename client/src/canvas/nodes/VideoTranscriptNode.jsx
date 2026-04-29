import { useState, memo } from 'react'
import { Handle, Position, NodeToolbar, useReactFlow } from '@xyflow/react'
import { layoutGroupChildren } from '../utils/layout'

const PLATFORM_COLORS = {
  YouTube: '#ef4444',
  Instagram: '#ec4899',
  TikTok: '#06b6d4',
}

const PLATFORM_ICONS = {
  YouTube: '▶',
  Instagram: '◈',
  TikTok: '♪',
}

function Spinner({ color }) {
  return (
    <span style={{
      display: 'inline-block', width: 9, height: 9,
      border: `2px solid ${color}33`, borderTopColor: color,
      borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0,
    }} />
  )
}

function Skeletons({ rows = 4 }) {
  return (
    <div style={{ marginTop: 6 }}>
      {[100, 85, 92, 70].slice(0, rows).map((w, i) => (
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

// ── Compact mode (inside a collection) ────────────────────────────────────────

function CompactView({ data, id, selected, platformColor, icon }) {
  const { deleteElements, setNodes } = useReactFlow()
  const { url, platform, title, state, transcript, language, error, thumbnail } = data
  const [expanded, setExpanded] = useState(false)

  const displayTitle = title || (url ? url.replace(/^https?:\/\//, '').substring(0, 28) + '…' : 'Cargando...')

  function removeFromGroup() {
    setNodes(prev => {
      const node = prev.find(n => n.id === id)
      const oldGroupId = node?.parentId
      const parent = prev.find(p => p.id === oldGroupId)
      const absX = (parent?.position.x ?? 0) + (parent?.style?.width ?? 500) + 60
      const absY = (parent?.position.y ?? 0) + (node?.position.y ?? 0)

      let updated = prev.map(n => {
        if (n.id !== id) return n
        return {
          ...n,
          parentId: undefined,
          position: { x: absX, y: absY },
          data: { ...n.data, groupId: null, compact: false },
        }
      })

      // Re-layout remaining nodes in the old group
      if (oldGroupId) updated = layoutGroupChildren(updated, oldGroupId)
      return updated
    })
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <NodeToolbar isVisible={selected} position="top" align="end" style={{ display: 'flex', gap: 5 }}>
        <button
          onClick={removeFromGroup}
          style={{
            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7,
            color: '#475569', fontSize: 10, fontWeight: 600,
            cursor: 'pointer', padding: '4px 10px', fontFamily: 'system-ui',
            display: 'flex', alignItems: 'center', gap: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          ↗ Sacar
        </button>
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
        background: '#fff',
        border: `1px solid ${selected ? platformColor + '55' : platformColor + '28'}`,
        borderRadius: 10,
        width: 220,
        boxShadow: selected
          ? `0 0 0 2px ${platformColor}18, 0 2px 8px rgba(0,0,0,0.08)`
          : '0 1px 5px rgba(0,0,0,0.07)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>

        {/* Main row: thumbnail + info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px' }}>
          {/* Thumbnail */}
          <div style={{
            width: 52, height: 36, borderRadius: 6, flexShrink: 0,
            background: `${platformColor}12`,
            border: `1px solid ${platformColor}25`,
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {thumbnail ? (
              <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 18, color: platformColor }}>{icon}</span>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, color: platformColor,
                background: `${platformColor}12`, borderRadius: 4, padding: '1px 5px',
              }}>
                {icon} {platform}
              </span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                {state === 'procesando' && <Spinner color="#f59e0b" />}
                {state === 'listo' && <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700 }}>✓</span>}
                {state === 'error' && <span style={{ fontSize: 9, color: '#ef4444' }}>✕</span>}
              </span>
            </div>
            <div style={{
              fontSize: 10, color: '#334155', fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {displayTitle}
            </div>
          </div>
        </div>

        {/* Loading skeletons */}
        {state === 'procesando' && (
          <div style={{ padding: '0 10px 8px' }}>
            <Skeletons rows={2} />
          </div>
        )}

        {/* Error message */}
        {state === 'error' && (
          <div style={{
            fontSize: 9, color: '#dc2626', background: '#fef2f2',
            borderTop: '1px solid #fecaca', padding: '5px 10px', lineHeight: 1.5,
          }}>
            {error || 'Error al transcribir'}
          </div>
        )}

        {/* Transcript toggle */}
        {state === 'listo' && transcript && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              onMouseDown={e => e.stopPropagation()}
              style={{
                width: '100%', background: expanded ? '#f8fafc' : 'none',
                border: 'none', borderTop: '1px solid #f1f5f9',
                color: '#94a3b8', fontSize: 9, cursor: 'pointer',
                padding: '4px 10px', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 4,
                transition: 'background 0.1s',
              }}
            >
              <span>{expanded ? '▲' : '▼'}</span>
              <span>Transcripción</span>
              {language && (
                <span style={{
                  marginLeft: 'auto', fontSize: 8, color: '#b0bec5',
                  background: '#f1f5f9', borderRadius: 3, padding: '1px 4px',
                }}>
                  {language}
                </span>
              )}
            </button>
            {expanded && (
              <div
                style={{
                  fontSize: 10, color: '#475569', lineHeight: 1.6,
                  padding: '8px 10px', maxHeight: 180, overflowY: 'auto',
                  borderTop: '1px solid #f1f5f9',
                }}
                onMouseDown={e => e.stopPropagation()}
              >
                {transcript}
              </div>
            )}
          </>
        )}

        <Handle type="source" position={Position.Right} style={{
          background: platformColor, border: `2px solid ${platformColor}60`,
          width: 8, height: 8, borderRadius: '50%',
        }} />
      </div>
    </>
  )
}

// ── Full mode ──────────────────────────────────────────────────────────────────

function VideoTranscriptNode({ data, id, selected }) {
  const { deleteElements } = useReactFlow()
  const { url, platform, title, state, transcript, language, source, error, onLoadManual } = data
  const [expanded, setExpanded] = useState(false)
  const [manualText, setManualText] = useState('')

  const platformColor = PLATFORM_COLORS[platform] || '#64748b'
  const icon = PLATFORM_ICONS[platform] || '●'

  const truncatedUrl = url
    ? url.replace(/^https?:\/\//, '').substring(0, 34) + (url.length > 38 ? '…' : '')
    : ''

  // Render compact mode when inside a collection
  if (data.compact) {
    return (
      <CompactView
        data={data} id={id} selected={selected}
        platformColor={platformColor} icon={icon}
      />
    )
  }

  // Full mode
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div style={{
        background: '#ffffff',
        border: `1px solid ${platformColor}33`,
        borderRadius: 14,
        minWidth: 260,
        maxWidth: 300,
        boxShadow: `0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px ${platformColor}11`,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#0f172a',
        overflow: 'hidden',
      }}>

        {/* Thumbnail preview */}
        {data.thumbnail && (
          <div style={{ position: 'relative', width: '100%', height: 148, overflow: 'hidden', flexShrink: 0 }}>
            <img
              src={data.thumbnail}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* Platform badge overlay */}
            <span style={{
              position: 'absolute', bottom: 8, left: 8,
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
              borderRadius: 5, padding: '2px 8px',
              fontSize: 10, fontWeight: 700, color: '#fff',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {icon} {platform}
            </span>
            <a
              href={url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', bottom: 8, right: 8,
                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                borderRadius: 5, padding: '2px 8px',
                fontSize: 10, color: '#fff', textDecoration: 'none', fontWeight: 600,
              }}
            >
              ↗
            </a>
          </div>
        )}

        {/* Video section */}
        <div style={{ padding: '10px 14px 8px' }}>
          {!data.thumbnail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                background: `${platformColor}15`, border: `1px solid ${platformColor}30`,
                borderRadius: 6, padding: '2px 8px',
                fontSize: 10, fontWeight: 700, color: platformColor,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {icon} {platform}
              </span>
              <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 'auto' }}>VIDEO</span>
            </div>
          )}

          {title && (
            <div style={{
              fontSize: 11, color: '#334155', fontWeight: 500,
              lineHeight: 1.4, marginBottom: 6, wordBreak: 'break-word',
            }}>
              {title}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 10, color: '#94a3b8', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>
              {truncatedUrl}
            </span>
            {!data.thumbnail && (
              <a
                href={url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ fontSize: 10, color: platformColor, textDecoration: 'none', flexShrink: 0 }}
              >
                ↗ Abrir
              </a>
            )}
          </div>
        </div>

        {/* State bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 14px',
          background: state === 'listo' ? '#22c55e08' : state === 'error' ? '#ef444408' : '#f59e0b08',
          borderTop: `1px solid ${state === 'listo' ? '#22c55e20' : state === 'error' ? '#ef444420' : '#f59e0b20'}`,
          borderBottom: `1px solid ${state === 'listo' ? '#22c55e20' : state === 'error' ? '#ef444420' : '#f59e0b20'}`,
        }}>
          {state === 'procesando' && <Spinner color="#f59e0b" />}
          {state === 'listo' && <span style={{ fontSize: 9, color: '#22c55e' }}>✓</span>}
          {state === 'error' && <span style={{ fontSize: 9, color: '#ef4444' }}>✕</span>}
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: state === 'listo' ? '#22c55e' : state === 'error' ? '#ef4444' : '#f59e0b',
          }}>
            {state === 'procesando' ? 'Transcribiendo…' : state === 'listo' ? 'Transcripción lista' : 'Error'}
          </span>
          {state === 'listo' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {language && (
                <span style={{ fontSize: 9, color: '#94a3b8', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '1px 5px' }}>
                  {language}
                </span>
              )}
              {source && (
                <span style={{ fontSize: 9, color: '#94a3b8', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '1px 5px' }}>
                  {source}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Transcript content */}
        <div style={{ padding: '10px 14px 12px' }}>
          {state === 'procesando' && <Skeletons />}

          {state === 'listo' && transcript && (
            <>
              <div style={{
                fontSize: 11, color: '#475569', lineHeight: 1.65,
                maxHeight: expanded ? 'none' : 130,
                overflow: expanded ? 'visible' : 'hidden',
              }}>
                {transcript}
              </div>
              {transcript.length > 280 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  style={{
                    background: 'none', border: '1px solid #e2e8f0', borderRadius: 6,
                    color: '#94a3b8', fontSize: 10, cursor: 'pointer',
                    padding: '3px 10px', marginTop: 6, display: 'block', width: '100%',
                  }}
                >
                  {expanded ? '▲ Colapsar' : '▼ Ver completo'}
                </button>
              )}
            </>
          )}

          {state === 'error' && (
            <>
              <div style={{
                fontSize: 11, color: '#dc2626', background: '#fef2f2',
                border: '1px solid #fecaca', borderRadius: 8,
                padding: '8px 10px', lineHeight: 1.5, marginBottom: 10,
              }}>
                {error || 'No se pudo transcribir el video.'}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6 }}>
                Pegá la transcripción manualmente:
              </div>
              <textarea
                style={{
                  width: '100%', minHeight: 72,
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 8, color: '#0f172a', fontSize: 11,
                  fontFamily: 'system-ui', padding: '7px 9px',
                  resize: 'vertical', outline: 'none', marginBottom: 8,
                  boxSizing: 'border-box',
                }}
                placeholder="Pegá aquí el texto del video…"
                value={manualText}
                onChange={e => setManualText(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
              />
              <button
                style={{
                  width: '100%', padding: '7px 0',
                  background: manualText.trim() ? '#0f172a' : '#f1f5f9',
                  border: 'none', borderRadius: 8,
                  color: manualText.trim() ? '#fff' : '#94a3b8',
                  fontSize: 11, fontWeight: 600,
                  cursor: manualText.trim() ? 'pointer' : 'default',
                }}
                disabled={!manualText.trim()}
                onClick={() => {
                  if (manualText.trim() && onLoadManual) onLoadManual(id, manualText.trim())
                }}
              >
                Cargar transcripción
              </button>
            </>
          )}
        </div>

        <Handle type="source" position={Position.Right} style={{
          background: platformColor, border: `2px solid ${platformColor}60`,
          width: 10, height: 10, borderRadius: '50%',
        }} />
      </div>

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
    </>
  )
}

const MemoizedVideoTranscriptNode = memo(VideoTranscriptNode, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.data.url === nextProps.data.url &&
    prevProps.data.state === nextProps.data.state &&
    prevProps.data.transcript === nextProps.data.transcript &&
    prevProps.data.compact === nextProps.data.compact &&
    prevProps.data.thumbnail === nextProps.data.thumbnail
  )
})

MemoizedVideoTranscriptNode.displayName = 'VideoTranscriptNode'

export default MemoizedVideoTranscriptNode
