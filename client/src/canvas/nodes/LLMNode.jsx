import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { Handle, Position, useReactFlow, NodeResizer, NodeToolbar } from '@xyflow/react'
import { runLLM, extractDocumentFile, extractGoogleDoc, isGoogleDocsUrl } from '../utils/api'
import Markdown from './Markdown'
import { ChevronLeft, ChevronRight, Link as LinkIcon, FileText, Settings } from 'lucide-react'
import ModelSel from '../components/ModelSel'
import PromptEditor from '../components/PromptEditor'
import { getDefaultModel, supportsReasoning, REASONING_LEVELS } from '../utils/models'
import { loadApiKeys } from '../utils/storage'

const ACCENT = '#6366f1'

// ── Sub-components ─────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 12px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%', background: '#cbd5e1',
          animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
          display: 'inline-block',
        }} />
      ))}
    </div>
  )
}

function MessageBubble({ msg }) {
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)

  function copyToClipboard() {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <div style={{
          background: '#0f172a', color: '#f8fafc',
          borderRadius: '14px 14px 3px 14px',
          padding: '8px 12px', maxWidth: '80%',
          fontSize: 11, lineHeight: 1.6, wordBreak: 'break-word',
          userSelect: 'text',
        }}>
          {msg.content}
        </div>
      </div>
    )
  }
  if (msg.role === 'error') {
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{
          background: '#fef2f2', color: '#dc2626',
          border: '1px solid #fecaca',
          borderRadius: '3px 14px 14px 14px',
          padding: '8px 12px', maxWidth: '90%',
          fontSize: 11, lineHeight: 1.6,
          userSelect: 'text',
        }}>
          {msg.content}
        </div>
      </div>
    )
  }
  return (
    <div
      style={{ marginBottom: 10, position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0',
        borderRadius: '3px 14px 14px 14px',
        padding: '10px 12px', maxWidth: '92%',
        userSelect: 'text',
      }}>
        <Markdown fontSize={11}>{msg.content}</Markdown>
      </div>
      {hovered && (
        <button
          onClick={copyToClipboard}
          title="Copiar respuesta"
          style={{
            position: 'absolute', bottom: -6, right: 0,
            background: copied ? '#f0fdf4' : '#fff',
            border: `1px solid ${copied ? '#bbf7d0' : '#e2e8f0'}`,
            borderRadius: 6, cursor: 'pointer',
            color: copied ? '#16a34a' : '#94a3b8',
            fontSize: 9, fontWeight: 600, fontFamily: 'system-ui',
            padding: '2px 7px', lineHeight: 1.6,
            transition: 'all 0.15s',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          }}
        >
          {copied ? '✓ Copiado' : '⎘ Copiar'}
        </button>
      )}
    </div>
  )
}

function ConversationItem({ conv, active, onSelect, onDelete }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px', cursor: 'pointer', borderRadius: 7,
        margin: '2px 6px',
        background: active ? `${ACCENT}12` : hover ? '#f1f5f9' : 'none',
        transition: 'background 0.1s',
      }}
    >
      <span style={{
        flex: 1, fontSize: 11, color: active ? ACCENT : '#334155',
        fontWeight: active ? 600 : 400,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}>
        {conv.title || 'Nueva conversación'}
      </span>
      {(hover || active) && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94a3b8', fontSize: 11, padding: '0 2px', lineHeight: 1,
            borderRadius: 4, flexShrink: 0,
          }}
          title="Eliminar conversación"
        >✕</button>
      )}
    </div>
  )
}

function EmptyState({ connected }) {
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none', textAlign: 'center', padding: '20px 24px',
    }}>
      <div style={{ fontSize: 28, opacity: 0.12, marginBottom: 10 }}>✦</div>
      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
        {connected > 0
          ? <>Tenés <strong style={{ color: ACCENT }}>{connected} video{connected > 1 ? 's' : ''}</strong> conectado{connected > 1 ? 's' : ''}.<br />Empezá preguntando algo.</>
          : <>Conectá videos o colecciones al nodo<br />y empezá a conversar.</>
        }
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

function initConversations(data) {
  if (data.conversations?.length > 0) return data.conversations
  return [{ id: `conv-${Date.now()}`, title: 'Nueva conversación', messages: [], createdAt: Date.now() }]
}

function LLMNode({ id, data, selected }) {
  const { getNodes, getEdges, setNodes, deleteElements } = useReactFlow()
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const nodeRef = useRef(null)

  // Block React Flow zoom when wheel is used inside this node.
  // React Flow uses native DOM listeners (@use-gesture), so React's synthetic
  // onWheel stopPropagation has no effect — we must use a native listener.
  useEffect(() => {
    const el = nodeRef.current
    if (!el) return
    const stop = e => e.stopPropagation()
    el.addEventListener('wheel', stop)
    return () => el.removeEventListener('wheel', stop)
  }, [])

  const [conversations, setConversations] = useState(() => initConversations(data))
  const [activeConvId, setActiveConvId] = useState(() => data.activeConvId || initConversations(data)[0]?.id)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [model, setModel] = useState(() => data.model || getDefaultModel(loadApiKeys()))
  const [reasoningLevel, setReasoningLevel] = useState(() => data.reasoningLevel || null)
  const [customPrompt, setCustomPrompt] = useState(() => data.customPrompt || '')
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)

  // Document attachments (persisted in node data)
  const [documents, setDocuments] = useState(() => data.documents || [])
  const [attachPanel, setAttachPanel] = useState(false)
  const [gdocUrl, setGdocUrl] = useState('')
  const [docLoading, setDocLoading] = useState(false)
  const [docError, setDocError] = useState('')

  const activeConv = conversations.find(c => c.id === activeConvId) || conversations[0]
  const messages = activeConv?.messages || []

  // Persist state to node data
  const persist = useCallback((convs, activeId, mdl, rLevel, docs, customPrompt) => {
    setNodes(nds => nds.map(n => n.id === id ? {
      ...n, data: {
        ...n.data,
        conversations: convs,
        activeConvId: activeId,
        model: mdl ?? model,
        reasoningLevel: rLevel ?? reasoningLevel,
        documents: docs ?? documents,
        customPrompt: customPrompt ?? n.data.customPrompt,
      }
    } : n))
  }, [id, setNodes, model, reasoningLevel, documents])

  // ── Document helpers ────────────────────────────────────────────────────────

  async function addDocumentFile(file) {
    setDocLoading(true)
    setDocError('')
    try {
      const res = await extractDocumentFile(file)
      const newDoc = { id: `doc-${Date.now()}`, name: res.name, type: res.type, text: res.text, pages: res.pages }
      const updated = [...documents, newDoc]
      setDocuments(updated)
      persist(conversations, activeConvId, undefined, undefined, updated)
    } catch (err) {
      setDocError(err.message)
    } finally {
      setDocLoading(false)
    }
  }

  async function addGoogleDoc() {
    if (!gdocUrl.trim()) return
    setDocLoading(true)
    setDocError('')
    try {
      const res = await extractGoogleDoc(gdocUrl.trim())
      const newDoc = { id: `doc-${Date.now()}`, name: res.name || 'Google Doc', type: 'gdoc', text: res.text }
      const updated = [...documents, newDoc]
      setDocuments(updated)
      persist(conversations, activeConvId, undefined, undefined, updated)
      setGdocUrl('')
    } catch (err) {
      setDocError(err.message)
    } finally {
      setDocLoading(false)
    }
  }

  function removeDocument(docId) {
    const updated = documents.filter(d => d.id !== docId)
    setDocuments(updated)
    persist(conversations, activeConvId, undefined, undefined, updated)
  }

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, running])

  // Get connected transcripts at call time
  function getConnectedTranscripts() {
    const allNodes = getNodes()
    const allEdges = getEdges()
    return allEdges
      .filter(e => e.target === id)
      .flatMap(e => {
        const src = allNodes.find(n => n.id === e.source)
        if (!src) return []
        if (src.type === 'videoTranscriptNode' && src.data.state === 'listo') {
          return [{ url: src.data.url, platform: src.data.platform, transcript: src.data.transcript, title: src.data.title, collection: null }]
        }
        if (src.type === 'documentNode' && src.data.state === 'listo') {
          return [{ url: src.data.url || '', platform: src.data.type?.toUpperCase() || 'DOC', transcript: src.data.text, title: src.data.name, collection: null }]
        }
        if (src.type === 'textNode' && src.data.text?.trim()) {
          return [{ url: '', platform: 'TEXTO', transcript: src.data.text, title: 'Nota de texto', collection: null }]
        }
        if (src.type === 'groupNode') {
          const collectionName = src.data.title || 'Colección'

          if (e.sourceHandle === 'summary') {
            if (src.data.summary) {
              return [{ url: '', platform: 'RESUMEN', transcript: src.data.summary, title: `Resumen: ${collectionName}`, collection: collectionName }]
            }
            return []
          }

          // "transcripts" handle (default) → raw videos
          return allNodes
            .filter(n => n.type === 'videoTranscriptNode' && (n.parentId === src.id || n.data.groupId === src.id) && n.data.state === 'listo')
            .map(n => ({ url: n.data.url, platform: n.data.platform, transcript: n.data.transcript, title: n.data.title, collection: collectionName }))
        }

        if (src.type === 'profileAnalysisNode') {
          const handle = e.sourceHandle || 'videos'
          const username = src.data.username || ''
          const platform = (src.data.platform || 'perfil').toUpperCase()
          const analyses  = src.data.analyses || {}

          // Named analysis handle (estrategia, hooks, patrones, voz, ideas)
          if (handle !== 'videos' && analyses[handle]) {
            // Find label for this handle
            const LABELS = { estrategia: 'Estrategia', hooks: 'Hooks', patrones: 'Patrones', voz: 'Tono de voz', ideas: 'Ideas', personalizado: 'Personalizado' }
            return [{
              url: '',
              platform,
              transcript: analyses[handle],
              title: `${LABELS[handle] || handle} — @${username}`,
              collection: `@${username}`,
            }]
          }

          // "videos" handle or fallback → raw transcripts from video items
          const videoItems = src.data.videoItems || []
          return videoItems
            .filter(v => v.state === 'listo' && v.transcript)
            .map(v => ({
              url: v.url,
              platform,
              transcript: v.transcript,
              title: v.title || v.url,
              collection: `@${username}`,
            }))
        }

        // BrandVoiceNode → return special brandVoice object
        if (src.type === 'brandVoiceNode' && src.data.state === 'ready') {
          const brandVoice = src.data.brandVoice || {}
          const personName = src.data.personName || 'BrandVoice'
          return [{
            url: '',
            platform: 'BRANDVOICE',
            transcript: brandVoice.resumenReutilizable || 'No disponible',
            title: `BrandVoice: ${personName}`,
            collection: personName,
            isBrandVoice: true,
            brandVoiceData: brandVoice,
            personName,
          }]
        }

        return []
      })
  }

  // Connected video count (for display)
  const connectedCount = (() => {
    try { return getConnectedTranscripts().length } catch { return 0 }
  })()

  function newConversation() {
    const newConv = { id: `conv-${Date.now()}`, title: 'Nueva conversación', messages: [], createdAt: Date.now() }
    setConversations(prev => {
      const updated = [newConv, ...prev]
      persist(updated, newConv.id, undefined, undefined)
      return updated
    })
    setActiveConvId(newConv.id)
  }

  function deleteConv(convId) {
    setConversations(prev => {
      let updated = prev.filter(c => c.id !== convId)
      if (updated.length === 0) {
        updated = [{ id: `conv-${Date.now()}`, title: 'Nueva conversación', messages: [], createdAt: Date.now() }]
      }
      const newActive = convId === activeConvId ? updated[0].id : activeConvId
      setActiveConvId(newActive)
      persist(updated, newActive, undefined, undefined)
      return updated
    })
  }

  function switchConv(convId) {
    setActiveConvId(convId)
    persist(conversations, convId, undefined, undefined)
  }

  function handleModelChange(newModel) {
    setModel(newModel)
    // Reset reasoning level when switching models if not supported
    if (!supportsReasoning(newModel)) {
      setReasoningLevel(null)
    }
    persist(conversations, activeConvId, newModel, reasoningLevel)
  }

  function handleSaveCustomPrompt(prompt) {
    setCustomPrompt(prompt)
    persist(conversations, activeConvId, undefined, undefined, undefined, prompt)
  }

  function getMasterPrompt() {
    return `Sos un asistente de IA útil. Respondes a las preguntas del usuario basándote en el contexto proporcionado (transcripciones de videos, documentos, notas de texto).

Tu rol es:
- Comprender el contexto proporcionado por las fuentes conectadas
- Responder preguntas de forma clara y específica
- Citar información relevante cuando sea necesario
- Mantener un tono profesional y servicial

Puedes acceder a:
- Transcripciones de videos conectados
- Documentos adjuntos (PDFs, TXT, Google Docs)
- Notas de texto
- Brand Voice si está conectado

Usa esta información para dar respuestas contextualizadas y útiles.`
  }

  function handleReasoningChange(newLevel) {
    setReasoningLevel(newLevel)
    persist(conversations, activeConvId, model, newLevel)
  }

  // Detect Google Docs URLs pasted directly into the text input
  function handleInputPaste(e) {
    const pasted = e.clipboardData?.getData('text') || ''
    if (isGoogleDocsUrl(pasted)) {
      e.preventDefault()
      setGdocUrl(pasted)
      setAttachPanel(true)
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || running) return

    const userMsg = { id: `msg-${Date.now()}`, role: 'user', content: text, timestamp: Date.now() }
    const currentMsgs = activeConv?.messages || []
    const newMsgs = [...currentMsgs, userMsg]
    const autoTitle = currentMsgs.length === 0
      ? text.substring(0, 48) + (text.length > 48 ? '…' : '')
      : activeConv?.title

    // Optimistic update
    const withUser = conversations.map(c =>
      c.id === activeConvId ? { ...c, messages: newMsgs, title: autoTitle } : c
    )
    setConversations(withUser)
    setInput('')
    setRunning(true)

    try {
      const transcripts = getConnectedTranscripts()
      const payload = newMsgs.map(m => ({ role: m.role === 'error' ? 'user' : m.role, content: m.content }))
      const res = await runLLM(payload, transcripts, model, documents, reasoningLevel, customPrompt)
      const assistantMsg = { id: `msg-${Date.now() + 1}`, role: 'assistant', content: res.result, timestamp: Date.now() }
      const withAssistant = withUser.map(c =>
        c.id === activeConvId ? { ...c, messages: [...newMsgs, assistantMsg] } : c
      )
      setConversations(withAssistant)
      persist(withAssistant, activeConvId, undefined, undefined)
    } catch (err) {
      const errMsg = { id: `msg-${Date.now() + 1}`, role: 'error', content: err.message, timestamp: Date.now() }
      const withErr = withUser.map(c =>
        c.id === activeConvId ? { ...c, messages: [...newMsgs, errMsg] } : c
      )
      setConversations(withErr)
      persist(withErr, activeConvId, undefined, undefined)
    } finally {
      setRunning(false)
      textareaRef.current?.focus()
    }
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
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

      <NodeResizer
        isVisible={selected}
        minWidth={440}
        maxWidth={1200}
        minHeight={340}
        handleStyle={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', border: `2px solid ${ACCENT}` }}
        lineStyle={{ borderColor: `${ACCENT}60`, borderWidth: 1 }}
      />

      <div ref={nodeRef} style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        background: '#fff',
        border: `1px solid ${selected ? ACCENT + '55' : ACCENT + '28'}`,
        borderRadius: 14,
        boxShadow: selected
          ? `0 0 0 2px ${ACCENT}18, 0 4px 20px rgba(0,0,0,0.1)`
          : '0 2px 14px rgba(0,0,0,0.08)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>

        {/* ── HEADER ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', flexShrink: 0,
          background: `${ACCENT}08`,
          borderBottom: `1px solid ${ACCENT}18`,
        }}>
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            onMouseDown={e => e.stopPropagation()}
            style={{
              background: sidebarOpen ? `${ACCENT}14` : 'none',
              border: `1px solid ${sidebarOpen ? ACCENT + '30' : '#e2e8f0'}`,
              borderRadius: 7, color: sidebarOpen ? ACCENT : '#64748b',
              fontSize: 10, fontWeight: 600, cursor: 'pointer',
              padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {sidebarOpen ? <ChevronLeft size={10} strokeWidth={2} /> : <ChevronRight size={10} strokeWidth={2} />} Chats
          </button>

          <span style={{
            fontSize: 10, fontWeight: 700, color: ACCENT,
            background: `${ACCENT}14`, border: `1px solid ${ACCENT}28`,
            borderRadius: 6, padding: '2px 8px', letterSpacing: '0.04em',
          }}>
            ✦ LLM
          </span>

          <div style={{ flex: 1 }} />

          {/* Connected videos badge */}
          {connectedCount > 0 && (
            <span style={{
              fontSize: 9, color: '#16a34a',
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 12, padding: '2px 8px', fontWeight: 600,
            }}>
              📎 {connectedCount} fuente{connectedCount > 1 ? 's' : ''}
            </span>
          )}

          {/* Model selector */}
          <ModelSel value={model} onChange={v => handleModelChange(v)} />

          {/* Prompt editor button */}
          <button
            onClick={() => setShowPromptEditor(v => !v)}
            onMouseDown={e => e.stopPropagation()}
            style={{
              background: showPromptEditor || customPrompt ? `${ACCENT}14` : 'none',
              border: `1px solid ${showPromptEditor || customPrompt ? ACCENT + '30' : '#e2e8f0'}`,
              borderRadius: 7, color: showPromptEditor || customPrompt ? ACCENT : '#64748b',
              fontSize: 10, fontWeight: 600, cursor: 'pointer',
              padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 4,
            }}
            title={customPrompt ? 'Prompt personalizado configurado' : 'Personalizar prompt del sistema'}
          >
            <Settings size={11} strokeWidth={2} />
            {customPrompt ? '✓' : 'Prompt'}
          </button>

          {/* Reasoning level selector (solo para modelos que lo soportan) */}
          {supportsReasoning(model) && (
            <select
              value={reasoningLevel || 'low'}
              onChange={e => handleReasoningChange(e.target.value)}
              onMouseDown={e => e.stopPropagation()}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 7,
                color: '#334155',
                fontSize: 10,
                padding: '3px 7px',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'system-ui',
                maxWidth: 100,
              }}
              title="Nivel de razonamiento"
            >
              {REASONING_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  🧠 {level.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ── PROMPT EDITOR PANEL ── */}
        {showPromptEditor && (
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
            background: '#fafafa',
          }}>
            <PromptEditor
              customPrompt={customPrompt}
              onSave={handleSaveCustomPrompt}
              masterPrompt={getMasterPrompt()}
              accentColor={ACCENT}
            />
          </div>
        )}

        {/* ── BODY: sidebar + chat ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* ── SIDEBAR ── */}
          {sidebarOpen && (
            <div style={{
              width: 168, flexShrink: 0,
              borderRight: '1px solid #f1f5f9',
              display: 'flex', flexDirection: 'column',
              background: '#fafafa',
              overflow: 'hidden',
            }}>
              {/* New conversation */}
              <div style={{ padding: '8px 8px 4px' }}>
                <button
                  onClick={newConversation}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    width: '100%', padding: '6px 0',
                    background: ACCENT, border: 'none', borderRadius: 8,
                    color: '#fff', fontSize: 10, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 4,
                  }}
                >
                  + Nueva
                </button>
              </div>

              {/* Conversation list */}
              <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
                {conversations.map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    active={conv.id === activeConvId}
                    onSelect={() => switchConv(conv.id)}
                    onDelete={() => deleteConv(conv.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── CHAT AREA ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px' }}>
              {messages.length === 0 ? (
                <EmptyState connected={connectedCount} />
              ) : (
                messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
              )}
              {running && <ThinkingDots />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div style={{ borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>

              {/* ── Attachment panel ── */}
              {attachPanel && (
                <div style={{
                  padding: '8px 12px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}>
                  {/* Google Docs URL row */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input
                      value={gdocUrl}
                      onChange={e => setGdocUrl(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addGoogleDoc(); e.stopPropagation() }}
                      onMouseDown={e => e.stopPropagation()}
                      placeholder="Link de Google Docs público…"
                      style={{
                        flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: 7, color: '#334155', fontSize: 10,
                        padding: '5px 9px', outline: 'none', fontFamily: 'system-ui',
                      }}
                    />
                    <button
                      onClick={addGoogleDoc}
                      disabled={!gdocUrl.trim() || docLoading}
                      style={{
                        background: gdocUrl.trim() ? ACCENT : '#f1f5f9',
                        border: 'none', borderRadius: 7,
                        color: gdocUrl.trim() ? '#fff' : '#94a3b8',
                        fontSize: 10, fontWeight: 600, cursor: gdocUrl.trim() ? 'pointer' : 'default',
                        padding: '5px 10px', whiteSpace: 'nowrap',
                      }}
                    >
                      Importar
                    </button>
                  </div>

                  {/* File upload row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.md,.csv"
                      style={{ display: 'none' }}
                      onChange={e => { if (e.target.files[0]) addDocumentFile(e.target.files[0]); e.target.value = '' }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={docLoading}
                      style={{
                        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7,
                        color: '#475569', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <FileText size={11} strokeWidth={2} /> Subir PDF / TXT
                    </button>
                    {docLoading && (
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        border: `2px solid ${ACCENT}40`, borderTopColor: ACCENT,
                        animation: 'spin 0.7s linear infinite', display: 'inline-block',
                      }} />
                    )}
                    {docError && (
                      <span style={{ fontSize: 9, color: '#dc2626', flex: 1, lineHeight: 1.3 }}>{docError}</span>
                    )}
                  </div>

                  {/* Attached doc chips */}
                  {documents.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                      {documents.map(doc => (
                        <span key={doc.id} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: '#f0fdf4', border: '1px solid #bbf7d0',
                          borderRadius: 6, padding: '2px 7px',
                          fontSize: 9, color: '#16a34a', fontWeight: 600, maxWidth: 160,
                        }}>
                          {doc.type === 'gdoc' ? <LinkIcon size={9} strokeWidth={2} /> : <FileText size={9} strokeWidth={2} />}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                            {doc.name}
                          </span>
                          {doc.pages && <span style={{ color: '#86efac' }}>{doc.pages}p</span>}
                          <button
                            onClick={() => removeDocument(doc.id)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: '#86efac', fontSize: 10, padding: 0, lineHeight: 1,
                            }}
                          >✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ padding: '8px 12px 10px' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                  {/* Attach button */}
                  <button
                    onClick={() => { setAttachPanel(v => !v); setDocError('') }}
                    onMouseDown={e => e.stopPropagation()}
                    title="Adjuntar documentos o Google Docs"
                    style={{
                      width: 32, height: 32, flexShrink: 0,
                      background: (attachPanel || documents.length > 0) ? `${ACCENT}14` : '#f8fafc',
                      border: `1px solid ${(attachPanel || documents.length > 0) ? ACCENT + '40' : '#e2e8f0'}`,
                      borderRadius: 9, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, position: 'relative',
                    }}
                  >
                    📎
                    {documents.length > 0 && (
                      <span style={{
                        position: 'absolute', top: -4, right: -4,
                        width: 14, height: 14, borderRadius: '50%',
                        background: ACCENT, color: '#fff',
                        fontSize: 8, fontWeight: 700, fontFamily: 'system-ui',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {documents.length}
                      </span>
                    )}
                  </button>

                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                      e.stopPropagation()
                    }}
                    onPaste={handleInputPaste}
                    onMouseDown={e => e.stopPropagation()}
                    placeholder="Escribí un mensaje… (Enter para enviar)"
                    rows={2}
                    style={{
                      flex: 1, resize: 'none',
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: 10, color: '#0f172a',
                      fontSize: 11, fontFamily: 'system-ui', lineHeight: 1.5,
                      padding: '8px 10px', outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => { e.target.style.borderColor = `${ACCENT}60` }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
                  />
                  <button
                    onClick={send}
                    disabled={running || !input.trim()}
                    style={{
                      width: 36, height: 36, flexShrink: 0,
                      background: (running || !input.trim()) ? '#f1f5f9' : ACCENT,
                      border: 'none', borderRadius: 10,
                      color: (running || !input.trim()) ? '#94a3b8' : '#fff',
                      fontSize: 14, cursor: (running || !input.trim()) ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s',
                    }}
                  >
                    {running ? (
                      <span style={{
                        width: 12, height: 12, borderRadius: '50%',
                        border: `2px solid ${ACCENT}40`, borderTopColor: ACCENT,
                        animation: 'spin 0.7s linear infinite', display: 'inline-block',
                      }} />
                    ) : <ChevronRight size={10} strokeWidth={2} />}
                  </button>
                </div>
                <div style={{ fontSize: 9, color: '#cbd5e1', marginTop: 5, paddingLeft: 1 }}>
                  Shift+Enter para nueva línea · pegá un link de Google Docs para importarlo
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        style={{ background: ACCENT, border: `2px solid ${ACCENT}60`, width: 10, height: 10, borderRadius: '50%' }}
      />
    </>
  )
}

const MemoizedLLMNode = memo(LLMNode, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.data.result === nextProps.data.result &&
    prevProps.data.state === nextProps.data.state &&
    prevProps.data.messages === nextProps.data.messages
  )
})

MemoizedLLMNode.displayName = 'LLMNode'

export default MemoizedLLMNode
