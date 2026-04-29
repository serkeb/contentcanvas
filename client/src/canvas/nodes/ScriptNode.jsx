import { useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position, NodeToolbar, useReactFlow } from '@xyflow/react'
import { runLLM, generateScriptWithKnowledge } from '../utils/api'
import { useConnectedSources } from '../utils/useConnectedSources'
import { groupedModels, getDefaultModel, MODELS } from '../utils/models'
import { loadApiKeys } from '../utils/storage'
import { SiTiktok, SiInstagram, SiYoutube, SiLinkedin } from './SocialIcons'
import PromptEditor from '../components/PromptEditor'
import { Settings } from 'lucide-react'

const ACCENT    = '#6366f1'
const NODE_W    = 260
const NODE_H    = 140
const PANEL_W   = 270

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',    icon: SiTiktok },
  { id: 'instagram', label: 'Instagram', icon: SiInstagram },
  { id: 'youtube',   label: 'YouTube',   icon: SiYoutube },
  { id: 'linkedin',  label: 'LinkedIn',  icon: SiLinkedin },
]
const FORMATS = [
  { id: 'reel',     label: 'Reel / Short' },
  { id: 'carrusel', label: 'Carrusel' },
  { id: 'post',     label: 'Post' },
  { id: 'hilo',     label: 'Hilo' },
  { id: 'guion',    label: 'Guión largo' },
]
const DURATIONS = ['15s', '30s', '60s', '90s', '3min']
const GOALS = [
  { id: 'entretener', label: 'Entretener' },
  { id: 'educar',     label: 'Educar' },
  { id: 'vender',     label: 'Vender' },
  { id: 'viralizar',  label: 'Viralizar' },
  { id: 'posicionar', label: 'Posicionar' },
]
const VIDEO_TYPES = [
  { id: '',          label: 'General (sin tipo específico)' },
  { id: 'autoridad', label: '🎯 Autoridad (posicionamiento)' },
  { id: 'conversion', label: '💰 Conversión de ventas' },
  { id: 'engagement', label: '🔥 Engagement (viralidad)' },
]

function ModelSel({ value, onChange }) {
  const keys = loadApiKeys()
  const available = MODELS.filter(m => {
    if (m.provider === 'openai')    return !!keys.openai
    if (m.provider === 'anthropic') return !!keys.anthropic
    if (m.provider === 'gemini')    return !!keys.gemini
    return false
  })
  const groups = groupedModels(available)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Modelo</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onMouseDown={e => e.stopPropagation()}
        className="nodrag nopan"
        style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7,
          color: '#334155', fontSize: 11, fontWeight: 500, fontFamily: 'system-ui',
          padding: '5px 8px', outline: 'none', cursor: 'pointer', width: '100%',
        }}
      >
        {groups.map(({ group, items }) => (
          <optgroup key={group} label={group}>
            {items.map(m => (
              <option key={m.id} value={m.id}>
                {m.label}{m.recommended ? ' ★' : ''}
              </option>
            ))}
          </optgroup>
        ))}
        {available.length === 0 && <option value="">Sin modelos — configurá una API key</option>}
      </select>
    </div>
  )
}

function Sel({ value, onChange, options, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {label && <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onMouseDown={e => e.stopPropagation()}
        className="nodrag nopan"
        style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7,
          color: '#334155', fontSize: 11, fontWeight: 500, fontFamily: 'system-ui',
          padding: '5px 8px', outline: 'none', cursor: 'pointer', width: '100%',
        }}
      >
        {options.map(o => (
          <option key={o.id || o} value={o.id || o}>{o.label || o}</option>
        ))}
      </select>
    </div>
  )
}

export default function ScriptNode({ id, data, selected }) {
  const { setNodes, setEdges, getNodes, getEdges, deleteElements } = useReactFlow()
  const nodeRef   = useRef(null)
  const panelRef  = useRef(null)
  const [showPanel, setShowPanel] = useState(false)
  const [running,   setRunning]   = useState(false)

  const [platform,     setPlatform]  = useState(data.platform  || 'tiktok')
  const [format,       setFormat]    = useState(data.format    || 'reel')
  const [duration,     setDuration]  = useState(data.duration  || '30s')
  const [goal,         setGoal]      = useState(data.goal      || 'entretener')
  const [topic,        setTopic]     = useState(data.topic     || '')
  const [videoType,    setVideoType] = useState(data.videoType || '')
  const [model,        setModel]     = useState(data.model     || getDefaultModel(loadApiKeys()))
  const [customPrompt, setCustomPrompt] = useState(data.customPrompt || '')
  const [showPromptEditor, setShowPromptEditor] = useState(false)

  const state = data.state || 'idle'
  const error = data.error || null

  const { transcripts, brandVoice, personName } = useConnectedSources(id)
  const connectedCount = transcripts.length + (brandVoice ? 1 : 0)

  // Close panel on outside click
  useEffect(() => {
    if (!showPanel) return
    const handler = e => {
      if (
        nodeRef.current && !nodeRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) setShowPanel(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPanel])

  const persist = useCallback((updates) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n))
  }, [id, setNodes])

  function handleSaveCustomPrompt(prompt) {
    setCustomPrompt(prompt)
    persist({ customPrompt: prompt })
  }

  function getMasterPrompt() {
    const platformLabel = PLATFORMS.find(p => p.id === platform)?.label || platform
    const formatLabel = FORMATS.find(f => f.id === format)?.label || format
    const goalLabel = GOALS.find(g => g.id === goal)?.label || goal

    return `Generá un guión de ${formatLabel} de ${duration} para ${platformLabel} con el objetivo de ${goalLabel}.

${topic ? `Tema: ${topic}` : 'El tema se definirá según el contexto proporcionado.'}

${videoType ? `Tipo de video: ${VIDEO_TYPES.find(t => t.id === videoType)?.label || videoType}` : ''}

El guión debe:
- Adaptarse al formato y plataforma seleccionados
- Seguir las mejores prácticas de copywriting para ${platformLabel}
- Incluir hooks, desarrollo y CTA apropiados
- Mantener coherencia con el brand voice si está conectado
- Usar el contexto de las transcripciones conectadas si están disponibles`
  }

  async function handleGenerate() {
    setRunning(true)
    persist({ state: 'running', error: null })
    try {
      // Usar el nuevo endpoint con conocimiento de PDFs
      const config = {
        platform,
        format,
        duration,
        goal,
        topic,
        videoType,
        model,
        customPrompt: customPrompt || undefined,
        transcripts: transcripts.length > 0 ? transcripts : undefined,
        brandVoice: brandVoice || undefined,
        personName: personName || undefined,
      }

      const res = await generateScriptWithKnowledge(config)

      const thisNode = getNodes().find(n => n.id === id)
      const nodeH = thisNode?.measured?.height || 80
      const posX  = (thisNode?.position?.x || 0) + NODE_W + 60
      const posY  = thisNode?.position?.y || 0

      const outputId = `script-out-${Date.now()}`

      setNodes(nds => [...nds, {
        id:       outputId,
        type:     'scriptOutputNode',
        position: { x: posX, y: posY },
        style:    { width: 380, height: Math.max(320, nodeH * 3) },
        data:     { script: res.result, topic, platform, format, duration, goal, videoType },
      }])

      setEdges(eds => [...eds, {
        id:     `e-${id}-${outputId}`,
        source: id, target: outputId,
        sourceHandle: 'out',
        type:   'deletable',
        style:  { stroke: `${ACCENT}70`, strokeWidth: 1.5, strokeDasharray: '4 3' },
        markerEnd: { type: 'arrowclosed', color: `${ACCENT}70` },
      }])

      persist({ state: 'done', platform, format, duration, goal, topic, videoType })
    } catch (err) {
      persist({ state: 'error', error: err.message })
    } finally {
      setRunning(false)
    }
  }

  const platformDef  = PLATFORMS.find(p => p.id === platform) || PLATFORMS[0]
  const formatDef    = FORMATS.find(f => f.id === format) || FORMATS[0]
  const videoTypeDef = VIDEO_TYPES.find(t => t.id === videoType) || VIDEO_TYPES[0]

  // state visual
  const stateColor = state === 'done' ? '#16a34a' : state === 'error' ? '#dc2626' : state === 'running' ? ACCENT : '#94a3b8'
  const stateBg    = state === 'done' ? '#f0fdf4' : state === 'error' ? '#fef2f2' : state === 'running' ? `${ACCENT}10` : '#f8fafc'
  const stateBorder = state === 'done' ? '#bbf7d0' : state === 'error' ? '#fecaca' : state === 'running' ? `${ACCENT}30` : '#e2e8f0'
  const stateLabel = state === 'done' ? '✓ Listo' : state === 'error' ? '✕ Error' : state === 'running' ? '⟳ Generando' : 'idle'

  return (
    <>
      <style>{`@keyframes spin-s { to { transform: rotate(360deg) } }`}</style>

      <NodeToolbar isVisible={selected} position="top" align="end">
        <button
          onClick={() => deleteElements({ nodes: [{ id }] })}
          style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7,
            color: '#dc2626', fontSize: 10, fontWeight: 600, cursor: 'pointer',
            padding: '4px 10px', fontFamily: 'system-ui',
          }}
        >✕ Eliminar</button>
      </NodeToolbar>

      {/* ── Config panel (opens to the right) ── */}
      {showPanel && (
        <div
          ref={panelRef}
          className="nodrag nopan"
          style={{
            position: 'absolute',
            left: NODE_W + 14,
            top: 0,
            width: PANEL_W,
            background: '#fff',
            border: `1.5px solid ${ACCENT}30`,
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(99,102,241,0.16)',
            padding: '14px',
            zIndex: 9999,
            fontFamily: 'system-ui',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: ACCENT, letterSpacing: '0.05em' }}>CONFIGURACIÓN</span>
            <button
              onClick={() => setShowPanel(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 14, cursor: 'pointer', lineHeight: 1, padding: 0 }}
            >✕</button>
          </div>

          <ModelSel value={model} onChange={v => { setModel(v); persist({ model: v }) }} />

          <button
            onClick={() => setShowPromptEditor(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: showPromptEditor || customPrompt ? `${ACCENT}15` : '#f8fafc',
              border: `1px solid ${showPromptEditor || customPrompt ? ACCENT : '#e2e8f0'}`,
              borderRadius: 7, padding: '6px 10px',
              cursor: 'pointer', fontSize: 10, fontWeight: 600,
              color: showPromptEditor || customPrompt ? ACCENT : '#64748b',
              transition: 'all 0.15s', width: '100%',
            }}
            title={customPrompt ? 'Prompt personalizado configurado' : 'Personalizar prompt del sistema'}
          >
            <Settings size={11} strokeWidth={2} />
            <span>{customPrompt ? '✓ Prompt Personalizado' : 'Prompt Default'}</span>
          </button>

          {showPromptEditor && (
            <PromptEditor
              customPrompt={customPrompt}
              onSave={handleSaveCustomPrompt}
              masterPrompt={getMasterPrompt()}
              accentColor={ACCENT}
            />
          )}

          <Sel label="Plataforma" value={platform} onChange={v => { setPlatform(v); persist({ platform: v }) }}
            options={PLATFORMS.map(p => ({ id: p.id, label: p.label }))} />
          <Sel label="Formato" value={format} onChange={v => { setFormat(v); persist({ format: v }) }} options={FORMATS} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Sel label="Duración" value={duration} onChange={v => { setDuration(v); persist({ duration: v }) }}
              options={DURATIONS.map(d => ({ id: d, label: d }))} />
            <Sel label="Objetivo" value={goal} onChange={v => { setGoal(v); persist({ goal: v }) }} options={GOALS} />
          </div>

          <Sel label="Tipo de video (conocimiento)" value={videoType} onChange={v => { setVideoType(v); persist({ videoType: v }) }}
            options={VIDEO_TYPES} />

          {/* Topic */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Tema</span>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') handleGenerate() }}
              onMouseDown={e => e.stopPropagation()}
              onBlur={() => persist({ topic })}
              placeholder="Tema o ángulo del contenido…"
              style={{
                width: '100%', fontSize: 11, color: '#0f172a', fontFamily: 'system-ui',
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7,
                padding: '6px 9px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* BrandVoice indicator */}
          {brandVoice && (
            <div style={{ fontSize: 10, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, padding: '5px 8px' }}>
              🎯 <strong>{personName || 'BrandVoice'}</strong> conectado — el guión usará su voz
            </div>
          )}

          {/* Sources indicator */}
          {connectedCount > 0 && (
            <div style={{ fontSize: 10, color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '5px 8px' }}>
              📎 {connectedCount} fuente{connectedCount > 1 ? 's' : ''} conectada{connectedCount > 1 ? 's' : ''}
            </div>
          )}

          {/* Error */}
          {state === 'error' && error && (
            <div style={{ fontSize: 10, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '6px 8px', lineHeight: 1.4 }}>
              {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={running}
            style={{
              width: '100%', padding: '9px', borderRadius: 8, border: 'none',
              background: running ? '#f1f5f9' : ACCENT,
              color: running ? '#94a3b8' : '#fff',
              fontSize: 11, fontWeight: 700, cursor: running ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              marginTop: 2,
            }}
          >
            {running
              ? <><span style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${ACCENT}40`, borderTopColor: ACCENT, animation: 'spin-s 0.7s linear infinite', display: 'inline-block' }} /> Generando…</>
              : state === 'done' ? '🔄 Generar otro guión' : '✦ Generar guión'
            }
          </button>
        </div>
      )}

      {/* ── Compact card ── */}
      <div
        ref={nodeRef}
        style={{
          width: NODE_W,
          minHeight: NODE_H,
          background: '#fff',
          border: `1.5px solid ${selected ? ACCENT + '60' : '#e2e8f0'}`,
          borderRadius: 14,
          fontFamily: 'system-ui',
          overflow: 'hidden',
          boxShadow: selected
            ? `0 0 0 3px ${ACCENT}12, 0 6px 20px rgba(99,102,241,0.13)`
            : '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Gradient top strip */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${ACCENT}, #818cf8, #a5b4fc)` }} />

        {/* Row 1 — identity + config (always visible) */}
        <div style={{ padding: '9px 11px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Badge */}
          <span style={{
            fontSize: 10, fontWeight: 800, color: ACCENT,
            letterSpacing: '0.04em', flexShrink: 0,
          }}>✦ SCRIPT</span>

          {/* Platform + format chip */}
          <span style={{
            fontSize: 9, color: '#475569', background: '#f1f5f9',
            border: '1px solid #e2e8f0', borderRadius: 5,
            padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 3,
          }}><platformDef.icon size={10} /> {formatDef.label}</span>

          <div style={{ flex: 1 }} />

          {/* Status dot */}
          {state !== 'idle' && (
            <span style={{
              fontSize: 9, fontWeight: 600, color: stateColor,
              display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
            }}>
              {state === 'running'
                ? <span style={{ width: 7, height: 7, borderRadius: '50%', border: `2px solid ${ACCENT}30`, borderTopColor: ACCENT, animation: 'spin-s 0.7s linear infinite', display: 'inline-block' }} />
                : <span style={{ width: 7, height: 7, borderRadius: '50%', background: stateColor, display: 'inline-block' }} />
              }
              {stateLabel}
            </span>
          )}

          {/* Config button */}
          <button
            onClick={() => setShowPanel(v => !v)}
            onMouseDown={e => e.stopPropagation()}
            title="Configurar"
            style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              background: showPanel ? `${ACCENT}12` : 'transparent',
              border: `1px solid ${showPanel ? ACCENT + '35' : '#e2e8f0'}`,
              color: showPanel ? ACCENT : '#94a3b8',
              fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.12s',
            }}
          >⚙</button>
        </div>

        {/* Row 1.5 — video type + sources chips (separate to avoid pushing config button) */}
        {(videoType || connectedCount > 0) && (
          <div style={{ padding: '0 11px 5px', display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            {/* Video type chip */}
            {videoType && (
              <span style={{
                fontSize: 9, color: '#0369a1', background: '#f0f9ff',
                border: '1px solid #bae6fd', borderRadius: 5,
                padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0,
              }}>{videoTypeDef.label}</span>
            )}

            {/* Sources count */}
            {connectedCount > 0 && (
              <span style={{
                fontSize: 9, color: '#16a34a', background: '#f0fdf4',
                border: '1px solid #bbf7d0', borderRadius: 8,
                padding: '2px 6px', fontWeight: 700, flexShrink: 0,
              }}>📎 {connectedCount}</span>
            )}
          </div>
        )}

        {/* Row 2 — topic */}
        <div style={{ padding: '0 11px 9px' }}>
          <div style={{
            fontSize: 11, color: topic ? '#334155' : '#cbd5e1',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: 1.4,
          }}>
            {topic || 'Sin tema — configurá el script'}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#f1f5f9', margin: '0 0' }} />

        {/* Row 3 — generate button */}
        <div style={{ padding: '8px 10px 10px', marginTop: 'auto' }}>
          <button
            onClick={handleGenerate}
            disabled={running}
            onMouseDown={e => e.stopPropagation()}
            style={{
              width: '100%', padding: '7px 10px', borderRadius: 8, border: 'none',
              background: running ? '#f1f5f9' : state === 'done' ? '#f8fafc' : ACCENT,
              color: running ? '#94a3b8' : state === 'done' ? ACCENT : '#fff',
              border: `1px solid ${running ? '#e2e8f0' : state === 'done' ? ACCENT + '30' : 'transparent'}`,
              fontSize: 11, fontWeight: 700, cursor: running ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'all 0.12s',
              letterSpacing: '0.01em',
            }}
          >
            {running
              ? <><span style={{ width: 9, height: 9, borderRadius: '50%', border: `2px solid ${ACCENT}30`, borderTopColor: ACCENT, animation: 'spin-s 0.7s linear infinite', display: 'inline-block' }} /> Generando…</>
              : state === 'done'
                ? '↺ Generar otro'
                : '✦ Generar guión'
            }
          </button>
        </div>
      </div>

      {/* Left handle — sources in */}
      <Handle
        type="target" position={Position.Left}
        style={{ background: ACCENT, border: `2px solid ${ACCENT}60`, width: 10, height: 10 }}
      />
      {/* Right handle — output nodes out */}
      <Handle
        type="source" position={Position.Right} id="out"
        style={{ background: `${ACCENT}90`, border: `2px solid ${ACCENT}50`, width: 10, height: 10 }}
      />
    </>
  )
}
