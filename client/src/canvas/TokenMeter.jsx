import { useState, useEffect, useRef } from 'react'
import { getTodayUsage, getRecentUsage, clearAllUsage } from './utils/tokenUsage'

const ACCENT = '#8b5cf6'

function fmt(n) {
  if (n == null || isNaN(n)) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k'
  return String(Math.round(n))
}

function fmtCost(usd) {
  if (!usd) return '$0.00'
  if (usd < 0.001) return '<$0.001'
  if (usd < 0.01)  return '$' + usd.toFixed(4)
  return '$' + usd.toFixed(3)
}

function fmtSecs(s) {
  if (!s) return '0s'
  if (s < 60) return Math.round(s) + 's'
  return Math.floor(s / 60) + 'm' + Math.round(s % 60) + 's'
}

function fmtDate(dateStr) {
  // dateStr = 'YYYY-MM-DD'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

function ModelBadge({ model }) {
  const short = (model || '').replace('gpt-', '').replace('-2025', '').replace('-preview', '')
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 10,
      background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe',
    }}>{short}</span>
  )
}

// ── History modal ─────────────────────────────────────────────────────────────
function HistoryModal({ onClose }) {
  const [days] = useState(() => getRecentUsage(7))

  function handleClear() {
    if (!window.confirm('¿Borrar todo el historial de uso? Esta acción no se puede deshacer.')) return
    clearAllUsage()
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(15,23,42,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 16,
        border: '1px solid #e2e8f0',
        boxShadow: '0 20px 60px rgba(0,0,0,0.16)',
        width: 460, maxWidth: '94vw', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 18px 12px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
              🪙 Uso de tokens — últimos 7 días
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
              Los precios son estimados según la tabla de OpenAI (2025)
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 4 }}
          >✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px' }}>
          {days.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 12 }}>
              Sin registros todavía. Generá algo con cualquier nodo IA.
            </div>
          ) : days.map(day => (
            <DayRow key={day.date} day={day} />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px', borderTop: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button
            onClick={handleClear}
            style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '6px 14px',
              fontSize: 11, fontWeight: 600, color: '#dc2626', cursor: 'pointer',
            }}
          >
            🗑 Limpiar historial
          </button>
        </div>
      </div>
    </div>
  )
}

function DayRow({ day }) {
  const [expanded, setExpanded] = useState(false)

  // Group calls by model, split LLM vs Whisper
  const byModel = {}
  day.calls.forEach(c => {
    if (!byModel[c.model]) byModel[c.model] = { prompt: 0, completion: 0, audio_seconds: 0, cost: 0, count: 0, type: c.type || 'llm' }
    if (c.type === 'whisper') {
      byModel[c.model].audio_seconds += c.audio_seconds || 0
    } else {
      byModel[c.model].prompt     += c.prompt_tokens     || 0
      byModel[c.model].completion += c.completion_tokens || 0
    }
    byModel[c.model].cost  += c.cost_usd || 0
    byModel[c.model].count += 1
  })

  const isToday = day.date === new Date().toISOString().slice(0, 10)
  const audioSecs = day.totals?.audio_seconds || 0

  return (
    <div style={{
      border: `1px solid ${isToday ? ACCENT + '30' : '#f1f5f9'}`,
      borderRadius: 10,
      marginBottom: 8,
      overflow: 'hidden',
      background: isToday ? '#faf5ff' : '#fff',
    }}>
      {/* Day header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: isToday ? ACCENT : '#334155', minWidth: 34 }}>
          {isToday ? 'Hoy' : fmtDate(day.date)}
        </span>
        <span style={{ fontSize: 10, color: '#64748b' }}>
          {day.calls.length} llamada{day.calls.length !== 1 ? 's' : ''}
        </span>
        {(day.totals?.total_tokens || 0) > 0 && (
          <span style={{ fontSize: 10, color: '#94a3b8' }}>
            {fmt(day.totals.total_tokens)} tok
          </span>
        )}
        {audioSecs > 0 && (
          <span style={{ fontSize: 10, color: '#94a3b8' }}>
            🎙 {fmtSecs(audioSecs)}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: 11, fontWeight: 800,
          color: isToday ? ACCENT : '#0f172a',
        }}>
          {fmtCost(day.totals.cost_usd)}
        </span>
        <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {expanded && (
        <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Model breakdown */}
          {Object.entries(byModel).map(([model, stats]) => (
            <div key={model} style={{
              background: '#f8fafc', borderRadius: 7, padding: '7px 10px',
              display: 'flex', alignItems: 'center', gap: 8,
              border: '1px solid #f1f5f9',
            }}>
              <ModelBadge model={model} />
              {stats.type === 'whisper'
                ? <span style={{ fontSize: 10, color: '#64748b' }}>
                    {stats.count} video{stats.count !== 1 ? 's' : ''} · 🎙 {fmtSecs(stats.audio_seconds)}
                  </span>
                : <span style={{ fontSize: 10, color: '#64748b' }}>
                    {stats.count} call{stats.count !== 1 ? 's' : ''} · {fmt(stats.prompt)}↑ {fmt(stats.completion)}↓
                  </span>
              }
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>
                {fmtCost(stats.cost)}
              </span>
            </div>
          ))}

          {/* Individual calls */}
          <div style={{
            fontSize: 9, color: '#94a3b8', marginTop: 2, padding: '4px 0',
            borderTop: '1px dashed #e2e8f0',
          }}>
            {day.calls.slice(-10).map((c, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '2px 0', borderBottom: '1px solid #f8fafc',
              }}>
                <span style={{ color: '#cbd5e1', minWidth: 34 }}>
                  {c.ts ? c.ts.slice(11, 16) : '—'}
                </span>
                <ModelBadge model={c.model} />
                {c.type === 'whisper'
                  ? <span>🎙 {fmtSecs(c.audio_seconds)}</span>
                  : <span>{fmt(c.prompt_tokens)}↑ {fmt(c.completion_tokens)}↓</span>
                }
                <div style={{ flex: 1 }} />
                <span style={{ fontWeight: 600, color: '#64748b' }}>{fmtCost(c.cost_usd)}</span>
              </div>
            ))}
            {day.calls.length > 10 && (
              <div style={{ paddingTop: 3, color: '#cbd5e1' }}>
                + {day.calls.length - 10} más…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main widget (always visible, bottom-right area) ───────────────────────────
export default function TokenMeter() {
  const [today, setToday]       = useState(() => getTodayUsage())
  const [showModal, setShowModal] = useState(false)
  const [flash, setFlash]       = useState(false)
  const prevCalls               = useRef(today?.calls?.length ?? 0)

  // Poll every 5s for new usage (generated from any node)
  useEffect(() => {
    const id = setInterval(() => {
      const fresh = getTodayUsage()
      setToday(fresh)

      // Flash animation when a new call lands
      const newCount = fresh?.calls?.length ?? 0
      if (newCount > prevCalls.current) {
        setFlash(true)
        setTimeout(() => setFlash(false), 800)
      }
      prevCalls.current = newCount
    }, 3000)
    return () => clearInterval(id)
  }, [])

  const cost       = today?.totals?.cost_usd     ?? 0
  const tokens     = today?.totals?.total_tokens  ?? 0
  const audioSecs  = today?.totals?.audio_seconds ?? 0
  const calls      = today?.calls?.length         ?? 0

  // Subtitle: prefer tokens if present, else audio duration
  const subtitle = calls > 0
    ? tokens > 0
      ? `${fmt(tokens)} tok${audioSecs > 0 ? ` · 🎙${fmtSecs(audioSecs)}` : ''} · ${calls} calls`
      : audioSecs > 0
        ? `🎙 ${fmtSecs(audioSecs)} · ${calls} vid${calls !== 1 ? 's' : ''}`
        : `${calls} call${calls !== 1 ? 's' : ''}`
    : null

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        title="Ver uso de IA de hoy"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: flash ? `${ACCENT}18` : '#fff',
          border: `1px solid ${flash ? ACCENT + '50' : '#e2e8f0'}`,
          borderRadius: 10, padding: '7px 12px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          fontFamily: 'system-ui',
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        <span style={{ fontSize: 12, lineHeight: 1 }}>🪙</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: cost > 0 ? ACCENT : '#94a3b8',
            lineHeight: 1.1,
          }}>
            {fmtCost(cost)}
          </span>
          {subtitle && (
            <span style={{ fontSize: 8, color: '#94a3b8', lineHeight: 1.1 }}>
              {subtitle}
            </span>
          )}
        </div>
      </button>

      {showModal && <HistoryModal onClose={() => setShowModal(false)} />}
    </>
  )
}
