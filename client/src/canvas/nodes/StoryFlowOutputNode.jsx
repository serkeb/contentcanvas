import { useState } from 'react'
import { Handle, Position, NodeResizer, NodeToolbar, useReactFlow } from '@xyflow/react'

const ACCENT = '#8b5cf6'

// Role badge colors
const ROLE_COLORS = {
  hook: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  identification: { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' },
  problema: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  problem: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  tensión: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  tension: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  solución: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
  solution: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
  bridge: { bg: '#f0f9ff', text: '#075985', border: '#bae6fd' },
  transición: { bg: '#f0f9ff', text: '#075985', border: '#bae6fd' },
  transition: { bg: '#f0f9ff', text: '#075985', border: '#bae6fd' },
  proof: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  'prueba social': { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  objection: { bg: '#fff7ed', text: '#9a3412', border: '#fdba74' },
  objeción: { bg: '#fff7ed', text: '#9a3412', border: '#fdba74' },
  cta: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },
  teaser: { bg: '#faf5ff', text: '#7c3aed', border: '#ddd6fe' },
  education: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  educación: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  trust: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  confianza: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  follow_up: { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' },
  followup: { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' },
}

function getRoleStyle(roleRaw) {
  const key = (roleRaw || '').toLowerCase()
  for (const [k, v] of Object.entries(ROLE_COLORS)) {
    if (key.includes(k)) return v
  }
  return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }
}

function CopyBtn({ text, label = 'Copiar' }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? '#f0fdf4' : '#f8fafc',
        border: `1px solid ${copied ? '#bbf7d0' : '#e2e8f0'}`,
        borderRadius: 6,
        padding: '3px 8px',
        fontSize: 9,
        fontWeight: 600,
        cursor: 'pointer',
        color: copied ? '#16a34a' : '#64748b',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      {copied ? '✓ Copiado' : label}
    </button>
  )
}

function Chip({ children, color = '#64748b', bg = '#f8fafc', border = '#e2e8f0' }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        color,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 20,
        padding: '2px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

function Field({ label, value, highlight, muted }) {
  return (
    <div>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: '#94a3b8',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          display: 'block',
          marginBottom: 3,
        }}
      >
        {label}
      </span>
      <div
        style={{
          fontSize: highlight ? 12 : 11,
          fontWeight: highlight ? 600 : 400,
          color: muted ? '#64748b' : '#1e293b',
          background: highlight ? '#faf5ff' : 'transparent',
          border: highlight ? `1px solid ${ACCENT}20` : 'none',
          borderRadius: highlight ? 6 : 0,
          padding: highlight ? '6px 8px' : 0,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function StoryCard({ story }) {
  const [expanded, setExpanded] = useState(true)
  const roleStyle = getRoleStyle(story.story_role)

  function buildCopyText() {
    const lines = []
    lines.push(`── HISTORIA ${story.story_number}: ${story.story_role} ──`)
    if (story.goal) lines.push(`\n🎯 OBJETIVO:\n${story.goal}`)
    if (story.on_screen_text) lines.push(`\n📺 TEXTO EN PANTALLA:\n${story.on_screen_text}`)
    if (story.spoken_line) lines.push(`\n🎙 DIÁLOGO:\n${story.spoken_line}`)
    if (story.visual_direction) lines.push(`\n📸 VISUAL:\n${story.visual_direction}`)
    if (story.sticker_type && story.sticker_type !== 'none') {
      lines.push(`\n🎯 STICKER: ${story.sticker_type}${story.sticker_text ? ` → "${story.sticker_text}"` : ''}`)
    }
    if (story.cta) lines.push(`\n📣 CTA:\n${story.cta}`)
    if (story.reasoning_short) lines.push(`\n🧠 LÓGICA:\n${story.reasoning_short}`)
    if (story.design_note) lines.push(`\n🎨 DISEÑO:\n${story.design_note}`)
    return lines.join('\n')
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          cursor: 'pointer',
          background: '#fafbfc',
          borderBottom: expanded ? '1px solid #f1f5f9' : 'none',
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: ACCENT,
            color: '#fff',
            fontSize: 9,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {story.story_number}
        </span>

        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: 20,
            background: roleStyle.bg,
            color: roleStyle.text,
            border: `1px solid ${roleStyle.border}`,
            flexShrink: 0,
          }}
        >
          {story.story_role}
        </span>

        {story.format && (
          <span
            style={{
              fontSize: 9,
              color: '#94a3b8',
              background: '#f1f5f9',
              borderRadius: 5,
              padding: '2px 6px',
              flexShrink: 0,
            }}
          >
            {story.format}
          </span>
        )}

        <div style={{ flex: 1 }} />
        <CopyBtn text={buildCopyText()} label="📋" />
        <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {expanded && (
        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {story.goal && (
            <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', lineHeight: 1.4 }}>
              🎯 {story.goal}
            </div>
          )}

          {story.on_screen_text && (
            <Field label="📺 Texto en pantalla" value={story.on_screen_text} highlight />
          )}

          {story.spoken_line && (
            <Field label="🎙 Diálogo / Narración" value={story.spoken_line} />
          )}

          {story.visual_direction && (
            <Field label="📸 Dirección visual" value={story.visual_direction} muted />
          )}

          {story.sticker_type && story.sticker_type !== 'none' && (
            <div
              style={{
                background: '#faf5ff',
                border: '1px solid #e9d5ff',
                borderRadius: 7,
                padding: '6px 9px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#7c3aed',
                  textTransform: 'uppercase',
                }}
              >
                🎯 {story.sticker_type}
              </span>
              {story.sticker_text && (
                <span style={{ fontSize: 10, color: '#6b21a8' }}>
                  → "{story.sticker_text}"
                </span>
              )}
            </div>
          )}

          {story.cta && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 7,
                padding: '6px 9px',
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#15803d',
                  display: 'block',
                  marginBottom: 2,
                }}
              >
                📣 CTA
              </span>
              <span style={{ fontSize: 10, color: '#166534', lineHeight: 1.4 }}>
                {story.cta}
              </span>
            </div>
          )}

          {story.reasoning_short && (
            <div
              style={{
                fontSize: 10,
                color: '#64748b',
                lineHeight: 1.4,
                borderLeft: '2px solid #e2e8f0',
                paddingLeft: 7,
              }}
            >
              <strong style={{ color: '#475569' }}>🧠 Lógica:</strong> {story.reasoning_short}
            </div>
          )}

          {story.design_note && (
            <div
              style={{
                fontSize: 9,
                color: '#64748b',
                background: '#f8fafc',
                border: '1px dashed #e2e8f0',
                borderRadius: 6,
                padding: '5px 8px',
                lineHeight: 1.4,
              }}
            >
              🎨 {story.design_note}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StoryFlowOutputNode({ id, data, selected }) {
  const { deleteElements } = useReactFlow()

  const stories = data.stories || []
  const sequenceLogic = data.sequenceLogic || ''
  const objective = data.objective || ''
  const awareness = data.awareness || ''
  const tone = data.tone || ''
  const ctaType = data.ctaType || ''
  const outputStyle = data.outputStyle || ''
  const model = data.model || ''
  const includeStickers = data.includeStickers
  const includeSpokenLines = data.includeSpokenLines

  function buildAllText() {
    const lines = [
      `📱 STORY FLOW — ${stories.length} historia${stories.length !== 1 ? 's' : ''}`,
      objective ? `🎯 Objetivo: ${objective}` : '',
      awareness ? `🌡 Awareness: ${awareness}` : '',
      tone ? `🎭 Tono: ${tone}` : '',
      ctaType ? `📣 CTA principal: ${ctaType}` : '',
      outputStyle ? `🧠 Estilo: ${outputStyle}` : '',
      model ? `🤖 Modelo: ${model}` : '',
      ''
    ].filter(Boolean)

    stories.forEach(s => {
      lines.push(`── HISTORIA ${s.story_number}: ${s.story_role} ──`)
      if (s.goal) lines.push(`🎯 ${s.goal}`)
      if (s.on_screen_text) lines.push(`📺 ${s.on_screen_text}`)
      if (s.spoken_line) lines.push(`🎙 ${s.spoken_line}`)
      if (s.sticker_type && s.sticker_type !== 'none') {
        lines.push(`🏷 ${s.sticker_type}${s.sticker_text ? ` → "${s.sticker_text}"` : ''}`)
      }
      if (s.cta) lines.push(`📣 ${s.cta}`)
      if (s.reasoning_short) lines.push(`🧠 ${s.reasoning_short}`)
      lines.push('')
    })

    if (sequenceLogic) lines.push(`LÓGICA GENERAL: ${sequenceLogic}`)
    return lines.join('\n')
  }

  return (
    <>
      <NodeResizer
        minWidth={360}
        minHeight={300}
        isVisible={selected}
        lineStyle={{ border: `1px solid ${ACCENT}50` }}
        handleStyle={{ background: ACCENT, border: 'none', borderRadius: 3, width: 8, height: 8 }}
      />

      <NodeToolbar isVisible={selected} position="top" align="end">
        <button
          onClick={() => deleteElements({ nodes: [{ id }] })}
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 7,
            color: '#dc2626',
            fontSize: 10,
            fontWeight: 600,
            cursor: 'pointer',
            padding: '4px 10px',
            fontFamily: 'system-ui',
          }}
        >
          ✕ Eliminar
        </button>
      </NodeToolbar>

      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#f8fafc',
          border: `1.5px solid ${selected ? ACCENT + '60' : '#e2e8f0'}`,
          borderRadius: 14,
          fontFamily: 'system-ui',
          overflow: 'hidden',
          boxShadow: selected
            ? `0 0 0 3px ${ACCENT}12, 0 6px 20px rgba(139,92,246,0.10)`
            : '0 2px 8px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            height: 3,
            background: `linear-gradient(90deg, ${ACCENT}, #a78bfa, #c4b5fd)`,
            flexShrink: 0,
          }}
        />

        <div
          style={{
            padding: '10px 12px 8px',
            flexShrink: 0,
            background: '#fff',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 800, color: ACCENT }}>
            📱 Story Flow
          </span>

          <span
            style={{
              fontSize: 9,
              background: '#f5f3ff',
              color: '#7c3aed',
              border: '1px solid #ddd6fe',
              borderRadius: 20,
              padding: '2px 8px',
              fontWeight: 700,
            }}
          >
            {stories.length} hist.
          </span>

          <div style={{ flex: 1 }} />
          <CopyBtn text={buildAllText()} label="📋 Copiar todo" />
        </div>

        <div
          style={{
            padding: '8px 12px',
            background: '#fff',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          {objective && <Chip color="#7c3aed" bg="#f5f3ff" border="#ddd6fe">🎯 {objective}</Chip>}
          {awareness && <Chip color="#0369a1" bg="#f0f9ff" border="#bae6fd">🌡 {awareness}</Chip>}
          {tone && <Chip color="#92400e" bg="#fffbeb" border="#fde68a">🎭 {tone}</Chip>}
          {ctaType && <Chip color="#15803d" bg="#f0fdf4" border="#bbf7d0">📣 {ctaType}</Chip>}
          {outputStyle && <Chip color="#334155" bg="#f8fafc" border="#e2e8f0">🧠 {outputStyle}</Chip>}
          {model && <Chip color="#6b21a8" bg="#faf5ff" border="#e9d5ff">🤖 {model}</Chip>}
          {includeSpokenLines === false && <Chip color="#475569" bg="#f8fafc" border="#e2e8f0">🔇 Sin diálogo</Chip>}
          {includeStickers === false && <Chip color="#475569" bg="#f8fafc" border="#e2e8f0">🏷 Sin stickers</Chip>}
        </div>

        {sequenceLogic && (
          <div
            style={{
              padding: '8px 12px',
              flexShrink: 0,
              background: '#faf5ff',
              borderBottom: '1px solid #ede9fe',
              fontSize: 10,
              color: '#6b21a8',
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontWeight: 700, marginRight: 6 }}>🧠 Lógica:</span>
            {sequenceLogic}
          </div>
        )}

        <div
          className="nodrag nopan"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {stories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: 12 }}>
              Sin stories generadas
            </div>
          ) : (
            stories.map((story, i) => (
              <StoryCard key={i} story={story} />
            ))
          )}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        style={{ background: ACCENT, border: `2px solid ${ACCENT}60`, width: 10, height: 10 }}
      />

      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{ background: `${ACCENT}90`, border: `2px solid ${ACCENT}50`, width: 10, height: 10 }}
      />
    </>
  )
}