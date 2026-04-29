import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { CircleDot, Sparkles, Pen } from 'lucide-react'

const VARIANT_CONFIG = {
  analysis: { color: '#8b5cf6', label: 'ANÁLISIS', icon: CircleDot, hasSourceHandle: true },
  ideas:    { color: '#f59e0b', label: 'IDEAS',    icon: Sparkles, hasSourceHandle: true },
  script:   { color: '#06b6d4', label: 'GUIÓN',   icon: Pen, hasSourceHandle: false },
}

function AnalysisContent({ content, color }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = content && content.length > 250

  return (
    <>
      <div style={{
        fontSize: 11, color: '#475569', lineHeight: 1.65,
        maxHeight: expanded ? 'none' : 160,
        overflow: expanded ? 'visible' : 'hidden',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {content}
      </div>
      {isLong && (
        <button style={{
          background: 'none', border: '1px solid #e2e8f0', borderRadius: 6,
          color: '#94a3b8', fontSize: 10, cursor: 'pointer',
          padding: '3px 10px', marginTop: 6, display: 'block', width: '100%',
        }} onClick={() => setExpanded(!expanded)}>
          {expanded ? '▲ Colapsar' : '▼ Ver completo'}
        </button>
      )}
    </>
  )
}

function IdeasContent({ ideas, color }) {
  return (
    <div>
      {(ideas || []).map((idea, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '5px 0',
          borderBottom: i < (ideas.length - 1) ? '1px solid #f1f5f9' : 'none',
        }}>
          <span style={{
            fontSize: 9, fontWeight: 700, color: color,
            background: `${color}15`, borderRadius: 4,
            padding: '1px 5px', flexShrink: 0, marginTop: 1,
            minWidth: 18, textAlign: 'center',
          }}>
            {i + 1}
          </span>
          <span style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>{idea}</span>
        </div>
      ))}
    </div>
  )
}

function parseScript(script) {
  if (!script) return null
  const parts = []
  const sections = script.split(/\n\n(?=HOOK|DESARROLLO|CTA)/)
  for (const section of sections) {
    const match = section.match(/^(HOOK|DESARROLLO|CTA)\n([\s\S]*)/)
    if (match) {
      parts.push({ label: match[1], text: match[2].trim() })
    } else if (section.trim()) {
      parts.push({ label: '', text: section.trim() })
    }
  }
  return parts.length > 0 ? parts : null
}

function ScriptContent({ script, color }) {
  const sections = parseScript(script)
  if (!sections) {
    return <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{script}</div>
  }
  return (
    <div>
      {sections.map(({ label, text }, i) => (
        <div key={i} style={{ marginBottom: i < sections.length - 1 ? 10 : 0 }}>
          {label && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: color,
              letterSpacing: '0.1em', marginBottom: 4, display: 'block',
            }}>
              {label}
            </span>
          )}
          <div style={{
            fontSize: 11, color: '#475569', lineHeight: 1.6,
            background: `${color}08`, borderRadius: 6,
            padding: '6px 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {text}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function InsightNode({ data }) {
  const { variant, analysis, ideas, script } = data
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.analysis
  const { color, label, icon, hasSourceHandle } = config

  return (
    <div style={{
      background: '#ffffff',
      border: `1px solid ${color}30`,
      borderRadius: 14,
      minWidth: 260,
      maxWidth: 300,
      boxShadow: `0 2px 12px rgba(0,0,0,0.07), 0 0 0 1px ${color}10`,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        borderBottom: `1px solid ${color}18`,
        background: `${color}06`,
      }}>
        <span style={{
          background: `${color}15`, border: `1px solid ${color}30`,
          borderRadius: 6, padding: '2px 8px',
          fontSize: 10, fontWeight: 700, color: color,
          letterSpacing: '0.05em',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <icon size={12} strokeWidth={2} /> {label}
        </span>
        <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 'auto' }}>GPT-4o</span>
      </div>

      {/* Content */}
      <div style={{ padding: '10px 14px 12px' }}>
        {variant === 'analysis' && <AnalysisContent content={analysis} color={color} />}
        {variant === 'ideas'    && <IdeasContent ideas={ideas} color={color} />}
        {variant === 'script'   && <ScriptContent script={script} color={color} />}
      </div>

      <Handle type="target" position={Position.Left} style={{
        background: color, border: `2px solid ${color}60`,
        width: 10, height: 10, borderRadius: '50%',
      }} />
      {hasSourceHandle && (
        <Handle type="source" position={Position.Right} style={{
          background: color, border: `2px solid ${color}60`,
          width: 10, height: 10, borderRadius: '50%',
        }} />
      )}
    </div>
  )
}
