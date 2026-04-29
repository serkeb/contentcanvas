import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Check, X, Loader2 } from 'lucide-react'

const STATE_COLORS = {
  procesando: '#f59e0b',
  listo: '#22c55e',
  error: '#ef4444',
}

const STATE_LABELS = {
  procesando: 'Procesando…',
  listo: 'Listo',
  error: 'Error',
}

const styles = {
  node: (color) => ({
    background: 'linear-gradient(135deg, rgba(10,10,20,0.98) 0%, rgba(15,15,30,0.98) 100%)',
    border: `1px solid ${color}59`,
    borderRadius: 14,
    padding: '14px 16px',
    minWidth: 280,
    maxWidth: 340,
    boxShadow: `0 0 20px ${color}18, 0 4px 24px rgba(0,0,0,0.6)`,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#e2e8f0',
  }),
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  badge: (color) => ({
    background: `${color}2e`,
    border: `1px solid ${color}4d`,
    borderRadius: 6,
    padding: '2px 8px',
    fontSize: 10,
    fontWeight: 700,
    color: color,
    letterSpacing: '0.05em',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  }),
  handle: (color) => ({
    background: color,
    border: `2px solid ${color}80`,
    width: 10,
    height: 10,
    borderRadius: '50%',
  }),
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.05)',
    margin: '8px 0',
  },
  skeleton: {
    height: 8,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: 4,
    marginBottom: 6,
  },
  transcriptBox: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 1.6,
    maxHeight: 140,
    overflowY: 'auto',
    paddingRight: 4,
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255,255,255,0.1) transparent',
  },
  expandBtn: {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    color: '#64748b',
    fontSize: 10,
    cursor: 'pointer',
    padding: '3px 10px',
    marginTop: 6,
    display: 'block',
    width: '100%',
    textAlign: 'center',
  },
  errorMsg: {
    fontSize: 11,
    color: '#fca5a5',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 8,
    padding: '8px 10px',
    marginBottom: 10,
    lineHeight: 1.5,
  },
  textarea: {
    width: '100%',
    minHeight: 80,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 11,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '8px',
    resize: 'vertical',
    outline: 'none',
    marginBottom: 8,
    boxSizing: 'border-box',
  },
  analyzeBtn: {
    width: '100%',
    padding: '7px 0',
    background: 'rgba(139,92,246,0.15)',
    border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: 8,
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  langBadge: {
    fontSize: 9,
    color: '#64748b',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 4,
    padding: '1px 6px',
    marginLeft: 'auto',
  },
  backendWarning: {
    fontSize: 10,
    color: '#78716c',
    lineHeight: 1.5,
    marginTop: 8,
    padding: '6px 8px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.05)',
  },
}

function Spinner() {
  return <Loader2 size={10} strokeWidth={2} className="spin-icon" />
  )
}

function Skeletons() {
  return (
    <div style={{ marginTop: 4 }}>
      {[100, 85, 92, 70, 88].map((w, i) => (
        <div key={i} style={{ ...styles.skeleton, width: `${w}%` }} />
      ))}
    </div>
  )
}

export default function TranscriptNode({ data, id }) {
  const { state, transcript, language, source, error, onAnalyzeManual } = data
  const [expanded, setExpanded] = useState(false)
  const [manualText, setManualText] = useState('')

  const color = STATE_COLORS[state] || '#64748b'

  const handleAnalyze = () => {
    if (manualText.trim() && onAnalyzeManual) {
      onAnalyzeManual(id, manualText.trim())
    }
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin-icon { animation: spin 0.7s linear infinite; }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={styles.node(color)}>
        <div style={styles.header}>
          <span style={styles.badge(color)}>
            {state === 'procesando' && <Spinner />}
            {state === 'listo' && <Check size={10} strokeWidth={2.5} />}
            {state === 'error' && <X size={10} strokeWidth={2.5} />}
            &nbsp;{STATE_LABELS[state] || state}
          </span>
          <span style={{ fontSize: 9, color: '#334155', marginLeft: 'auto' }}>TRANSCRIPCIÓN</span>
        </div>

        <div style={styles.divider} />

        {state === 'procesando' && (
          <>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>
              Descargando audio y transcribiendo con Whisper…
            </div>
            <Skeletons />
          </>
        )}

        {state === 'listo' && transcript && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              {language && (
                <span style={styles.langBadge}>🌐 {language}</span>
              )}
              {source && (
                <span style={styles.langBadge}>{source}</span>
              )}
            </div>
            <div style={{
              ...styles.transcriptBox,
              maxHeight: expanded ? 'none' : 140,
            }}>
              {transcript}
            </div>
            {transcript.length > 300 && (
              <button
                style={styles.expandBtn}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? '▲ Colapsar' : '▼ Ver completo'}
              </button>
            )}
          </>
        )}

        {state === 'error' && (
          <>
            <div style={styles.errorMsg}>
              {error || 'No se pudo transcribir el video.'}
            </div>
            <div style={styles.backendWarning}>
              ⚠️ Si el backend no responde, corré: <code style={{ color: '#a78bfa' }}>python3 server.py</code> en una terminal.
            </div>
            <div style={styles.divider} />
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>
              Pegá la transcripción manualmente:
            </div>
            <textarea
              style={styles.textarea}
              placeholder="Pegá aquí el texto del video…"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <button
              style={styles.analyzeBtn}
              onClick={handleAnalyze}
              disabled={!manualText.trim()}
            >
              Analizar con GPT-4o →
            </button>
          </>
        )}

        <Handle
          type="target"
          position={Position.Left}
          style={styles.handle(color)}
        />
        <Handle
          type="source"
          position={Position.Right}
          style={styles.handle(color)}
        />
      </div>
    </>
  )
}
