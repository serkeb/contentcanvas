import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, NodeToolbar, NodeResizer, useReactFlow, useStore } from '@xyflow/react'
import Markdown from './Markdown'
import { scrapeProfile, transcribeUrl, runLLM } from '../utils/api'
import { Crosshair, Anchor, BarChart, Lightbulb, FileText, Clock, Flame, Heart, Wand2, MessageCircle, Loader2, Check, AlertTriangle, User, Settings, Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react'
import { SiTiktok, SiInstagram, SiX } from './SocialIcons'
import ModelSel from '../components/ModelSel'
import PromptEditor from '../components/PromptEditor'
import { getDefaultModel } from '../utils/models'
import { loadApiKeys } from '../utils/storage'

const AMOUNT_OPTIONS = [5, 10, 20, 30, 50]
const SORT_OPTIONS = [
  { id: 'recent',  label: 'Más recientes',  icon: Clock },
  { id: 'viral',   label: 'Más virales',   icon: Flame },
  { id: 'liked',   label: 'Más likeados',  icon: Heart },
]

// ─── Constants ────────────────────────────────────────────────────────────────

const ANALYSIS_TEMPLATES = [
  {
    id: 'estrategia',
    icon: Crosshair,
    label: 'Estrategia',
    prompt: 'Analizá la estrategia de contenido completa: nicho, tono de voz, pilares de contenido, estructura narrativa, CTA usados, objetivos del creador, y audiencia objetivo.',
  },
  {
    id: 'hooks',
    icon: Anchor,
    label: 'Hooks',
    prompt: 'Extraé todos los hooks (aperturas) efectivos de estos videos. Clasificalos por tipo (pregunta, promesa, historia, número, etc.) y explicá por qué funcionan.',
  },
  {
    id: 'patrones',
    icon: BarChart,
    label: 'Patrones',
    prompt: 'Identificá patrones repetitivos: estructuras narrativas, frases recurrentes, temas frecuentes, formatos de video, y técnicas de retención de audiencia.',
  },
  {
    id: 'voz',
    icon: MessageCircle,
    label: 'Tono de voz',
    prompt: 'Analizá en profundidad el tono de voz, estilo de comunicación, vocabulario característico, ritmo del habla, uso del humor, y recursos persuasivos. Generá un perfil de voz reutilizable.',
  },
  {
    id: 'ideas',
    icon: Lightbulb,
    label: 'Ideas',
    prompt: 'Generá 20 ideas de contenido específicas basadas en el estilo de este creador. Las ideas deben ser originales pero manteniendo su tono y enfoque.',
  },
  {
    id: 'captions',
    icon: FileText,
    label: 'Captions',
    prompt: 'Analizá las descripciones y hashtags de estos videos. Identificá: 1) Los hashtags más frecuentes y en qué tipo de contenido aparecen, 2) Patrones en las captions (longitud, uso de emojis, CTAs, preguntas), 3) Estrategia de hashtags (nicho vs. masivos vs. trending), 4) Fórmulas de caption que se repiten. Entregá un perfil de estilo de captions listo para replicar.',
    useDescriptions: true,
  },
  {
    id: 'personalizado',
    icon: Wand2,
    label: 'Personalizado',
    prompt: '',   // loaded from localStorage
    custom: true,
  },
]

const CUSTOM_PROMPT_KEY = 'profile_custom_analysis_prompt'

// Label width is fixed so handles sit at a consistent distance from the node edge
const LABEL_W = 96   // px — covers longest label "Tono de voz"
const HANDLE_OFFSET = LABEL_W + 22  // gap(8) + label(96) + gap(8) + half-handle(5) = ~117

const ACCENT = '#6366f1'

// ─── Helper ───────────────────────────────────────────────────────────────────

function fmt(num) {
  if (!num) return ''
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`
  return String(num)
}

// ─── Analysis Panel (portaled, anchored to LEFT of node) ──────────────────────

const PANEL_W = 400
const PANEL_H = 580

function AnalysisPanel({ nodeRef, transform, title, content, analyzing, onClose, onRun, readyCount, descCount, analyses, activeTpl }) {
  const [pos, setPos] = useState({ left: 0, top: 0 })
  // Custom prompt — persisted in localStorage across all profiles
  const [customPrompt, setCustomPrompt] = useState(
    () => localStorage.getItem(CUSTOM_PROMPT_KEY) || ''
  )
  const [showCustomInput, setShowCustomInput] = useState(activeTpl === 'personalizado')

  const recalc = useCallback(() => {
    if (!nodeRef.current) return
    const r = nodeRef.current.getBoundingClientRect()
    const left = Math.max(8, r.left - PANEL_W - 16)
    const top  = Math.min(Math.max(8, r.top), window.innerHeight - PANEL_H - 8)
    setPos({ left, top })
  }, [nodeRef])

  useEffect(() => { recalc() }, [transform, recalc])

  function saveCustomPrompt(val) {
    setCustomPrompt(val)
    localStorage.setItem(CUSTOM_PROMPT_KEY, val)
  }

  function runCustom() {
    if (!customPrompt.trim()) return
    onRun({ id: 'personalizado', icon: '✏️', label: 'Personalizado', prompt: customPrompt })
  }

  const fixedTemplates = ANALYSIS_TEMPLATES.filter(t => !t.custom)

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        width: PANEL_W,
        height: PANEL_H,
        background: '#fff',
        border: `1.5px solid ${ACCENT}30`,
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        zIndex: 99999,
        overflow: 'hidden',
        animation: 'slideInPanel 0.2s ease',
      }}
    >
      <style>{`
        @keyframes slideInPanel { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: `1px solid ${ACCENT}14`,
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
        background: `${ACCENT}06`,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT, flex: 1 }}>
          {title || '✦ Análisis IA'}
        </span>
        <button
          onClick={onClose}
          style={{
            background: '#f1f5f9', border: 'none', borderRadius: 7,
            color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>
      </div>

      {/* Fixed template buttons */}
      <div style={{
        padding: '8px 10px 6px',
        borderBottom: `1px solid #f1f5f9`,
        display: 'flex', flexWrap: 'wrap', gap: 5,
        flexShrink: 0,
      }}>
        {fixedTemplates.map(tpl => {
          const isActive = activeTpl === tpl.id
          const isDone   = !!(analyses || {})[tpl.id]
          const count    = tpl.useDescriptions ? descCount : readyCount
          const isDisabled = count === 0 || analyzing
          return (
            <button
              key={tpl.id}
              onClick={() => { setShowCustomInput(false); onRun(tpl) }}
              disabled={isDisabled}
              title={isDone ? 'Ya generado — click para regenerar' : count === 0 ? tpl.useDescriptions ? 'Importá videos primero' : 'Esperando transcripciones' : ''}
              style={{
                background: isActive ? ACCENT : isDone ? `${ACCENT}18` : `${ACCENT}08`,
                border: `1.5px solid ${isActive ? ACCENT : isDone ? ACCENT + '50' : ACCENT + '25'}`,
                borderRadius: 20,
                color: isActive ? '#fff' : ACCENT,
                fontSize: 10, fontWeight: 600,
                cursor: isDisabled ? 'default' : 'pointer',
                padding: '4px 9px',
                opacity: count === 0 ? 0.5 : 1,
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 3,
              }}
            >
              {typeof tpl.icon === 'string' ? <span>{tpl.icon}</span> : <tpl.icon size={12} strokeWidth={2} />} {tpl.label}
              {isDone && !isActive && <span style={{ fontSize: 7, color: '#22c55e' }}>●</span>}
            </button>
          )
        })}

        {/* Custom button */}
        {(() => {
          const isActive = activeTpl === 'personalizado'
          const isDone   = !!(analyses || {})['personalizado']
          return (
            <button
              onClick={() => setShowCustomInput(v => !v)}
              style={{
                background: (showCustomInput || isActive) ? '#0f172a' : isDone ? '#0f172a18' : '#f8fafc',
                border: `1.5px solid ${(showCustomInput || isActive) ? '#0f172a' : isDone ? '#0f172a40' : '#e2e8f0'}`,
                borderRadius: 20,
                color: (showCustomInput || isActive) ? '#fff' : '#334155',
                fontSize: 10, fontWeight: 600, cursor: 'pointer',
                padding: '4px 9px', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 3,
              }}
            >
              <Wand2 size={12} strokeWidth={2} /> Personalizado
              {isDone && !isActive && <span style={{ fontSize: 7, color: '#22c55e' }}>●</span>}
            </button>
          )
        })()}
      </div>

      {/* Custom prompt input — shown when expanded */}
      {showCustomInput && (
        <div style={{
          padding: '8px 10px',
          borderBottom: '1px solid #f1f5f9',
          background: '#fafafa',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Instrucción personalizada <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none' }}>(se guarda para todos los perfiles)</span>
          </div>
          <textarea
            value={customPrompt}
            onChange={e => saveCustomPrompt(e.target.value)}
            onMouseDown={e => e.stopPropagation()}
            onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter' && e.metaKey) runCustom() }}
            placeholder="Ej: Analizá el perfil como si fueras un consultor de marca y generá un informe ejecutivo..."
            rows={3}
            style={{
              width: '100%', resize: 'vertical',
              background: '#fff', border: `1.5px solid ${ACCENT}30`,
              borderRadius: 8, color: '#0f172a',
              fontSize: 10, fontFamily: 'system-ui', lineHeight: 1.5,
              padding: '7px 9px', outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => { e.target.style.borderColor = `${ACCENT}70` }}
            onBlur={e => { e.target.style.borderColor = `${ACCENT}30` }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 5, gap: 6 }}>
            <span style={{ fontSize: 9, color: '#94a3b8', alignSelf: 'center' }}>⌘+Enter para ejecutar</span>
            <button
              onClick={runCustom}
              disabled={!customPrompt.trim() || readyCount === 0 || analyzing}
              style={{
                background: customPrompt.trim() && readyCount > 0 ? ACCENT : '#f1f5f9',
                border: 'none', borderRadius: 8,
                color: customPrompt.trim() && readyCount > 0 ? '#fff' : '#94a3b8',
                fontSize: 10, fontWeight: 700, cursor: customPrompt.trim() && readyCount > 0 ? 'pointer' : 'default',
                padding: '5px 14px',
              }}
            >
              ▶ Ejecutar
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {analyzing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: ACCENT, fontSize: 12 }}>
            <span style={{
              width: 14, height: 14, borderRadius: '50%',
              border: `2px solid ${ACCENT}40`, borderTopColor: ACCENT,
              animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0,
            }} />
            Analizando con IA…
          </div>
        ) : content ? (
          <Markdown>{content}</Markdown>
        ) : (
          <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', paddingTop: 40 }}>
            {readyCount === 0
              ? 'Esperando transcripciones…'
              : showCustomInput
                ? 'Escribí tu instrucción y presioná Ejecutar'
                : 'Elegí un análisis para comenzar'}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// ─── Video Thumbnail Card ──────────────────────────────────────────────────────

function VideoCard({ video, onExpand }) {
  const stateColor = {
    procesando: '#f59e0b',
    listo: '#22c55e',
    error: '#ef4444',
  }[video.state] || '#94a3b8'

  const stateIcon = {
    procesando: Loader2,
    listo: Check,
    error: AlertTriangle,
  }[video.state]

  return (
    <div
      onClick={() => video.state === 'listo' && onExpand(video)}
      title={video.title || video.url}
      style={{
        position: 'relative',
        aspectRatio: '9/16',
        background: '#0f172a',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: video.state === 'listo' ? 'pointer' : 'default',
        border: `1.5px solid ${stateColor}40`,
        flexShrink: 0,
        transition: 'transform 0.1s, box-shadow 0.1s',
      }}
      onMouseEnter={e => { if (video.state === 'listo') { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = `0 4px 16px ${stateColor}40` } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Thumbnail image */}
      {video.thumbnail ? (
        <img
          src={video.thumbnail}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.style.display = 'none' }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, opacity: 0.2,
        }}>🎬</div>
      )}

      {/* State badge */}
      <div style={{
        position: 'absolute', top: 4, right: 4,
        background: stateColor,
        borderRadius: '50%',
        width: 16, height: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 8, color: '#fff', fontWeight: 700,
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }}>
        {stateIcon && <stateIcon size={8} strokeWidth={2.5} className={video.state === 'procesando' ? 'spin-icon' : ''} />}
      </div>

      {/* Spinner overlay for processing */}
      {video.state === 'procesando' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: '#fff',
            animation: 'spin 0.8s linear infinite',
            display: 'inline-block',
          }} />
        </div>
      )}

      {/* Title overlay at bottom */}
      {video.title && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
          padding: '14px 5px 5px',
          fontSize: 7,
          color: '#fff',
          lineHeight: 1.3,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          textOverflow: 'ellipsis',
        }}>
          {video.title}
        </div>
      )}
    </div>
  )
}

// ─── Transcript Popup (portaled) ──────────────────────────────────────────────

function TranscriptPopup({ video, onClose }) {
  if (!video) return null
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(15,23,42,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(2px)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14,
          padding: '20px 24px',
          maxWidth: 560, width: '90vw', maxHeight: '75vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          border: `1.5px solid ${ACCENT}20`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {video.title || 'Transcripción'}
          </span>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9', border: 'none', borderRadius: 7,
              color: '#64748b', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >✕</button>
        </div>
        {/* Engagement stats */}
        {(video.views || video.likes || video.comments || video.saves) ? (
          <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap', flexShrink: 0 }}>
            {video.views  > 0 && <span style={{ fontSize: 10, color: '#64748b' }}>👁 {fmt(video.views)}</span>}
            {video.likes  > 0 && <span style={{ fontSize: 10, color: '#64748b' }}>❤️ {fmt(video.likes)}</span>}
            {video.comments > 0 && <span style={{ fontSize: 10, color: '#64748b' }}>💬 {fmt(video.comments)}</span>}
            {video.saves  > 0 && <span style={{ fontSize: 10, color: '#64748b' }}>🔖 {fmt(video.saves)}</span>}
            {video.shares > 0 && <span style={{ fontSize: 10, color: '#64748b' }}>🔁 {fmt(video.shares)}</span>}
          </div>
        ) : null}
        {/* Description (caption) */}
        {video.description && (
          <div style={{ fontSize: 10, color: '#475569', background: '#f8fafc', borderRadius: 8, padding: '8px 10px', marginBottom: 10, lineHeight: 1.5, flexShrink: 0, maxHeight: 80, overflowY: 'auto' }}>
            {video.description}
          </div>
        )}
        <div style={{ overflowY: 'auto', flex: 1, fontSize: 12, lineHeight: 1.7, color: '#334155', whiteSpace: 'pre-wrap' }}>
          {video.transcript}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfileAnalysisNode({ id, data, selected }) {
  const { setNodes, deleteElements } = useReactFlow()
  const transform = useStore(s => s.transform)
  const nodeRef = useRef(null)

  // ── Local state ──
  const [model, setModel] = useState(() => data.model || getDefaultModel(loadApiKeys()))
  const [showPanel, setShowPanel]         = useState(false)
  const [panelTitle, setPanelTitle]       = useState('')
  const [panelContent, setPanelContent]   = useState('')
  const [analyzing, setAnalyzing]         = useState(false)
  const [activeTpl, setActiveTpl]         = useState(null)
  const [expandedVideo, setExpandedVideo] = useState(null)
  const [customPrompt, setCustomPrompt]   = useState(data.customPrompt || '')
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  // Instagram credentials — stored in node data (persisted in Supabase board)
  const [igUser, setIgUser] = useState(data.igUser || '')
  const [igPass, setIgPass] = useState(data.igPass || '')
  const [showIgPass, setShowIgPass] = useState(false)

  // ── Data shortcuts ──
  const platform  = data.platform  || ''
  const username  = data.username  || ''
  const amount    = data.amount    || 10
  const sortBy    = data.sortBy    || 'recent'
  const state     = data.state     || 'idle'
  const error     = data.error     || ''
  const progress  = data.progress  || { current: 0, total: 0, message: '' }
  const profile   = data.profile   || {}
  const videos      = data.videoItems || []
  const analyses    = data.analyses   || {}
  const readyVideos = videos.filter(v => v.state === 'listo')
  const descVideos  = videos.filter(v => v.description)

  // Block canvas zoom inside node
  useEffect(() => {
    const el = nodeRef.current
    if (!el) return
    const stop = e => e.stopPropagation()
    el.addEventListener('wheel', stop)
    return () => el.removeEventListener('wheel', stop)
  }, [])

  function persist(updates) {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n))
  }

  function handleSaveCustomPrompt(prompt) {
    setCustomPrompt(prompt)
    persist({ customPrompt: prompt })
  }

  // ── Import + Transcribe ──────────────────────────────────────────────────────

  async function handleImport() {
    const isSorted = sortBy === 'viral' || sortBy === 'liked'
    const fetchPool = isSorted ? Math.max(150, amount * 10) : amount
    persist({
      state: 'fetching', error: null,
      progress: { current: 0, total: fetchPool, message: 'Conectando con el perfil…' }
    })

    // Animated progress messages while waiting for the backend
    const sortLabel = sortBy === 'viral' ? 'reproducciones' : 'likes'
    const messages = isSorted
      ? [
          { pct: 0.05, msg: `Obteniendo perfil…` },
          { pct: 0.15, msg: `Descargando lista de videos…` },
          { pct: 0.40, msg: `Analizando ${fetchPool} videos para encontrar los más virales…` },
          { pct: 0.65, msg: `Ordenando por ${sortLabel}…` },
          { pct: 0.85, msg: `Preparando top ${amount}…` },
        ]
      : [
          { pct: 0.1,  msg: `Obteniendo perfil…` },
          { pct: 0.5,  msg: `Descargando ${amount} videos recientes…` },
          { pct: 0.85, msg: `Preparando resultados…` },
        ]

    let msgIdx = 0
    const progressInterval = setInterval(() => {
      if (msgIdx >= messages.length) return
      const { pct, msg } = messages[msgIdx++]
      persist({
        state: 'fetching',
        progress: { current: Math.round(fetchPool * pct), total: fetchPool, message: msg }
      })
    }, isSorted ? 2800 : 1500)

    try {
      const result = await scrapeProfile(platform, username, amount, sortBy, igUser, igPass)
      clearInterval(progressInterval)
      persist({ progress: { current: fetchPool, total: fetchPool, message: `✓ ${result.videos?.length || amount} videos encontrados` } })

      // Build initial video items
      const initial = result.videos.map((v, i) => ({
        id: `vi-${Date.now()}-${i}`,
        url: v.url,
        title: v.title || '',
        description: v.description || '',
        thumbnail: v.thumbnail || '',
        views: v.views || 0,
        likes: v.likes || 0,
        comments: v.comments || 0,
        saves: v.saves || 0,
        shares: v.shares || 0,
        duration: v.duration || 0,
        state: 'procesando',
        transcript: null,
        error: null,
      }))

      persist({
        state: 'processing',
        profile: result.profile || {},
        videoItems: initial,
        progress: { current: 0, total: initial.length, message: 'Transcribiendo videos…' },
      })

      // Transcribe sequentially, updating individual items
      for (let i = 0; i < initial.length; i++) {
        const item = initial[i]
        try {
          const res = await transcribeUrl(item.url)
          initial[i] = { ...item, state: 'listo', transcript: res.transcript }
        } catch (err) {
          initial[i] = { ...item, state: 'error', error: err.message }
        }

        // Update after each transcription
        const current = [...initial]
        persist({
          videoItems: current,
          progress: {
            current: i + 1,
            total: initial.length,
            message: `Transcribiendo ${i + 1}/${initial.length}…`,
          },
        })
      }

      const done = [...initial]
      persist({
        state: 'done',
        videoItems: done,
        progress: { current: done.length, total: done.length, message: `✓ ${done.filter(v => v.state === 'listo').length} videos listos` },
      })

    } catch (err) {
      clearInterval(progressInterval)
      persist({ state: 'error', error: err.message })
    }
  }

  // ── Analysis ─────────────────────────────────────────────────────────────────

  async function handleRun(tpl) {
    const isCaptions = tpl.useDescriptions
    const descVideos = videos.filter(v => v.description)
    const sourceVideos = isCaptions ? descVideos : readyVideos
    if (sourceVideos.length === 0) return

    const prompt = tpl.custom
      ? (localStorage.getItem(CUSTOM_PROMPT_KEY) || '').trim()
      : tpl.prompt
    if (!prompt) return

    setAnalyzing(true)
    setActiveTpl(tpl.id)
    setPanelTitle(tpl.label)
    setPanelContent('')
    setShowPanel(true)

    try {
      let transcripts
      if (isCaptions) {
        transcripts = descVideos.map(v => ({
          url: v.url,
          platform,
          transcript: `Descripción: ${v.description}${v.views ? `\nViews: ${fmt(v.views)} | Likes: ${fmt(v.likes)} | Comentarios: ${fmt(v.comments)} | Guardados: ${fmt(v.saves)}` : ''}`,
          title: v.title,
          collection: null,
        }))
      } else {
        transcripts = readyVideos.map(v => ({
          url: v.url, platform, transcript: v.transcript, title: v.title, collection: null,
        }))
      }
      const res = await runLLM([{ role: 'user', content: prompt }], transcripts, model, [], null, customPrompt)
      setPanelContent(res.result)
      const currentAnalyses = data.analyses || {}
      persist({ analyses: { ...currentAnalyses, [tpl.id]: res.result } })
    } catch (err) {
      setPanelContent(`Error: ${err.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const PlatformIcon = platform === 'tiktok' ? SiTiktok : platform === 'instagram' ? SiInstagram : SiX
  const platformLabel = platform === 'tiktok' ? 'TikTok' : platform === 'instagram' ? 'Instagram' : ''

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin-icon { animation: spin 0.7s linear infinite; }`}</style>

      <NodeToolbar isVisible={selected} position="top" align="end" style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => deleteElements({ nodes: [{ id }] })}
          style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7,
            color: '#dc2626', fontSize: 10, fontWeight: 600,
            cursor: 'pointer', padding: '4px 10px', fontFamily: 'system-ui',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >✕ Eliminar</button>
      </NodeToolbar>

      <NodeResizer
        isVisible={selected}
        minWidth={340}
        minHeight={300}
        handleStyle={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', border: `2px solid ${ACCENT}` }}
        lineStyle={{ borderColor: `${ACCENT}50`, borderWidth: 1 }}
      />

      <div
        ref={nodeRef}
        style={{
          width: '100%', height: '100%',
          background: '#fff',
          border: `1.5px solid ${selected ? ACCENT + '80' : ACCENT + '28'}`,
          borderRadius: 16,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          boxShadow: selected
            ? `0 0 0 3px ${ACCENT}14, 0 8px 32px rgba(0,0,0,0.12)`
            : '0 2px 16px rgba(0,0,0,0.08)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >

        {/* ── PROFILE HEADER ─────────────────────────────────────────── */}
        <div style={{
          padding: '14px 16px 12px',
          borderBottom: `1px solid ${ACCENT}12`,
          background: `${ACCENT}05`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {/* Avatar */}
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: `${ACCENT}12`,
              border: `2px solid ${ACCENT}30`,
              flexShrink: 0,
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>
              {profile.avatar ? (
                <img src={profile.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none' }} />
              ) : <PlatformIcon size={20} />}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  {profile.name || `@${username}`}
                </span>
                <span style={{
                  fontSize: 8, color: ACCENT, background: `${ACCENT}12`,
                  border: `1px solid ${ACCENT}25`, borderRadius: 10, padding: '2px 7px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <PlatformIcon size={9} /> {platformLabel}
                </span>
              </div>

              {profile.username && profile.name && (
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>@{profile.username || username}</div>
              )}

              {profile.bio && (
                <div style={{
                  fontSize: 9.5, color: '#64748b', marginTop: 4,
                  lineHeight: 1.4,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {profile.bio}
                </div>
              )}

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                {profile.followers > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{fmt(profile.followers)}</span>
                    <span style={{ fontSize: 8, color: '#94a3b8' }}>seguidores</span>
                  </div>
                )}
                {profile.following > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{fmt(profile.following)}</span>
                    <span style={{ fontSize: 8, color: '#94a3b8' }}>siguiendo</span>
                  </div>
                )}
                {videos.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>{readyVideos.length}/{videos.length}</span>
                    <span style={{ fontSize: 8, color: '#94a3b8' }}>transcritos</span>
                  </div>
                )}
              </div>
            </div>

            {/* Analyze button — show when there are ready transcripts or descriptions */}
            {(readyVideos.length > 0 || descVideos.length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, alignItems: 'flex-end' }}>
                <ModelSel value={model} onChange={setModel} />
                <button
                  onClick={() => setShowPromptEditor(v => !v)}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    background: showPromptEditor || customPrompt ? `${ACCENT}15` : '#f8fafc',
                    border: `1px solid ${showPromptEditor || customPrompt ? ACCENT : '#e2e8f0'}`,
                    borderRadius: 7, padding: '4px 8px',
                    cursor: 'pointer', fontSize: 9, fontWeight: 600,
                    color: showPromptEditor || customPrompt ? ACCENT : '#64748b',
                    transition: 'all 0.15s',
                  }}
                  title={customPrompt ? 'Prompt personalizado configurado' : 'Personalizar prompt del sistema'}
                >
                  <Settings size={11} strokeWidth={2} />
                  {customPrompt && '✓'}
                </button>
                <button
                  onClick={() => setShowPanel(p => !p)}
                  style={{
                    background: showPanel ? ACCENT : `${ACCENT}12`,
                    border: `1.5px solid ${ACCENT}40`,
                    borderRadius: 10, color: showPanel ? '#fff' : ACCENT,
                    fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    padding: '6px 12px',
                    display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'all 0.15s',
                  }}
                >
                  ✦ Analizar
                </button>
              </div>
            )}

            {/* Prompt Editor Panel */}
            {showPromptEditor && (
              <div style={{ marginTop: 12 }}>
                <PromptEditor
                  customPrompt={customPrompt}
                  onSave={handleSaveCustomPrompt}
                  defaultPromptPreview="Prompt del sistema para análisis de perfil de creador de contenido"
                  accentColor={ACCENT}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── BODY ─────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }} className="nodrag nopan">

          {/* IDLE */}
          {state === 'idle' && (
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24,
            }}>
              <div style={{ fontSize: 32, opacity: 0.15 }}>🎬</div>

              {/* Amount selector */}
              <div style={{ width: '100%', maxWidth: 260 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Cantidad de videos
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {AMOUNT_OPTIONS.map(n => (
                    <button
                      key={n}
                      onClick={() => persist({ amount: n })}
                      style={{
                        padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.1s',
                        background: amount === n ? ACCENT : '#f1f5f9',
                        color: amount === n ? '#fff' : '#64748b',
                        border: `1.5px solid ${amount === n ? ACCENT : '#e2e8f0'}`,
                      }}
                    >{n}</button>
                  ))}
                </div>
              </div>

              {/* Sort selector */}
              <div style={{ width: '100%', maxWidth: 260 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Ordenar por
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => persist({ sortBy: opt.id })}
                      style={{
                        padding: '7px 14px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s',
                        background: sortBy === opt.id ? `${ACCENT}12` : '#f8fafc',
                        color: sortBy === opt.id ? ACCENT : '#64748b',
                        border: `1.5px solid ${sortBy === opt.id ? ACCENT + '40' : '#e2e8f0'}`,
                      }}
                    >{opt.label}</button>
                  ))}
                </div>
                {sortBy !== 'recent' && (
                  <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 6, lineHeight: 1.4 }}>
                    💡 Analiza hasta {Math.max(150, amount * 10)} videos del perfil y devuelve el top {amount} por {sortBy === 'viral' ? 'reproducciones' : 'likes'}. Puede tardar ~30s.
                  </div>
                )}
              </div>

              {/* Instagram credentials */}
              {platform === 'instagram' && (
                <div style={{ width: '100%', maxWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                    <Lock size={9} color="#94a3b8" />
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Cuenta de Instagram
                    </span>
                  </div>

                  {/* Warning */}
                  <div style={{
                    background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8,
                    padding: '7px 10px', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'flex-start',
                  }}>
                    <ShieldAlert size={12} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 9, color: '#92400e', lineHeight: 1.5 }}>
                      <strong>Recomendamos usar una cuenta secundaria</strong> (dummy account) para evitar restricciones en tu cuenta personal o de negocio.
                    </span>
                  </div>

                  <input
                    type="text"
                    placeholder="Usuario (sin @)"
                    value={igUser}
                    onChange={e => { setIgUser(e.target.value); persist({ igUser: e.target.value }) }}
                    style={{
                      width: '100%', boxSizing: 'border-box', marginBottom: 6,
                      padding: '7px 10px', borderRadius: 8, fontSize: 11,
                      border: '1.5px solid #e2e8f0', outline: 'none', background: '#f8fafc',
                    }}
                  />
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showIgPass ? 'text' : 'password'}
                      placeholder="Contraseña"
                      value={igPass}
                      onChange={e => { setIgPass(e.target.value); persist({ igPass: e.target.value }) }}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '7px 32px 7px 10px', borderRadius: 8, fontSize: 11,
                        border: '1.5px solid #e2e8f0', outline: 'none', background: '#f8fafc',
                      }}
                    />
                    <button
                      onClick={() => setShowIgPass(p => !p)}
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8',
                      }}
                    >
                      {showIgPass ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={platform === 'instagram' && (!igUser || !igPass)}
                style={{
                  background: (platform === 'instagram' && (!igUser || !igPass)) ? '#e2e8f0' : ACCENT,
                  border: 'none', borderRadius: 10,
                  color: (platform === 'instagram' && (!igUser || !igPass)) ? '#94a3b8' : '#fff',
                  fontSize: 11, fontWeight: 700,
                  cursor: (platform === 'instagram' && (!igUser || !igPass)) ? 'not-allowed' : 'pointer',
                  padding: '10px 28px',
                  boxShadow: (platform === 'instagram' && (!igUser || !igPass)) ? 'none' : `0 4px 14px ${ACCENT}40`,
                  marginTop: 4, transition: 'all 0.15s',
                }}
              >
                📥 Importar {amount} videos
              </button>
            </div>
          )}

          {/* LOADING */}
          {(state === 'fetching' || state === 'processing') && (
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
            }}>
              {/* Mini video grid preview while loading */}
              {videos.length > 0 ? (
                <div style={{ width: '100%', overflowY: 'auto', padding: '10px 12px', flex: 1 }}>
                  <VideoGrid videos={videos} onExpand={setExpandedVideo} />
                </div>
              ) : (
                <>
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: `3px solid ${ACCENT}30`, borderTopColor: ACCENT,
                    animation: 'spin 1s linear infinite', display: 'inline-block',
                  }} />
                  <div style={{ fontSize: 11, color: '#64748b' }}>{progress.message || 'Cargando…'}</div>
                </>
              )}

              {/* Progress bar at bottom */}
              {progress.total > 0 && (
                <div style={{ width: '100%', padding: '8px 12px', flexShrink: 0, borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: '#64748b' }}>{progress.message}</span>
                    <span style={{ fontSize: 9, color: '#94a3b8' }}>{progress.current}/{progress.total}</span>
                  </div>
                  <div style={{ height: 3, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', background: ACCENT, borderRadius: 4,
                      width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ERROR */}
          {state === 'error' && (
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20,
            }}>
              <div style={{ fontSize: 28, opacity: 0.25 }}>⚠️</div>
              <div style={{ fontSize: 11, color: '#dc2626', textAlign: 'center', lineHeight: 1.5, maxWidth: 280 }}>{error}</div>
              <button
                onClick={handleImport}
                style={{
                  background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8,
                  color: '#334155', fontSize: 10, fontWeight: 600, cursor: 'pointer', padding: '6px 14px',
                }}
              >
                Reintentar
              </button>
            </div>
          )}

          {/* DONE — video grid */}
          {state === 'done' && (
            <div style={{ height: '100%', overflowY: 'auto', padding: '12px' }}>
              <VideoGrid videos={videos} onExpand={setExpandedVideo} />
            </div>
          )}
        </div>
      </div>

      {/* ── ANALYSIS PANEL (portaled, right side) ─── */}
      {showPanel && (
        <AnalysisPanel
          nodeRef={nodeRef}
          transform={transform}
          title={panelTitle}
          content={panelContent}
          analyzing={analyzing}
          readyCount={readyVideos.length}
          descCount={descVideos.length}
          onClose={() => setShowPanel(false)}
          onRun={handleRun}
          analyses={analyses}
          activeTpl={activeTpl}
        />
      )}

      {/* ── TRANSCRIPT POPUP ─── */}
      {expandedVideo && (
        <TranscriptPopup
          video={expandedVideo}
          onClose={() => setExpandedVideo(null)}
        />
      )}

      {/* ── OUTPUT HANDLES — label first, then dot at the right end ── */}

      {/* Videos handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="videos"
        style={{
          top: 28,
          right: -(HANDLE_OFFSET + 5),
          background: readyVideos.length > 0 ? '#22c55e' : '#94a3b8',
          border: `2px solid ${readyVideos.length > 0 ? '#16a34a' : '#cbd5e1'}`,
          width: 10, height: 10, borderRadius: '50%',
        }}
      />
      <div style={{
        position: 'absolute', left: '100%', top: 20, marginLeft: 8,
        width: LABEL_W,
        fontSize: 8, fontWeight: 600, color: readyVideos.length > 0 ? '#16a34a' : '#64748b',
        background: '#fff', padding: '2px 6px', borderRadius: 6,
        border: `1px solid ${readyVideos.length > 0 ? '#bbf7d0' : '#e2e8f0'}`,
        pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        🎬 Videos
      </div>

      {/* Analysis handles + labels */}
      {ANALYSIS_TEMPLATES.map((tpl, i) => {
        const hasAnalysis = !!analyses[tpl.id]
        const topPx = 50 + i * 28
        const isCustom = tpl.custom
        return (
          <div key={tpl.id}>
            <Handle
              type="source"
              position={Position.Right}
              id={tpl.id}
              style={{
                top: topPx,
                right: -(HANDLE_OFFSET + 5),
                background: hasAnalysis ? (isCustom ? '#0f172a' : ACCENT) : '#94a3b8',
                border: `2px solid ${hasAnalysis ? (isCustom ? '#0f172a80' : ACCENT + '80') : '#cbd5e1'}`,
                width: 10, height: 10, borderRadius: '50%',
                transition: 'background 0.2s',
              }}
            />
            <div style={{
              position: 'absolute', left: '100%', top: topPx - 7, marginLeft: 8,
              width: LABEL_W,
              fontSize: 8, fontWeight: 600,
              color: hasAnalysis ? (isCustom ? '#0f172a' : ACCENT) : '#64748b',
              background: '#fff', padding: '2px 6px', borderRadius: 6,
              border: `1px solid ${hasAnalysis ? (isCustom ? '#0f172a30' : ACCENT + '35') : '#e2e8f0'}`,
              pointerEvents: 'none', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
              zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              {typeof tpl.icon === 'string' ? <span>{tpl.icon}</span> : <tpl.icon size={10} strokeWidth={2} />} {tpl.label}
              {hasAnalysis && <span style={{ color: '#22c55e', fontSize: 8 }}>●</span>}
            </div>
          </div>
        )
      })}

      <Handle
        type="target"
        position={Position.Left}
        style={{ background: ACCENT, border: `2px solid ${ACCENT}60`, width: 10, height: 10, borderRadius: '50%' }}
      />
    </>
  )
}

// ─── Video Grid (separate component for reuse) ────────────────────────────────

function VideoGrid({ videos, onExpand }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
      gap: 8,
    }}>
      {videos.map(video => (
        <VideoCard key={video.id} video={video} onExpand={onExpand} />
      ))}
    </div>
  )
}
