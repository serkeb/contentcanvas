import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuth as useAuthHook } from '../hooks/useAuth'
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Paperclip,
  Settings,
  Trash2,
  StickyNote,
  Square,
  Pen,
  FolderOpen,
  Sparkles,
  Crosshair,
  RefreshCw,
  X,
  Lightbulb,
  MessageCircle,
  Brain,
  Table as TableIcon,
  Image as ImageIcon,
  Wand2,
} from 'lucide-react'

import VideoTranscriptNode from './nodes/VideoTranscriptNode'
import LLMNode from './nodes/LLMNode'
import DeletableEdge from './edges/DeletableEdge'
import GroupNode from './nodes/GroupNode'
import DocumentNode from './nodes/DocumentNode'
import TextNode from './nodes/TextNode'
import StickyNoteNode from './nodes/StickyNoteNode'
import ShapeNode from './nodes/ShapeNode'
import ProfileAnalysisNode from './nodes/ProfileAnalysisNode'
import BrandVoiceNode from './nodes/BrandVoiceNode'
import ScriptNode from './nodes/ScriptNode'
import ScriptOutputNode from './nodes/ScriptOutputNode'
import IdeasNode from './nodes/IdeasNode'
import RepurposingNode from './nodes/RepurposingNode'
import RepurposingOutputNode from './nodes/RepurposingOutputNode'
import StoryFlowNode from './nodes/StoryFlowNode'
import StoryFlowOutputNode from './nodes/StoryFlowOutputNode'
import FormatNode from './nodes/FormatNode'
import ImageAnalysisNode from './nodes/ImageAnalysisNode'
import ImageGenerationNode from './nodes/ImageGenerationNode'
import KanbanSidePanel from './components/KanbanSidePanel'
import './FlowStyles.css'
import { transcribeUrl, checkHealth, detectPlatform, isVideoUrl, extractDocumentFile, extractGoogleDoc, isGoogleDocsUrl, isProfileUrl, extractUsernameFromProfile, analyzeImage } from './utils/api'
import { compressImage } from './utils/imageCompression'
import { saveConfig, loadConfig, saveApiKeys, loadApiKeys, loadApiKeysAsync, hasAnyApiKey } from './utils/storage'
import { layoutGroupChildren } from './utils/layout'
import { useBoards } from './utils/useBoards'
import { useCopyPaste } from './utils/useCopyPaste'
import BoardTabs from './BoardTabs'
import TokenMeter from './TokenMeter'
import SetupScreen from './SetupScreen'

const nodeTypes = {
  videoTranscriptNode: VideoTranscriptNode,
  llmNode: LLMNode,
  groupNode: GroupNode,
  documentNode: DocumentNode,
  textNode: TextNode,
  stickyNoteNode: StickyNoteNode,
  shapeNode: ShapeNode,
  profileAnalysisNode: ProfileAnalysisNode,
  brandVoiceNode: BrandVoiceNode,
  scriptNode: ScriptNode,
  scriptOutputNode: ScriptOutputNode,
  ideasNode: IdeasNode,
  repurposingNode: RepurposingNode,
  repurposingOutputNode: RepurposingOutputNode,
  storyFlowNode: StoryFlowNode,
  storyFlowOutputNode: StoryFlowOutputNode,
  formatNode: FormatNode,
  imageAnalysisNode: ImageAnalysisNode,
  imageGenerationNode: ImageGenerationNode,
}

const edgeTypes = {
  deletable: DeletableEdge,
}

const edgeDefaults = {
  type: 'deletable',
  style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
  markerEnd: { type: 'arrowclosed', color: '#cbd5e1' },
}

const ALL_SHAPES = [
  { id: 'rect',          icon: '▭', label: 'Rectángulo' },
  { id: 'rounded',       icon: '▢', label: 'Redondeado' },
  { id: 'circle',        icon: '◯', label: 'Círculo' },
  { id: 'diamond',       icon: '◇', label: 'Rombo' },
  { id: 'triangle',      icon: '△', label: 'Triángulo' },
  { id: 'parallelogram', icon: '▱', label: 'Paralelogramo' },
  { id: 'callout',       icon: null, Icon: MessageCircle, label: 'Globo de texto' },
  { id: 'hexagon',       icon: '⬡', label: 'Hexágono' },
]

const ALL_FORMATS = [
  { id: 'table',    icon: '📊', label: 'Tabla',       color: '#3b82f6', description: 'Tabla editable tipo Notion' },
  { id: 'kanban',   icon: '📋', label: 'Kanban',      color: '#f59e0b', description: 'Tablero Kanban con columnas' },
  { id: 'document', icon: '📄', label: 'Documento',   color: '#10b981', description: 'Documento de texto enriquecido' },
  { id: 'calendar', icon: '📅', label: 'Calendario',  color: '#ef4444', description: 'Vista de calendario mensual' },
  { id: 'timeline', icon: '⏱',  label: 'Timeline',    color: '#8b5cf6', description: 'Línea de tiempo vertical' },
]

// ─── Left sidebar tool item ───────────────────────────────────────────────────
function ToolBtn({ icon: Icon, label, onClick, accent, active, onMouseEnter, onMouseLeave, iconSize = 16 }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => { setHover(true); onMouseEnter?.() }}
      onMouseLeave={() => { setHover(false); onMouseLeave?.() }}
      title={label}
      style={{
        width: 44, height: 44, borderRadius: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
        background: active ? (accent + '18') : hover ? '#f8fafc' : 'transparent',
        border: active ? `1.5px solid ${accent}40` : '1.5px solid transparent',
        cursor: 'pointer', padding: 0,
        transition: 'background 0.12s, border-color 0.12s',
        color: active ? accent : hover ? '#334155' : '#64748b',
        fontFamily: 'system-ui',
        position: 'relative',
      }}
    >
      {typeof Icon === 'string' ? (
        <span style={{ fontSize: iconSize, lineHeight: 1 }}>{Icon}</span>
      ) : (
        <Icon size={iconSize} strokeWidth={2} />
      )}
      <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1 }}>{label}</span>
    </button>
  )
}

function Divider() {
  return <div style={{ width: 28, height: 1, background: '#e2e8f0', margin: '4px 8px' }} />
}

// ─── Shapes flyout ────────────────────────────────────────────────────────────
function ShapesFlyout({ onAdd, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', left: 66, top: '50%',
        transform: 'translateY(-30%)',
        zIndex: 200,
        background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 14, padding: '10px 8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 4, minWidth: 110,
        fontFamily: 'system-ui',
      }}
      onMouseLeave={onClose}
    >
      {ALL_SHAPES.map(s => (
        <button
          key={s.id}
          onClick={() => { onAdd(s.id); onClose() }}
          title={s.label}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, padding: '8px 4px', borderRadius: 8,
            border: '1px solid transparent', cursor: 'pointer',
            background: 'transparent', color: '#475569',
            transition: 'background 0.1s',
            fontSize: 18,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          {s.Icon ? <s.Icon size={18} strokeWidth={2} /> : <span>{s.icon}</span>}
          <span style={{ fontSize: 8, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.02em', textAlign: 'center' }}>
            {s.label}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── Formats flyout ───────────────────────────────────────────────────────────────
function FormatsFlyout({ onAdd, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', left: 66, top: '50%',
        transform: 'translateY(-30%)',
        zIndex: 200,
        background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 14, padding: '12px 10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        display: 'flex', flexDirection: 'column',
        gap: 3, minWidth: 140,
        fontFamily: 'system-ui',
      }}
      onMouseLeave={onClose}
    >
      <div style={{
        fontSize: 9, fontWeight: 700, color: '#94a3b8',
        letterSpacing: '0.06em', textTransform: 'uppercase',
        marginBottom: 4, paddingLeft: 4,
      }}>
        Formatos
      </div>
      {ALL_FORMATS.map(f => (
        <button
          key={f.id}
          onClick={() => { onAdd(f.id); onClose() }}
          title={f.description}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 8,
            border: '1px solid transparent', cursor: 'pointer',
            background: 'transparent', color: '#475569',
            transition: 'all 0.1s',
            fontSize: 11, fontWeight: 500,
            textAlign: 'left',
            width: '100%',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#f8fafc'
            e.currentTarget.style.borderColor = `${f.color}20`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = 'transparent'
          }}
        >
          <span style={{ fontSize: 16 }}>{f.icon}</span>
          <span style={{ flex: 1 }}>{f.label}</span>
          <span style={{
            fontSize: 7, fontWeight: 700, color: f.color,
            background: `${f.color}15`, padding: '2px 6px',
            borderRadius: 4, letterSpacing: '0.02em',
          }}>
            NEW
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── AI flyout ───────────────────────────────────────────────────────────────────
const AI_TOOLS = [
  { id: 'script',    icon: Pen,       label: 'Script',   color: '#6366f1' },
  { id: 'ideas',     icon: Sparkles,  label: 'Ideas',    color: '#f59e0b' },
  { id: 'repurpose', icon: RefreshCw, label: 'Repurpose',color: '#06b6d4' },
  { id: 'stories',   icon: '📱',      label: 'Stories',  color: '#8b5cf6' },
]

function AIFlyout({ onAdd, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', left: 66, top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 200,
        background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 14, padding: '10px 8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        display: 'flex', flexDirection: 'column',
        gap: 4, minWidth: 90,
        fontFamily: 'system-ui',
      }}
      onMouseLeave={onClose}
    >
      {AI_TOOLS.map(tool => (
        <button
          key={tool.id}
          onClick={() => { onAdd(tool.id); onClose() }}
          title={tool.label}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, padding: '8px 4px', borderRadius: 8,
            border: '1px solid transparent', cursor: 'pointer',
            background: 'transparent', color: tool.color,
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          {typeof tool.icon === 'string'
            ? <span style={{ fontSize: 18, lineHeight: 1 }}>{tool.icon}</span>
            : <tool.icon size={18} strokeWidth={2} />
          }
          <span style={{ fontSize: 8, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.02em', textAlign: 'center' }}>
            {tool.label}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── Config Modal ─────────────────────────────────────────────────────────────
const PROVIDER_DEFS = [
  { id: 'openai',     name: 'OpenAI',         logo: '◈', color: '#10a37f', border: '#a7f3d0', placeholder: 'sk-proj-...' },
  { id: 'anthropic',  name: 'Anthropic',      logo: '◇', color: '#c97641', border: '#fdba74', placeholder: 'sk-ant-api03-...' },
  { id: 'gemini',     name: 'Google Gemini',  logo: '✦', color: '#1a73e8', border: '#bfdbfe', placeholder: 'AIzaSy...' },
  { id: 'nano_banana', name: 'Nano Banana',   logo: '🍌', color: '#f59e0b', border: '#fcd34d', placeholder: 'nb-...' },
]

function ConfigModal({ onClose, apiKeys, setApiKeys, healthStatus, onHealthCheck, initialTab = 'config' }) {
  const [tab, setTab]           = useState(initialTab)
  const [localKeys, setLocalKeys] = useState({ ...apiKeys })
  const [show, setShow]         = useState({ openai: false, anthropic: false, gemini: false, nano_banana: false })
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    setIsSaving(true)
    try {
      await saveApiKeys(localKeys)
      setApiKeys(localKeys)
      onClose()
    } catch (error) {
      console.error('Error guardando API keys:', error)
      alert('Error al guardar las API keys. Por favor intentá de nuevo.')
    } finally {
      setIsSaving(false)
    }
  }

  const tabBtn = (id, label) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      style={{
        flex: 1, padding: '7px 0', border: 'none', cursor: 'pointer',
        borderRadius: 8, fontSize: 12, fontWeight: 600,
        background: tab === id ? '#fff' : 'transparent',
        color: tab === id ? '#0f172a' : '#94a3b8',
        boxShadow: tab === id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.15s',
      }}
    >{label}</button>
  )

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18,
      padding: '24px 28px', width: 460, maxWidth: '92vw',
      boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      fontFamily: 'system-ui', color: '#0f172a',
      maxHeight: '88vh', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>⚙ Ajustes</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 20 }}>
        {tabBtn('config', '⚙ Configuración')}
        {tabBtn('profile', '👤 Perfil')}
      </div>

      {/* ── TAB: Configuración ───────────────────────── */}
      {tab === 'config' && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 10 }}>
            CLAVES DE API
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {PROVIDER_DEFS.map(p => {
              const val = localKeys[p.id] || ''
              const filled = val.trim().length > 0
              return (
                <div key={p.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: filled ? p.color : '#64748b' }}>
                      {p.logo} {p.name}
                    </span>
                    {filled && <span style={{ fontSize: 9, color: '#16a34a', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 10, padding: '1px 6px', fontWeight: 700 }}>✓ Configurado</span>}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={show[p.id] ? 'text' : 'password'}
                      value={val}
                      onChange={e => setLocalKeys(k => ({ ...k, [p.id]: e.target.value }))}
                      placeholder={p.placeholder}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '8px 34px 8px 10px',
                        background: '#f8fafc', border: `1px solid ${filled ? p.border : '#e2e8f0'}`,
                        borderRadius: 8, fontSize: 11, fontFamily: 'monospace',
                        color: '#0f172a', outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => setShow(s => ({ ...s, [p.id]: !s[p.id] }))}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#94a3b8' }}
                    >{show[p.id] ? '🙈' : '👁'}</button>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              width: '100%', padding: '9px', marginBottom: 20,
              background: isSaving ? '#f1f5f9' : '#ede9fe',
              border: '1px solid #ddd6fe',
              borderRadius: 8,
              color: isSaving ? '#94a3b8' : '#7c3aed',
              fontSize: 12, fontWeight: 700,
              cursor: isSaving ? 'default' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
            }}
          >{isSaving ? '💾 Guardando...' : 'Guardar claves'}</button>

          <div style={{ height: 1, background: '#f1f5f9', marginBottom: 16 }} />

          {/* Backend status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>Estado del backend</span>
            {healthStatus && (
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: healthStatus.ok ? '#16a34a' : '#dc2626',
                background: healthStatus.ok ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${healthStatus.ok ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: 6, padding: '1px 8px',
              }}>
                {healthStatus.ok ? '✓ Respondiendo' : '✕ Sin respuesta'}
              </span>
            )}
          </div>
          <button
            onClick={onHealthCheck}
            style={{
              width: '100%', padding: '8px', marginBottom: 16,
              background: '#ecfeff', border: '1px solid #a5f3fc',
              borderRadius: 8, color: '#0891b2', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >Verificar conexión</button>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em' }}>INICIAR EL BACKEND</div>
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.8 }}>
              <code style={{ color: '#7c3aed', background: '#ede9fe', borderRadius: 4, padding: '1px 5px' }}>pip install -r requirements.txt</code><br />
              <code style={{ color: '#7c3aed', background: '#ede9fe', borderRadius: 4, padding: '1px 5px' }}>python3 server.py</code>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: Perfil ─────────────────────────────── */}
      {tab === 'profile' && (
        <ProfileTab onClose={onClose} />
      )}
    </div>
  )
}

function ProfileTab({ onClose }) {
  const { user, signOut } = useAuthHook()
  const [signingOut, setSigningOut] = useState(false)

  const initial = user?.email?.[0]?.toUpperCase() ?? '?'
  const name    = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuario'
  const joined  = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      window.location.reload()
    } catch (e) {
      console.error(e)
      setSigningOut(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Avatar + info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 22, fontWeight: 700,
          boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
        }}>{initial}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{name}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{user?.email}</div>
        </div>
      </div>

      {/* Info rows */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        {[
          { label: 'Email', value: user?.email },
          { label: 'Nombre', value: name },
          { label: 'Miembro desde', value: joined },
          { label: 'Plan', value: 'Gratuito' },
        ].map(({ label, value }, i, arr) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: i < arr.length - 1 ? '1px solid #e2e8f0' : 'none',
          }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        style={{
          width: '100%', padding: '10px',
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 10, color: '#dc2626',
          fontSize: 13, fontWeight: 600, cursor: signingOut ? 'not-allowed' : 'pointer',
          opacity: signingOut ? 0.6 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {signingOut ? 'Cerrando sesión...' : '🚪 Cerrar sesión'}
      </button>
    </div>
  )
}

export default function ContentCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [urlInput, setUrlInput] = useState('')
  const [backendOk, setBackendOk] = useState(null)
  const [activeCount, setActiveCount] = useState(0)
  const [showSetup,   setShowSetup]   = useState(true)
  const [showConfig,  setShowConfig]  = useState(false)
  const [configTab,   setConfigTab]   = useState('config')
  const [apiKeys,     setApiKeys]     = useState({ openai: '', anthropic: '', gemini: '', nano_banana: '' })
  const [keysLoaded,  setKeysLoaded]  = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [healthStatus, setHealthStatus] = useState(null)
  const [showShapesFlyout, setShowShapesFlyout] = useState(false)
  const [showAIFlyout, setShowAIFlyout] = useState(false)
  const [showFormatsFlyout, setShowFormatsFlyout] = useState(false)
  const [dismissedLLMHint, setDismissedLLMHint] = useState(false)

  function openConfig(tab = 'config') {
    setConfigTab(tab)
    setShowConfig(true)
  }

  // Panel lateral global de Kanban
  const [kanbanPanel, setKanbanPanel] = useState({
    visible: false,
    nodeId: null,
    card: null,
    columns: [],
    propertyDefs: [],
  })
  const processIndex = useRef(0)
  const activeUrls = useRef(new Set())
  const fileInputRef = useRef(null)
  const docIndex = useRef(0)
  const viewportRef = useRef({ x: 0, y: 0, zoom: 1 })

  // ── Board management ──────────────────────────────────────────────────────────
  const boards = useBoards(setNodes, setEdges)

  // Keep board refs current on every render so switchBoard saves latest state
  boards.nodesRef.current = nodes
  boards.edgesRef.current = edges

  // React Flow instance ref — used for fitView after board switch
  const rfRef = useRef(null)

  // ── Copy/paste ────────────────────────────────────────────────────────────────
  useCopyPaste(nodes, edges, setNodes, setEdges)

  // ── Cargar API keys al montar ─────────────────────────────────────────────────────
  useEffect(() => {
    async function loadKeys() {
      try {
        const keys = await loadApiKeysAsync()
        setApiKeys(keys)

        // Verificar si hay alguna key configurada
        const hasKey = !!(keys.openai || keys.anthropic || keys.gemini || keys.nano_banana)
        setShowSetup(!hasKey)
      } catch (error) {
        console.error('Error cargando API keys:', error)
      } finally {
        setKeysLoaded(true)
      }
    }
    loadKeys()
  }, [])

  // Returns the flow-coordinate center of the visible canvas area.
  // Formula: flowPos = (screenPos - viewport.x) / viewport.zoom
  function getViewportCenter() {
    const { x, y, zoom } = viewportRef.current
    // Account for left toolbar (~66px) and top bar (~68px)
    const screenCX = (window.innerWidth  + 66) / 2
    const screenCY = (window.innerHeight + 68) / 2
    return {
      x: (screenCX - x) / zoom,
      y: (screenCY - y) / zoom,
    }
  }

  // Auto-save current board to Supabase on every nodes/edges change (debounced 1.5s).
  // Guard: skip until useBoards has finished loading the initial board from Supabase.
  useEffect(() => {
    if (!boards.isLoaded || !boards.currentBoardId) return

    const timeoutId = setTimeout(() => {
      boards.saveCurrentBoard(boards.currentBoardId, nodes, edges)
    }, 1500)

    return () => clearTimeout(timeoutId)
  }, [nodes, edges, boards.currentBoardId, boards.isLoaded])

  // fitView after board switch (skip first mount — ReactFlow's fitView prop handles that)
  const boardSwitchMountRef = useRef(true)
  useEffect(() => {
    if (boardSwitchMountRef.current) { boardSwitchMountRef.current = false; return }
    const timer = setTimeout(() => rfRef.current?.fitView({ padding: 0.2 }), 60)
    return () => clearTimeout(timer)
  }, [boards.currentBoardId])

  useEffect(() => {
    checkHealth().then(h => setBackendOk(h.ok))
    const cfg = loadConfig()
    if (cfg.apiKey) setApiKeyInput(cfg.apiKey)

    // Escuchar eventos del panel de Kanban
    const handleOpenKanbanPanel = (e) => {
      const { nodeId, card, columns, propertyDefs = [] } = e.detail
      setKanbanPanel({
        visible: true,
        nodeId,
        card,
        columns,
        propertyDefs,
      })
    }

    window.addEventListener('open-kanban-panel', handleOpenKanbanPanel)

    // Handler para agregar nodos generados
    const handleAddGeneratedNodes = (e) => {
      const { nodes: newNodes, edges: newEdges } = e.detail
      setNodes(prev => [...prev, ...newNodes])
      setEdges(prev => [...prev, ...newEdges])
    }

    window.addEventListener('add-generated-nodes', handleAddGeneratedNodes)

    return () => {
      window.removeEventListener('open-kanban-panel', handleOpenKanbanPanel)
      window.removeEventListener('add-generated-nodes', handleAddGeneratedNodes)
    }
  }, [])

  const onConnect = useCallback(
    (params) => setEdges(eds => addEdge({ ...params, ...edgeDefaults }, eds)),
    [setEdges]
  )

  async function processUrl(url) {
    const trimmed = url.trim()
    if (!trimmed) return

    // Check if it's a profile URL
    const profilePlatform = isProfileUrl(trimmed)
    if (profilePlatform) {
      const username = extractUsernameFromProfile(trimmed)
      const idx = processIndex.current++
      const nodeId = `profile-${Date.now()}`

      const c = getViewportCenter()
    const newNode = {
        id: nodeId,
        type: 'profileAnalysisNode',
        position: { x: c.x - 190 + (idx % 2) * 40, y: c.y - 260 + (idx % 2) * 40 },
        style: { width: 380, height: 520 },
        zIndex: 1,
        data: {
          platform: profilePlatform,
          username: username,
          amount: 10,
          state: 'idle',
          error: null,
          progress: { current: 0, total: 10, message: '' },
          profile: {},
          videoItems: [],
        },
      }
      setNodes(prev => [...prev, newNode])
      return
    }

    // Original video URL processing
    if (!isVideoUrl(trimmed)) return
    if (activeUrls.current.has(trimmed)) { alert('Este link ya está en el canvas.'); return }
    activeUrls.current.add(trimmed)

    const platform = detectPlatform(trimmed)
    const idx = processIndex.current++
    const nodeId = `vt-${Date.now()}`

    const c = getViewportCenter()
    const newNode = {
      id: nodeId,
      type: 'videoTranscriptNode',
      position: { x: c.x - 140 + (idx % 4) * 20, y: c.y - 70 + (idx % 4) * 20 },
      data: { url: trimmed, platform, title: null, state: 'procesando', transcript: null, language: null, source: null, error: null, onLoadManual: null },
    }
    setNodes(prev => [...prev, newNode])
    setActiveCount(c => c + 1)

    fetch(`https://noembed.com/embed?url=${encodeURIComponent(trimmed)}`)
      .then(r => r.json())
      .then(d => {
        if (d.title || d.thumbnail_url) setNodes(prev => prev.map(n =>
          n.id === nodeId ? { ...n, data: { ...n.data, title: d.title || n.data.title, thumbnail: d.thumbnail_url || n.data.thumbnail } } : n
        ))
      }).catch(() => {})

    try {
      const result = await transcribeUrl(trimmed)
      setBackendOk(true)
      setNodes(prev => prev.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, state: 'listo', transcript: result.transcript, language: result.language, source: result.source, onLoadManual: null } } : n
      ))
    } catch (err) {
      setBackendOk(false)
      setNodes(prev => prev.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, state: 'error', error: err.message, onLoadManual: (id, text) => handleLoadManual(id, text) } } : n
      ))
    } finally {
      setActiveCount(c => Math.max(0, c - 1))
    }
  }

  function handleLoadManual(nodeId, text) {
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, state: 'listo', transcript: text, language: null, source: 'Manual', error: null, onLoadManual: null } } : n
    ))
  }

  function spawnDocumentNode(name, type, url = null) {
    const nodeId = `doc-${Date.now()}`
    const idx = docIndex.current++
    const c = getViewportCenter()
    const newNode = {
      id: nodeId, type: 'documentNode',
      position: { x: c.x - 120 + idx * 16, y: c.y - 80 + idx * 16 },
      data: { name, type, url, state: 'extracting', text: null, pages: null, error: null },
    }
    setNodes(prev => [...prev, newNode])
    return nodeId
  }

  async function processDocumentFile(file) {
    const ext = file.name.split('.').pop().toLowerCase()
    const type = ext === 'pdf' ? 'pdf' : ext === 'md' ? 'md' : ext === 'csv' ? 'csv' : 'txt'
    const nodeId = spawnDocumentNode(file.name, type)
    try {
      const res = await extractDocumentFile(file)
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, state: 'listo', text: res.text, pages: res.pages ?? null } } : n))
    } catch (err) {
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, state: 'error', error: err.message } } : n))
    }
  }

  async function processGoogleDocUrl(url) {
    const nodeId = spawnDocumentNode('Google Doc', 'gdoc', url)
    try {
      const res = await extractGoogleDoc(url)
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, state: 'listo', text: res.text, name: res.name || 'Google Doc' } } : n))
    } catch (err) {
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, state: 'error', error: err.message } } : n))
    }
  }

  function addTextNode() {
    const id = `text-${Date.now()}`
    const n = nodes.filter(n => n.type === 'textNode').length
    const c = getViewportCenter()
    setNodes(prev => [...prev, {
      id, type: 'textNode',
      position: { x: c.x - 140 + n * 16, y: c.y - 60 + n * 16 },
      style: { width: 280, height: 120 },
      data: { text: '', html: '' },
    }])
  }

  function addStickyNote() {
    const id = `sticky-${Date.now()}`
    const n = nodes.filter(n => n.type === 'stickyNoteNode').length
    const c = getViewportCenter()
    setNodes(prev => [...prev, {
      id, type: 'stickyNoteNode',
      position: { x: c.x - 110 + n * 16, y: c.y - 100 + n * 16 },
      style: { width: 220, height: 200 },
      data: { text: '', colorId: ['yellow','pink','green','blue','orange','purple'][n % 6] },
    }])
  }

  function addShape(shape = 'rect') {
    const id = `shape-${Date.now()}`
    const n = nodes.filter(n => n.type === 'shapeNode').length
    const c = getViewportCenter()
    setNodes(prev => [...prev, {
      id, type: 'shapeNode',
      position: { x: c.x - 80 + n * 16, y: c.y - 50 + n * 16 },
      style: { width: 160, height: 100 },
      data: { text: '', shape, colorId: 'white' },
    }])
  }

  function addFormat(formatId) {
    const id = `format-${Date.now()}`
    const n = nodes.filter(n => n.type === 'formatNode').length
    const c = getViewportCenter()

    // Configuración simple y directa como Miro
    const formatConfig = {
      'table': {
        width: 600,
        height: 400,
        title: 'Tabla',
        format: 'table',
        columns: ['Tarea', 'Estado', 'Prioridad', 'Fecha'],
        rows: [
          ['Diseñar mockup', 'En progreso', 'Alta', '2025-01-20'],
          ['Revisar con cliente', 'Pendiente', 'Media', '2025-01-21'],
          ['Implementar frontend', 'Pendiente', 'Alta', '2025-01-22'],
          ['', '', '', ''],
        ],
        style: 'miro'
      },
      'kanban': {
        width: 800,
        height: 500,
        title: 'Kanban Board',
        format: 'kanban',
        columns: ['Por hacer', 'En progreso', 'Revisión', 'Completado'],
        cards: {
          'Por hacer': [],
          'En progreso': [],
          'Revisión': [],
          'Completado': [],
        },
        style: 'miro'
      },
      'document': {
        width: 500,
        height: 600,
        title: 'Documento',
        format: 'document',
        content: '',
        style: 'miro'
      },
      'calendar': {
        width: 500,
        height: 450,
        title: 'Calendario',
        format: 'calendar',
        month: new Date().getMonth(),
        year: new Date().getFullYear(),
        events: [
          { id: '1', date: new Date().toISOString(), title: 'Reunión equipo', description: 'Sprint planning' },
        ],
        style: 'miro'
      },
      'timeline': {
        width: 450,
        height: 500,
        title: 'Timeline',
        format: 'timeline',
        events: [
          { id: '1', date: new Date().toISOString(), title: 'Kickoff proyecto', description: 'Inicio del desarrollo' },
          { id: '2', date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), title: 'MVP v1', description: 'Primera versión funcional' },
        ],
        style: 'miro'
      },
    }

    const config = formatConfig[formatId] || formatConfig['table']

    setNodes(prev => [...prev, {
      id,
      type: 'formatNode',
      position: { x: c.x - config.width/2 + n * 16, y: c.y - config.height/2 + n * 16 },
      style: { width: config.width, height: config.height },
      data: config,
    }])
  }

  function addGroupNode() {
    const id = `group-${Date.now()}`
    const n = nodes.filter(n => n.type === 'groupNode').length
    const c = getViewportCenter()
    setNodes(prev => [{
      id, type: 'groupNode',
      position: { x: c.x - 310 + n * 20, y: c.y - 190 + n * 20 },
      style: { width: 620, height: 380 },
      zIndex: -1,
      data: { title: 'Nueva colección', colorId: 'indigo' },
    }, ...prev])
  }

  async function handlePastedImage(file) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const originalImageData = e.target.result

      // Compress image before storing
      const compressedImage = await compressImage(originalImageData)

      const nodeId = `image-${Date.now()}`

      const c = getViewportCenter()
      const newNode = {
        id: nodeId,
        type: 'imageAnalysisNode',
        position: { x: c.x - 100, y: c.y - 100 },
        data: {
          image: compressedImage,
          state: 'analyzing',
          analysis: null,
          error: null,
        },
      }

      setNodes(prev => [...prev, newNode])

      // Analyze the image (use compressed version for API too)
      analyzeImage(compressedImage, file.name || 'imagen.png')
        .then(result => {
          setNodes(prev => prev.map(n =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, state: 'ready', analysis: result.analysis } }
              : n
          ))
        })
        .catch(err => {
          setNodes(prev => prev.map(n =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, state: 'error', error: err.message } }
              : n
          ))
        })
    }
    reader.readAsDataURL(file)
  }

  function addLLMNode() {
    const id = `llm-${Date.now()}`
    const c = getViewportCenter()
    setNodes(prev => [...prev, {
      id, type: 'llmNode',
      position: { x: c.x - 310, y: c.y - 250 },
      style: { width: 620, height: 500 },
      data: {},
    }])
  }

  function addImageGenerationNode() {
    const id = `imggen-${Date.now()}`
    const c = getViewportCenter()
    setNodes(prev => [...prev, {
      id, type: 'imageGenerationNode',
      position: { x: c.x - 200, y: c.y - 200 },
      data: {
        prompt: '',
        model: 'dall-e-2',
        count: 1,
        size: '1024x1024',
        state: 'idle',
        generatedImages: [],
        error: null,
        position: { x: c.x - 200, y: c.y - 200 }
      },
    }])
  }

  function addBrandVoiceNode() {
    const id = `bv-${Date.now()}`
    const n = nodes.filter(n => n.type === 'brandVoiceNode').length
    const c = getViewportCenter()
    setNodes(prev => [...prev, {
      id, type: 'brandVoiceNode',
      position: { x: c.x - 150 + n * 16, y: c.y - 50 + n * 16 },
      data: { state: 'uninitialized', error: null, personName: 'BrandVoice', personHandle: '', personAvatar: null, platform: '', transcripts: [], brandVoice: null },
    }])
  }

  function addAITool(toolId) {
    if (toolId === 'script') {
      const id = `script-${Date.now()}`
      const n = nodes.filter(n => n.type === 'scriptNode').length
      const c = getViewportCenter()
      setNodes(prev => [...prev, {
        id, type: 'scriptNode',
        position: { x: c.x - 120 + n * 16, y: c.y - 40 + n * 16 },
        data: { state: 'idle', platform: 'tiktok', format: 'reel', duration: '30s', goal: 'entretener', topic: '', error: null },
      }])
    } else if (toolId === 'ideas') {
      const id = `ideas-${Date.now()}`
      const n = nodes.filter(n => n.type === 'ideasNode').length
      const c = getViewportCenter()
      setNodes(prev => [...prev, {
        id, type: 'ideasNode',
        position: { x: c.x - 180 + n * 16, y: c.y - 210 + n * 16 },
        style: { width: 360, height: 420 },
        data: { state: 'idle', quantity: 10, platform: 'all', format: 'all', ideas: [], error: null },
      }])
    } else if (toolId === 'repurpose') {
      addRepurposingNode()
    } else if (toolId === 'stories') {
      addStoryFlowNode()
    }
  }

  function addScriptNode() {
    const id = `script-${Date.now()}`
    const n = nodes.filter(n => n.type === 'scriptNode').length
    const c = getViewportCenter()
    setNodes(prev => [...prev, {
      id, type: 'scriptNode',
      position: { x: c.x - 120 + n * 16, y: c.y - 40 + n * 16 },
      data: { state: 'idle', platform: 'tiktok', format: 'reel', duration: '30s', goal: 'entretener', topic: '', error: null },
    }])
  }

  function addIdeasNode() {
    const id = `ideas-${Date.now()}`
    const n = nodes.filter(n => n.type === 'ideasNode').length
    const c = getViewportCenter()
    setNodes(prev => [...prev, {
      id, type: 'ideasNode',
      position: { x: c.x - 180 + n * 16, y: c.y - 210 + n * 16 },
      style: { width: 360, height: 420 },
      data: { state: 'idle', quantity: 10, platform: 'all', format: 'all', ideas: [], error: null },
    }])
  }

  function addRepurposingNode() {
    const id = `repurpose-${Date.now()}`
    const n = nodes.filter(n => n.type === 'repurposingNode').length
    const c = getViewportCenter()
    setNodes(prev => [...prev, {
      id, type: 'repurposingNode',
      position: { x: c.x - 180 + n * 16, y: c.y - 190 + n * 16 },
      style: { width: 360, height: 380 },
      data: { state: 'idle', formats: { captionIG: true, hiloX: true, email: false, carruselOutline: true, shortClipIdea: true, linkedinPost: false }, outputs: {}, error: null },
    }])
  }

  // ── Kanban Panel handlers ─────────────────────────────────────────────────────

  // Find and update a card by ID across all columns
  function updateCardInNode(nds, nodeId, cardId, updater) {
    return nds.map(n => {
      if (n.id !== nodeId || !n.data.cards) return n
      const newCards = {}
      for (const [col, arr] of Object.entries(n.data.cards)) {
        newCards[col] = arr.map(c => c.id === cardId ? updater(c) : c)
      }
      return { ...n, data: { ...n.data, cards: newCards } }
    })
  }

  const handleUpdateCard = useCallback((cardId, updates) => {
    if (!kanbanPanel.nodeId) return
    setNodes(nds => updateCardInNode(nds, kanbanPanel.nodeId, cardId, c => ({ ...c, ...updates })))
    setKanbanPanel(prev => ({ ...prev, card: { ...prev.card, ...updates } }))
  }, [kanbanPanel.nodeId, setNodes])

  const handleDeleteCard = useCallback((cardId) => {
    if (!kanbanPanel.nodeId) return
    setNodes(nds => nds.map(n => {
      if (n.id !== kanbanPanel.nodeId || !n.data.cards) return n
      const newCards = {}
      for (const [col, arr] of Object.entries(n.data.cards)) {
        newCards[col] = arr.filter(c => c.id !== cardId)
      }
      return { ...n, data: { ...n.data, cards: newCards } }
    }))
  }, [kanbanPanel.nodeId, setNodes])

  const handleMoveToColumn = useCallback((cardId, newColumn) => {
    if (!kanbanPanel.nodeId) return
    setNodes(nds => nds.map(n => {
      if (n.id !== kanbanPanel.nodeId || !n.data.cards) return n
      // Find card across all columns
      let cardObj = null
      let oldColumn = null
      for (const [col, arr] of Object.entries(n.data.cards)) {
        const found = arr.find(c => c.id === cardId)
        if (found) { cardObj = found; oldColumn = col; break }
      }
      if (!cardObj || oldColumn === newColumn) return n
      const newCards = {}
      for (const [col, arr] of Object.entries(n.data.cards)) {
        newCards[col] = col === oldColumn ? arr.filter(c => c.id !== cardId) : [...arr]
      }
      if (!newCards[newColumn]) newCards[newColumn] = []
      newCards[newColumn] = [...newCards[newColumn], { ...cardObj, status: newColumn }]
      return { ...n, data: { ...n.data, cards: newCards } }
    }))
    setKanbanPanel(prev => ({ ...prev, card: { ...prev.card, status: newColumn, column: newColumn } }))
  }, [kanbanPanel.nodeId, setNodes])

  // ── Property Def handlers (board-level, stored on FormatNode data) ────────────
  const handleAddPropertyDef = useCallback((def) => {
    if (!kanbanPanel.nodeId) return
    setNodes(nds => nds.map(n => {
      if (n.id !== kanbanPanel.nodeId) return n
      const existing = n.data.propertyDefs || []
      return { ...n, data: { ...n.data, propertyDefs: [...existing, def] } }
    }))
    setKanbanPanel(prev => ({
      ...prev,
      propertyDefs: [...(prev.propertyDefs || []), def],
    }))
  }, [kanbanPanel.nodeId, setNodes])

  const handleUpdatePropertyDef = useCallback((defId, updatedDef) => {
    if (!kanbanPanel.nodeId) return
    setNodes(nds => nds.map(n => {
      if (n.id !== kanbanPanel.nodeId) return n
      const existing = n.data.propertyDefs || []
      return { ...n, data: { ...n.data, propertyDefs: existing.map(d => d.id === defId ? updatedDef : d) } }
    }))
    setKanbanPanel(prev => ({
      ...prev,
      propertyDefs: (prev.propertyDefs || []).map(d => d.id === defId ? updatedDef : d),
    }))
  }, [kanbanPanel.nodeId, setNodes])

  const handleDeletePropertyDef = useCallback((defId) => {
    if (!kanbanPanel.nodeId) return
    setNodes(nds => nds.map(n => {
      if (n.id !== kanbanPanel.nodeId) return n
      const existing = n.data.propertyDefs || []
      return { ...n, data: { ...n.data, propertyDefs: existing.filter(d => d.id !== defId) } }
    }))
    setKanbanPanel(prev => ({
      ...prev,
      propertyDefs: (prev.propertyDefs || []).filter(d => d.id !== defId),
    }))
  }, [kanbanPanel.nodeId, setNodes])

  function addStoryFlowNode() {
    const id = `story-${Date.now()}`
    const n = nodes.filter(n => n.type === 'storyFlowNode').length
    const c = getViewportCenter()
    setNodes(prev => [...prev, {
      id, type: 'storyFlowNode',
      position: { x: c.x - 130 + n * 16, y: c.y - 65 + n * 16 },
      data: {
        state: 'idle', error: null,
        objective: 'warm_up_before_reel', length: '5',
        awareness: 'warm', tone: 'casual',
        ctaType: 'watch_reel', storyFormat: 'mixed',
        outputStyle: 'creator_friendly', topic: '',
      },
    }])
  }

  // Drag video into/out of a group
  const onNodeDragStop = useCallback((_, draggedNode) => {
    if (draggedNode.type !== 'videoTranscriptNode' && draggedNode.type !== 'imageAnalysisNode') return

    let absX = draggedNode.position.x
    let absY = draggedNode.position.y
    if (draggedNode.parentId) {
      const parent = nodes.find(n => n.id === draggedNode.parentId)
      if (parent) { absX += parent.position.x; absY += parent.position.y }
    }

    // Estimate node dimensions based on type
    let nodeW, nodeH
    if (draggedNode.type === 'imageAnalysisNode') {
      nodeW = 280
      nodeH = draggedNode.data.image ? 400 : 200
    } else {
      nodeW = draggedNode.data.compact ? 220 : 280
      nodeH = draggedNode.data.compact ? 70 : 140
    }

    const cx = absX + nodeW / 2
    const cy = absY + nodeH / 2

    let newGroupId = null
    for (const n of nodes) {
      if (n.type !== 'groupNode') continue
      const gw = n.style?.width || 500
      const gh = n.style?.height || 340
      if (cx >= n.position.x && cx <= n.position.x + gw && cy >= n.position.y && cy <= n.position.y + gh) {
        newGroupId = n.id; break
      }
    }

    const currentGroupId = draggedNode.parentId || null
    if (newGroupId === currentGroupId) return

    setNodes(prev => {
      let updated = prev.map(n => {
        if (n.id !== draggedNode.id) return n
        if (newGroupId) {
          return { ...n, parentId: newGroupId, position: { x: 10, y: 50 }, data: { ...n.data, groupId: newGroupId, compact: true } }
        } else {
          return { ...n, parentId: undefined, position: { x: absX, y: absY }, data: { ...n.data, groupId: null, compact: false } }
        }
      })
      if (newGroupId) updated = layoutGroupChildren(updated, newGroupId)
      if (currentGroupId && currentGroupId !== newGroupId) updated = layoutGroupChildren(updated, currentGroupId)
      return updated
    })
  }, [nodes, setNodes])

  // Global paste
  useEffect(() => {
    const handler = e => {
      const active = document.activeElement
      if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return

      // Check for image paste first
      const items = e.clipboardData?.items
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            e.preventDefault()
            const file = item.getAsFile()
            if (file) {
              handlePastedImage(file)
            }
            return
          }
        }
      }

      // Then check for URL paste
      const text = (e.clipboardData?.getData('text') || '').trim()
      if (isVideoUrl(text)) { e.preventDefault(); processUrl(text) }
      else if (isGoogleDocsUrl(text)) { e.preventDefault(); processGoogleDocUrl(text) }
    }
    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [])

  const handleSubmitUrl = useCallback(() => {
    const val = urlInput.trim()
    if (!val) return
    if (isGoogleDocsUrl(val)) processGoogleDocUrl(val)
    else processUrl(val)
    setUrlInput('')
  }, [urlInput])

  const handleClearCanvas = useCallback(() => {
    if (!window.confirm('¿Limpiar todo el canvas? Esta acción no se puede deshacer.')) return
    setNodes([]); setEdges([])
    boards.clearBoard(boards.currentBoardId)
    processIndex.current = 0; activeUrls.current = new Set()
  }, [boards, setNodes, setEdges])

  const handleHealthCheck = useCallback(async () => {
    const h = await checkHealth()
    setHealthStatus(h); setBackendOk(h.ok)
  }, [])

  const urlVal = urlInput.trim()
  const validInput = urlVal && (isVideoUrl(urlVal) || isGoogleDocsUrl(urlVal) || isProfileUrl(urlVal))
  const urlInputLabel = isGoogleDocsUrl(urlVal) ? '+ Doc' : isProfileUrl(urlVal) ? '+ Perfil' : '+ Video'
  const transcriptCount = useMemo(() => nodes.filter(n =>
    (n.type === 'videoTranscriptNode' || n.type === 'documentNode') && n.data.state === 'listo'
  ).length, [nodes])

  // Handlers para ReactFlow
  const handleViewportMove = useCallback((_, vp) => { viewportRef.current = vp }, [])
  const handleViewportMoveEnd = useCallback((_, vp) => { viewportRef.current = vp }, [])

  // ── Early return: Setup screen if no API keys (DESPUÉS de todos los hooks) ─────────────
  if (showSetup) {
    return <SetupScreen onComplete={() => { setApiKeys(loadApiKeys()); setShowSetup(false) }} />
  }

  // ── Main canvas render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f1f5f9' }}>
      <BoardTabs
        boards={boards.boards}
        currentBoardId={boards.currentBoardId}
        onSwitch={boards.switchBoard}
        onCreate={() => boards.createBoard()}
        onRename={boards.renameBoard}
        onDelete={boards.deleteBoard}
      />

      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onInit={rf => { viewportRef.current = rf.getViewport(); rfRef.current = rf }}
        onMove={handleViewportMove}
        onMoveEnd={handleViewportMoveEnd}
        panOnDrag={[2]}
        selectionOnDrag={true}
        onContextMenu={e => e.preventDefault()}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1} maxZoom={2}
        defaultEdgeOptions={edgeDefaults}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(0,0,0,0.08)" />
        <Controls />
      </ReactFlow>

      {/* ── SERVER STATUS DOT (Top Right) ── */}
      <div
        style={{
          position: 'fixed', top: 58, right: 16,
          zIndex: 100,
        }}
        title={`Servidor: ${backendOk === null ? 'Verificando…' : backendOk ? 'Conectado' : 'Desconectado'}`}
      >
        <span style={{
          width: 10, height: 10, borderRadius: '50%', display: 'inline-block',
          background: backendOk === null ? '#94a3b8' : backendOk ? '#22c55e' : '#ef4444',
          boxShadow: backendOk ? '0 0 10px #22c55e' : 'none',
          transition: 'background 0.3s, box-shadow 0.3s',
        }} />
      </div>

      {/* ── BOTTOM LEFT BUTTONS ── */}
      <div style={{
        position: 'fixed', bottom: 16, left: 16,
        zIndex: 100,
        display: 'flex', gap: 8,
        fontFamily: 'system-ui',
      }}>
        {/* File upload button (clip icon) */}
        <input
          ref={fileInputRef}
          type="file" accept=".pdf,.txt,.md,.csv" multiple style={{ display: 'none' }}
          onChange={e => { Array.from(e.target.files || []).forEach(f => processDocumentFile(f)); e.target.value = '' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
            padding: '12px 16px', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.09)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
            color: '#475569',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
          title="Subir PDF, TXT, MD o CSV"
        >
          <Paperclip size={18} strokeWidth={2} />
        </button>

        {/* Token meter */}
        <TokenMeter />

        {/* Settings button */}
        <button
          onClick={() => openConfig('config')}
          style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
            padding: '12px 16px', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.09)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
            color: '#475569',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
          title="Configuración"
        >
          <Settings size={18} strokeWidth={2} />
        </button>

        {/* Clear canvas button */}
        {nodes.length > 0 && (
          <button
            onClick={handleClearCanvas}
            style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
              padding: '12px 16px', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.09)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
              color: '#dc2626',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
            title="Limpiar canvas"
          >
            <Trash2 size={18} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* ── LEFT TOOLBAR (Miro-style) ── */}
      <div style={{
        position: 'fixed', left: 12, top: '50%', transform: 'translateY(-50%)',
        zIndex: 101,
        background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 16, padding: '8px 6px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.09)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        fontFamily: 'system-ui',
      }}>
        {/* Sticky notes */}
        <ToolBtn icon={StickyNote} label="Nota" onClick={addStickyNote} accent="#f59e0b" />

        {/* Shapes — single button → flyout */}
        <ToolBtn
          icon={Square}
          label="Formas"
          accent="#6366f1"
          active={showShapesFlyout}
          onClick={() => setShowShapesFlyout(v => !v)}
          onMouseEnter={() => setShowShapesFlyout(true)}
        />

        <Divider />

        {/* Content nodes */}
        <ToolBtn icon={Pen} label="Texto" onClick={addTextNode} accent="#f59e0b" />
        <ToolBtn icon={FolderOpen} label="Colección" onClick={addGroupNode} accent="#6366f1" />

        {/* Formats — single button → flyout */}
        <ToolBtn
          icon={TableIcon}
          label="Formatos"
          accent="#10b981"
          active={showFormatsFlyout}
          onClick={() => setShowFormatsFlyout(v => !v)}
          onMouseEnter={() => setShowFormatsFlyout(true)}
        />

        <Divider />

        {/* AI */}
        <ToolBtn
          icon={Sparkles}
          label="LLM"
          onClick={addLLMNode}
          accent="#7c3aed"
          active={transcriptCount > 0 && !nodes.some(n => n.type === 'llmNode')}
        />
        <ToolBtn
          icon={Wand2}
          label="Generar Img"
          onClick={addImageGenerationNode}
          accent="#ec4899"
        />
        <ToolBtn
          icon={Crosshair}
          label="BrandVoice"
          onClick={addBrandVoiceNode}
          accent="#8b5cf6"
        />

        <Divider />

        {/* AI tools — single button → flyout */}
        <ToolBtn
          icon={Brain}
          label="IA"
          accent="#7c3aed"
          active={showAIFlyout}
          onClick={() => setShowAIFlyout(v => !v)}
          onMouseEnter={() => setShowAIFlyout(true)}
        />
      </div>

      {/* Shapes flyout */}
      {showShapesFlyout && (
        <ShapesFlyout
          onAdd={shape => addShape(shape)}
          onClose={() => setShowShapesFlyout(false)}
        />
      )}

      {/* Formats flyout */}
      {showFormatsFlyout && (
        <FormatsFlyout
          onAdd={format => addFormat(format)}
          onClose={() => setShowFormatsFlyout(false)}
        />
      )}

      {/* AI flyout */}
      {showAIFlyout && (
        <AIFlyout
          onAdd={tool => addAITool(tool)}
          onClose={() => setShowAIFlyout(false)}
        />
      )}

      {/* Empty state */}
      {nodes.length === 0 && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none', zIndex: 1,
        }}>
          <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.15 }}>◈</div>
          <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.2)', fontFamily: 'system-ui', fontWeight: 600, marginBottom: 6 }}>
            Canvas vacío
          </div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.15)', fontFamily: 'system-ui', lineHeight: 1.6 }}>
            Pegá links de videos o imágenes con Ctrl+V<br />
            También podés usar las herramientas de la barra lateral
          </div>
        </div>
      )}

      {/* Workflow hint */}
      {transcriptCount > 0 && !nodes.some(n => n.type === 'llmNode') && !dismissedLLMHint && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, background: '#fff', border: '1px solid #ddd6fe',
          borderRadius: 12, padding: '10px 16px',
          boxShadow: '0 4px 16px rgba(99,102,241,0.15)',
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: 'system-ui', fontSize: 12, color: '#334155',
          pointerEvents: 'auto',
        }}>
          <Lightbulb size={16} strokeWidth={2} style={{ color: '#f59e0b' }} />
          <span>
            {transcriptCount} video{transcriptCount > 1 ? 's' : ''} listo{transcriptCount > 1 ? 's' : ''} — añadí un{' '}
            <strong style={{ color: '#6366f1' }}>Nodo LLM</strong> desde la barra lateral
          </span>
          <button
            onClick={() => setDismissedLLMHint(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
              padding: 0,
              marginLeft: 4,
              borderRadius: 4,
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
            title="Ocultar sugerencia"
          >
            ✕
          </button>
        </div>
      )}

      {/* Config Modal */}
      {showConfig && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(15,23,42,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowConfig(false) }}
        >
          <ConfigModal
            onClose={() => setShowConfig(false)}
            apiKeys={apiKeys}
            setApiKeys={setApiKeys}
            healthStatus={healthStatus}
            onHealthCheck={handleHealthCheck}
            initialTab={configTab}
          />
        </div>
      )}

      {/* Kanban Side Panel - Global */}
      <KanbanSidePanel
        visible={kanbanPanel.visible}
        card={kanbanPanel.card}
        columns={kanbanPanel.columns}
        propertyDefs={kanbanPanel.propertyDefs || []}
        onClose={() => setKanbanPanel({ visible: false, nodeId: null, card: null, columns: [], propertyDefs: [] })}
        onUpdate={handleUpdateCard}
        onDelete={handleDeleteCard}
        onMoveToColumn={handleMoveToColumn}
        onAddPropertyDef={handleAddPropertyDef}
        onUpdatePropertyDef={handleUpdatePropertyDef}
        onDeletePropertyDef={handleDeletePropertyDef}
      />
    </div>
  )
}
