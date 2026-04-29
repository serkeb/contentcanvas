import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, NodeResizer, NodeToolbar, useReactFlow } from '@xyflow/react'
import { runLLM } from '../utils/api'
import { useConnectedSources } from '../utils/useConnectedSources'
import ModelSel from '../components/ModelSel'
import PromptEditor from '../components/PromptEditor'
import { getDefaultModel } from '../utils/models'
import { loadApiKeys } from '../utils/storage'
import Markdown from './Markdown'
import { Mail, FileText, Film, Check, Copy, X, ExternalLink, CheckCircle, ChevronUp, ChevronDown, Settings } from 'lucide-react'
import { SiInstagram, SiX, SiLinkedin } from './SocialIcons'

const ACCENT = '#06b6d4'

const FORMAT_DEFS = [
  { id: 'captionIG', label: 'Caption IG', icon: SiInstagram, heading: 'Caption para Instagram' },
  { id: 'hiloX', label: 'Hilo X/Twitter', icon: SiX, heading: 'Hilo para X / Twitter' },
  { id: 'email', label: 'Email', icon: Mail, heading: 'Email / Newsletter' },
  { id: 'carruselOutline', label: 'Carrusel', icon: FileText, heading: 'Estructura de carrusel' },
  { id: 'linkedinPost', label: 'Post LinkedIn', icon: SiLinkedin, heading: 'Post para LinkedIn' },
]

const FORMAT_PROMPTS = {
  captionIG: `
Objetivo:
Convertí el material fuente en un caption de Instagram listo para publicar.

Qué tenés que hacer:
- Detectá el mejor ángulo del contenido: educativo, emocional, storytelling, promocional, reflexivo o de comunidad.
- Inferí automáticamente el tipo de publicación más probable según el material fuente: reel, foto, carrusel, recap de historia o post promocional.
- Mantené el idioma dominante del contenido fuente.
- Si faltan detalles, inferilos con criterio sin inventar humo, datos, métricas ni resultados.

Reglas:
- La primera línea debe frenar el scroll.
- Escribí como humano, no como IA.
- No expliques demasiado.
- No suenes corporativo ni vendehumo.
- No uses emojis en exceso.
- No metas hashtags dentro del cuerpo.
- Si el contenido es promocional, primero aportá valor o contexto y recién después hacé el CTA.
- Si el contenido es una transcripción, no la resumas sin más: sacá el mejor ángulo y reescribilo como caption nativo de Instagram.

Estructura de salida obligatoria:
Usá exactamente este formato, sin usar encabezados que empiecen con ##

Hook:
[una sola línea potente]

Caption:
[caption completo listo para publicar]

CTA:
[una sola línea]

Hashtags:
[#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5]
`,

  hiloX: `
Objetivo:
Transformá el material fuente en un hilo nativo de X / Twitter, filoso, claro y publicable.

Qué tenés que hacer:
- Detectá el mejor ángulo para X: aprendizaje, opinión contraria, desglose, historia, framework, caso, proceso o insight.
- Mantené el idioma dominante del contenido fuente.
- Si falta contexto, inferilo con criterio.
- No inventes resultados, números ni pruebas.

Reglas:
- El primer tweet tiene que hookear fuerte.
- Cada tweet tiene que empujar al siguiente.
- Evitá relleno, repetición y frases vacías.
- Cada tweet debe sentirse natural para X.
- Máximo orientativo: 280 caracteres por tweet.
- No conviertas cada tweet en un bloque pesado.
- No metas más de 1 hashtag salvo que realmente sume.
- El cierre puede ser CTA, takeaway o pregunta para replies.

Estructura de salida obligatoria:
Usá exactamente este formato, sin usar encabezados que empiecen con ##

Hook alternativo:
[opción breve alternativa para el tweet inicial]

Hilo:
1/ ...
2/ ...
3/ ...
4/ ...
5/ ...
6/ ...

Cierre:
[CTA o remate final]
`,

  email: `
Objetivo:
Convertí el material fuente en un email o newsletter claro, humano y persuasivo, adaptado a formato email y no a formato red social.

Qué tenés que hacer:
- Inferí el mejor tipo de email según el contenido: educativo, newsletter, insight, historia, anuncio, nurture o venta suave.
- Mantené el idioma dominante del contenido fuente.
- Si es una transcripción, extraé la idea más potente en vez de resumir todo.
- No inventes métricas, testimonios, resultados ni urgencias falsas.

Reglas:
- El asunto debe generar curiosidad o relevancia sin sonar clickbait.
- El preheader debe complementar el asunto.
- La apertura debe entrar rápido al punto.
- El cuerpo debe desarrollar una sola idea central con claridad.
- Usá párrafos cortos.
- Hacelo escaneable.
- Cerrá con un CTA natural o con un cierre reflexivo si aplica.

Estructura de salida obligatoria:
Usá exactamente este formato, sin usar encabezados que empiecen con ##

Asunto 1:
[asunto]

Asunto 2:
[asunto]

Asunto 3:
[asunto]

Preheader:
[preheader]

Email:
[email completo listo para enviar]

CTA:
[una sola línea]
`,

  carruselOutline: `
Objetivo:
Transformá el material fuente en una estructura de carrusel de Instagram de 5 slides, clara, swippeable y con lógica de retención.

Qué tenés que hacer:
- Detectá el mejor ángulo del contenido: educativo, insight, error común, proceso, storytelling, reflexión o framework.
- No resumas el contenido sin forma: estructuralo para que cada slide justifique el siguiente.
- Mantené el idioma dominante del contenido fuente.
- Si se menciona un ejemplo o caso y faltan detalles, podés crear un ejemplo ilustrativo plausible, pero no inventes métricas ni resultados concretos.

Reglas:
- Slide 1: hook fuerte + promesa clara
- Slide 2: problema, tensión, error o contexto
- Slide 3: desarrollo / paso / idea principal 1
- Slide 4: desarrollo / paso / idea principal 2 / insight
- Slide 5: conclusión + CTA
- Evitá párrafos largos.
- Cada slide debe tener un propósito.
- Tiene que sentirse nativo de Instagram, no como un blog cortado.

Estructura de salida obligatoria:
Usá exactamente este formato, sin usar encabezados que empiecen con ##

Idea visual general:
[breve dirección visual del carrusel: limpio, bold, editorial, minimalista, etc.]

Slide 1:
Título:
Subtítulo:
Cuerpo:

Slide 2:
Título:
Subtítulo:
Cuerpo:

Slide 3:
Título:
Subtítulo:
Cuerpo:

Slide 4:
Título:
Subtítulo:
Cuerpo:

Slide 5:
Título:
Subtítulo:
Cuerpo:

Caption de apoyo:
[caption breve para acompañar el carrusel]

Hashtags:
[#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5]
`,

  linkedinPost: `
Actuá como un experto senior en copywriting para LinkedIn, especializado en crear posts de alto rendimiento que generen atención, retención, interacción y posicionamiento de autoridad.

Tu trabajo no es escribir texto bonito: tu trabajo es convertir ideas, aprendizajes, experiencias, transcripciones, herramientas, casos o procesos en publicaciones que:
- capten atención en las primeras líneas,
- despierten curiosidad,
- sean fáciles de leer,
- aporten valor real,
- refuercen autoridad,
- y provoquen una acción concreta.

Antes de escribir, identificá internamente:
1. tema central
2. lector ideal
3. nivel de consciencia del lector
4. objetivo del post: autoridad, engagement, leads, storytelling, venta sutil, reflexión u opinión
5. emoción o tensión principal
6. CTA más adecuado

Tipos de post posibles:
- storytelling personal
- educativo / autoridad
- reflexión / opinión
- promoción sutil
- caso real / demostración

Reglas de estilo:
- frases claras, cortas y escaneables
- saltos de línea frecuentes
- tono humano, seguro y específico
- sin clichés vacíos
- sin humo
- sin lenguaje robótico
- sin repetición innecesaria
- sin sonar a anuncio salvo que el contenido lo pida
- sin exceso de emojis
- sin inventar datos o resultados

Regla crítica de apertura:
El inicio debe frenar el scroll con una de estas palancas:
- contradicción
- confesión
- opinión fuerte
- tensión
- sorpresa
- mini historia
- pregunta incómoda
- afirmación específica

Regla crítica de cuerpo:
El desarrollo no debe solo enumerar ideas. Tiene que construir interés con contraste, tensión, prueba, ejemplo, microhistoria, aprendizaje o marco mental.

Regla crítica de cierre:
El final debe cerrar con intención. Elegí entre:
- pregunta para comentarios
- invitación a debatir
- palabra clave
- invitación a DM
- reflexión final memorable
- invitación a guardar el post

No cierres siempre con “¿qué opinas?”.
No copies la estructura superficial del input.
Capturá la lógica estratégica y reescribí para LinkedIn.

Estructura de salida obligatoria:
Usá exactamente este formato, sin usar encabezados que empiecen con ##

Post principal:
[post completo listo para publicar]

Hook alternativo 1:
[una línea]

Hook alternativo 2:
[una línea]

CTA alternativo:
[una línea]

Hashtags sugeridos:
[#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5]
`,
}

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 0' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: `${ACCENT}80`,
          animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
          display: 'inline-block',
        }} />
      ))}
    </div>
  )
}

function OutputSlot({ def, content, onViewFull }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  function copy() {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const preview = content?.split('\n').slice(0, 3).join('\n') || ''
  const hasMore = content && content.split('\n').length > 3

  return (
    <div style={{
      border: '1px solid #e2e8f0', borderRadius: 9,
      overflow: 'hidden', background: '#fff',
    }}>
      <div style={{
        padding: '7px 10px', background: '#f8fafc',
        borderBottom: expanded || content ? '1px solid #f1f5f9' : 'none',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <def.icon size={14} />
        <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: '#334155' }}>{def.label}</span>
        {content && (
          <>
            <button onClick={copy} style={{
              padding: '2px 7px', background: copied ? '#f0fdf4' : '#fff',
              border: `1px solid ${copied ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 5,
              color: copied ? '#16a34a' : '#64748b', fontSize: 9, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
            }}>{copied ? <Check size={10} strokeWidth={2.5} /> : <Copy size={10} strokeWidth={2} />}</button>
            <button onClick={() => onViewFull(def, content)} style={{
              padding: '2px 7px', background: `${ACCENT}10`,
              border: `1px solid ${ACCENT}25`, borderRadius: 5,
              color: ACCENT, fontSize: 9, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
            }}><ExternalLink size={10} strokeWidth={2} /></button>
            <button onClick={() => setExpanded(v => !v)} style={{
              padding: '2px 4px', background: 'none', border: 'none',
              color: '#94a3b8', fontSize: 11, cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center',
            }}>{expanded ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}</button>
          </>
        )}
        {!content && (
          <span style={{ fontSize: 9, color: '#94a3b8' }}>pendiente</span>
        )}
      </div>
      {content && (
        <div style={{
          padding: '7px 10px',
          maxHeight: expanded ? 600 : 60,
          overflow: 'hidden',
          transition: 'max-height 0.2s ease',
        }}>
          <Markdown fontSize={10}>{expanded ? content : preview}</Markdown>
          {!expanded && hasMore && (
            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>…</div>
          )}
        </div>
      )}
    </div>
  )
}

function ContentOverlay({ def, content, onClose }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
      zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        width: 580, maxHeight: '80vh', background: '#fff',
        borderRadius: 18, boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: 'system-ui', animation: 'fadeUp 0.18s ease',
      }} onClick={e => e.stopPropagation()}>
        <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }`}</style>
        <div style={{ height: 4, flexShrink: 0, background: `linear-gradient(90deg, ${ACCENT}, #22d3ee, #67e8f9)` }} />
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <def.icon size={18} />
          <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{def.label}</span>
          <button onClick={copy} style={{ padding: '5px 12px', background: copied ? '#f0fdf4' : '#f8fafc', border: `1px solid ${copied ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 7, color: copied ? '#16a34a' : '#64748b', fontSize: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            {copied ? <><Check size={12} strokeWidth={2.5} /> Copiado</> : <><Copy size={12} strokeWidth={2} /> Copiar</>}
          </button>
          <button onClick={onClose} style={{ width: 26, height: 26, background: '#f1f5f9', border: 'none', borderRadius: 7, color: '#64748b', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} strokeWidth={2} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <Markdown fontSize={12}>{content}</Markdown>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function RepurposingNode({ id, data, selected }) {
  const { setNodes, setEdges, getNodes, deleteElements } = useReactFlow()
  const nodeRef = useRef(null)
  const [running, setRunning] = useState(false)
  const [model, setModel] = useState(() => data.model || getDefaultModel(loadApiKeys()))
  const [overlay, setOverlay] = useState(null)

  const defaultFormats = {
    captionIG: true,
    hiloX: true,
    email: false,
    carruselOutline: true,
    linkedinPost: false,
  }

  const defaultCounts = {
    captionIG: 1,
    hiloX: 1,
    email: 1,
    carruselOutline: 1,
    linkedinPost: 1,
  }

  const [formats, setFormats] = useState(data.formats || defaultFormats)
  const [formatCounts, setFormatCounts] = useState(data.formatCounts || defaultCounts)
  // Backwards compatibility: convert old customPrompt (string) to customPrompts (object)
  const [customPrompts, setCustomPrompts] = useState(() => {
    if (data.customPrompts) return data.customPrompts
    // Migration from old format
    if (data.customPrompt) {
      // If user had a global customPrompt, apply it to all active formats
      const migrated = {}
      Object.keys(defaultFormats).forEach(formatId => {
        if (defaultFormats[formatId]) {
          migrated[formatId] = data.customPrompt
        }
      })
      return migrated
    }
    return {}
  })
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [selectedFormatForEdit, setSelectedFormatForEdit] = useState(null)

  const state = data.state || 'idle'
  const outputs = data.outputs || {}
  const error = data.error || null

  const { transcripts, documents, brandVoice } = useConnectedSources(id)
  const connectedCount = transcripts.length + documents.length + (brandVoice ? 1 : 0)

  useEffect(() => {
    const el = nodeRef.current
    if (!el) return
    const stop = e => e.stopPropagation()
    el.addEventListener('wheel', stop)
    return () => el.removeEventListener('wheel', stop)
  }, [])

  const persist = useCallback((updates) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n))
  }, [id, setNodes])

  function toggleFormat(fid) {
    const updated = { ...formats, [fid]: !formats[fid] }
    setFormats(updated)
    persist({ formats: updated })
  }

  function updateFormatCount(fid, count) {
    const updated = { ...formatCounts, [fid]: Math.max(1, Math.min(5, count)) }
    setFormatCounts(updated)
    persist({ formatCounts: updated })
  }

  function handleSaveCustomPrompt(formatId, prompt) {
    const updated = { ...customPrompts, [formatId]: prompt || undefined }
    setCustomPrompts(updated)
    persist({ customPrompts: updated })
  }

  function getMasterPromptForFormat(formatId) {
    return FORMAT_PROMPTS[formatId] || 'Prompt no disponible'
  }

  function buildPrompt() {
    if (transcripts.length === 0 && documents.length === 0) {
      throw new Error('No hay fuentes conectadas. Conectá un video, script o documento.')
    }

    const selectedFmts = FORMAT_DEFS.filter(f => formats[f.id])
    if (selectedFmts.length === 0) {
      throw new Error('Seleccioná al menos un formato de salida.')
    }

    const mainSource =
      transcripts[0] ||
      {
        title: documents[0]?.name || 'Documento',
        platform: 'DOCUMENTO',
        transcript: documents[0]?.text || '',
      }

    const sourceTitle = mainSource.title || 'Contenido'
    const sourcePlatform = mainSource.platform || 'desconocida'
    const sourceText = (mainSource.transcript || '').slice(0, 6000)

    let prompt = `Sos un estratega senior de repurposing de contenido.\n\n`

    prompt += `Tu tarea es tomar una pieza fuente y convertirla en formatos nativos de distintas plataformas, sin hacer copias superficiales.\n\n`

    prompt += `Principios globales que debés respetar:\n`
    prompt += `- Detectá el ángulo más fuerte del contenido antes de escribir.\n`
    prompt += `- Mantené el mensaje central, pero adaptá estructura, ritmo, tono y CTA según la plataforma.\n`
    prompt += `- Conservá el idioma dominante del contenido fuente, salvo que el contexto indique claramente otro.\n`
    prompt += `- Si falta contexto, inferilo con criterio, pero no inventes métricas, testimonios, resultados ni datos duros.\n`
    prompt += `- No uses relleno genérico.\n`
    prompt += `- Cada salida debe sentirse publicada en su plataforma, no reciclada.\n`
    prompt += `- Usá la voz de marca si está disponible.\n\n`

    prompt += `FORMATO DE RESPUESTA:\n`
    prompt += `- Tu respuesta debe comenzar directamente con ## ${selectedFmts[0]?.heading || 'Primer formato'}\n`
    prompt += `- Cada sección de tu respuesta debe empezar exactamente con el encabezado ## correspondiente\n`
    prompt += `- DENTRO de cada sección, NO uses líneas que empiecen con ## (solo los encabezados principales de sección)\n`
    prompt += `- No agregues introducción ni cierre fuera de las secciones solicitadas\n\n`

    prompt += `---\n`
    prompt += `CONTENIDO FUENTE\n\n`
    prompt += `Título: ${sourceTitle}\n`
    prompt += `Plataforma origen: ${sourcePlatform}\n\n`
    prompt += `Texto fuente:\n${sourceText || '[sin texto]'}\n`

    if (brandVoice?.resumenReutilizable) {
      prompt += `\n---\n`
      prompt += `VOZ DE MARCA\n\n`
      prompt += `${brandVoice.resumenReutilizable}\n`
    }

    if (documents.length > 0) {
      prompt += `\n---\n`
      prompt += `CONOCIMIENTO ADICIONAL\n\n`

      documents.slice(0, 4).forEach((doc, i) => {
        const docText = (doc.text || '').slice(0, 1800)
        prompt += `Documento ${i + 1}: ${doc.name || 'Documento sin nombre'}\n`
        prompt += `${docText}\n\n`
      })
    }

    prompt += `---\n`
    prompt += `SECCIONES A GENERAR:\n\n`

    selectedFmts.forEach(f => {
      const count = formatCounts[f.id] || 1
      const customPrompt = customPrompts[f.id]
      const formatPrompt = customPrompt || FORMAT_PROMPTS[f.id]

      if (count === 1) {
        prompt += `## ${f.heading}\n`
        prompt += `${formatPrompt}\n\n`
      } else {
        // Multiple versions
        for (let i = 1; i <= count; i++) {
          prompt += `## ${f.heading} - Versión ${i}\n`
          prompt += `${formatPrompt}\n\n`
        }
      }
    })

    return {
      messages: [{ role: 'user', content: prompt }],
      transcripts,
      documents,
    }
  }

  async function handleRun() {
    setRunning(true)
    persist({ state: 'running', error: null })

    try {
      const { messages, transcripts, documents } = buildPrompt()

      // Debug: log prompt length
      console.log('Prompt length:', messages[0].content.length)

      const res = await runLLM(messages, transcripts, model, documents, null, null)

      const raw = res.result

      // Debug: log raw response
      console.log('Raw response length:', raw.length)
      console.log('Raw response preview:', raw.slice(0, 500))

      const parsedOutputs = {} // { formatId: [content1, content2, ...] }
      const selectedFmts = FORMAT_DEFS.filter(f => formats[f.id])

      selectedFmts.forEach(f => {
        const count = formatCounts[f.id] || 1
        parsedOutputs[f.id] = []

        if (count === 1) {
          // Single version - match without version suffix
          const regex = new RegExp(`##\\s*${f.heading}\\s*\\n([\\s\\S]*?)(?=##|$)`, 'i')
          const match = raw.match(regex)
          if (match) {
            parsedOutputs[f.id].push(match[1].trim())
          }
        } else {
          // Multiple versions - match each version
          for (let i = 1; i <= count; i++) {
            const regex = new RegExp(`##\\s*${f.heading}\\s*-\\s*Versión\\s*${i}\\s*\\n([\\s\\S]*?)(?=##|$)`, 'i')
            const match = raw.match(regex)
            if (match) {
              parsedOutputs[f.id].push(match[1].trim())
            }
          }
        }
        console.log(`Format ${f.id}:`, parsedOutputs[f.id].length, 'versions')
      })

      const mainSource = transcripts[0] || { title: documents[0]?.name || 'Fuente' }
      const sourceTitle = mainSource.title || 'Fuente'

      const thisNode = getNodes().find(n => n.id === id)
      const nodeW = thisNode?.measured?.width || 280
      const posX = (thisNode?.position?.x || 0) + nodeW + 50
      const posY = thisNode?.position?.y || 0

      const newNodes = []
      const newEdges = []

      let verticalOffset = 0
      const NODE_HEIGHT = 200
      const VERTICAL_GAP = 20

      selectedFmts.forEach((f) => {
        const contents = parsedOutputs[f.id] || []

        contents.forEach((content, versionIndex) => {
          if (!content) return

          const outputId = `repurpose-out-${f.id}-${Date.now()}-${versionIndex}`

          newNodes.push({
            id: outputId,
            type: 'repurposingOutputNode',
            position: { x: posX, y: posY + verticalOffset },
            style: { width: 340, height: NODE_HEIGHT },
            data: {
              format: f.id,
              content,
              sourceTitle,
              version: contents.length > 1 ? versionIndex + 1 : null,
            },
          })

          newEdges.push({
            id: `e-${id}-${outputId}`,
            source: id,
            target: outputId,
            type: 'deletable',
            style: { stroke: `${ACCENT}70`, strokeWidth: 1.5, strokeDasharray: '4 3' },
            markerEnd: { type: 'arrowclosed', color: `${ACCENT}70` },
          })

          verticalOffset += NODE_HEIGHT + VERTICAL_GAP
        })
      })

      console.log('Creating nodes:', newNodes.length)

      setNodes(nds => [...nds, ...newNodes])
      setEdges(eds => [...eds, ...newEdges])

      persist({
        state: 'done',
        formats,
        formatCounts,
        outputs: parsedOutputs,
      })
    } catch (err) {
      console.error('Error in handleRun:', err)
      persist({ state: 'error', error: err.message })
    } finally {
      setRunning(false)
    }
  }

  const selectedCount = Object.values(formats).filter(Boolean).length

  return (
    <>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-5px);opacity:1} }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

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

      <NodeResizer
        isVisible={selected}
        minWidth={260}
        minHeight={320}
        handleStyle={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', border: `2px solid ${ACCENT}` }}
        lineStyle={{ borderColor: `${ACCENT}50` }}
      />

      <div
        ref={nodeRef}
        style={{
          width: '100%',
          height: '100%',
          background: '#fff',
          border: `1.5px solid ${selected ? ACCENT + '80' : ACCENT + '30'}`,
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'system-ui',
          overflow: 'hidden',
          boxShadow: selected ? `0 0 0 3px ${ACCENT}14, 0 8px 28px rgba(6,182,212,0.12)` : '0 2px 12px rgba(6,182,212,0.08)',
        }}
      >
        <div style={{ height: 3, background: `linear-gradient(90deg, ${ACCENT}, #22d3ee, #67e8f9)`, flexShrink: 0 }} />

        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid #f1f5f9',
            background: `${ACCENT}04`,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: ACCENT,
              background: `${ACCENT}12`,
              border: `1px solid ${ACCENT}25`,
              borderRadius: 5,
              padding: '2px 7px',
              letterSpacing: '0.04em'
            }}
          >
            ↺ REPURPOSE
          </span>
          <div style={{ flex: 1 }} />
          <ModelSel value={model} onChange={setModel} />
          <button
            onClick={() => setShowPromptEditor(v => !v)}
            onMouseDown={e => e.stopPropagation()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              background: showPromptEditor || Object.keys(customPrompts).length > 0 ? `${ACCENT}15` : '#f8fafc',
              border: `1px solid ${showPromptEditor || Object.keys(customPrompts).length > 0 ? ACCENT : '#e2e8f0'}`,
              borderRadius: 5, padding: '3px 7px',
              cursor: 'pointer', fontSize: 9, fontWeight: 600,
              color: showPromptEditor || Object.keys(customPrompts).length > 0 ? ACCENT : '#64748b',
              transition: 'all 0.15s',
            }}
            title={Object.keys(customPrompts).length > 0 ? `${Object.keys(customPrompts).length} prompts personalizados` : 'Personalizar prompts por formato'}
          >
            <Settings size={10} strokeWidth={2} />
            {Object.keys(customPrompts).length > 0 && <span>{Object.keys(customPrompts).length}</span>}
          </button>
          <span style={{ fontSize: 9, color: '#94a3b8' }}>{selectedCount} formatos</span>
        </div>

        {showPromptEditor && (
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', maxHeight: 400, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
              Prompts por formato
            </div>
            {FORMAT_DEFS.map(f => (
              <div key={f.id} style={{ marginBottom: 12 }}>
                <button
                  onClick={() => setSelectedFormatForEdit(selectedFormatForEdit === f.id ? null : f.id)}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: selectedFormatForEdit === f.id ? `${ACCENT}12` : '#f8fafc',
                    border: `1px solid ${customPrompts[f.id] ? ACCENT + '40' : '#e2e8f0'}`,
                    borderRadius: 7,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 600,
                    color: customPrompts[f.id] ? ACCENT : '#475569',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <f.icon size={12} />
                    <span>{f.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {customPrompts[f.id] && <span style={{ fontSize: 8 }}>✓</span>}
                    <span style={{ fontSize: 9 }}>{selectedFormatForEdit === f.id ? '▲' : '▼'}</span>
                  </div>
                </button>

                {selectedFormatForEdit === f.id && (
                  <div style={{ marginTop: 8 }}>
                    <PromptEditor
                      customPrompt={customPrompts[f.id] || ''}
                      onSave={(prompt) => handleSaveCustomPrompt(f.id, prompt)}
                      masterPrompt={getMasterPromptForFormat(f.id)}
                      accentColor={ACCENT}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            padding: '8px 10px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            flexShrink: 0,
          }}
        >
          {FORMAT_DEFS.map(f => (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 0',
              }}
            >
              <button
                onClick={() => toggleFormat(f.id)}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 9,
                  fontWeight: 600,
                  background: formats[f.id] ? `${ACCENT}12` : '#f8fafc',
                  border: `1px solid ${formats[f.id] ? ACCENT + '40' : '#e2e8f0'}`,
                  color: formats[f.id] ? ACCENT : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.12s',
                  flex: 1,
                }}
              >
                <f.icon size={12} /> {f.label}
              </button>

              {formats[f.id] && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 5,
                  padding: '2px 6px',
                }}>
                  <button
                    onClick={() => updateFormatCount(f.id, (formatCounts[f.id] || 1) - 1)}
                    onMouseDown={e => e.stopPropagation()}
                    disabled={(formatCounts[f.id] || 1) <= 1}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 3,
                      border: '1px solid #e2e8f0',
                      background: (formatCounts[f.id] || 1) <= 1 ? '#f1f5f9' : '#fff',
                      color: (formatCounts[f.id] || 1) <= 1 ? '#cbd5e1' : '#64748b',
                      fontSize: 12,
                      cursor: (formatCounts[f.id] || 1) <= 1 ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >−</button>
                  <span style={{ fontSize: 9, fontWeight: 600, color: '#64748b', minWidth: 12, textAlign: 'center' }}>
                    {formatCounts[f.id] || 1}
                  </span>
                  <button
                    onClick={() => updateFormatCount(f.id, (formatCounts[f.id] || 1) + 1)}
                    onMouseDown={e => e.stopPropagation()}
                    disabled={(formatCounts[f.id] || 1) >= 5}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 3,
                      border: '1px solid #e2e8f0',
                      background: (formatCounts[f.id] || 1) >= 5 ? '#f1f5f9' : '#fff',
                      color: (formatCounts[f.id] || 1) >= 5 ? '#cbd5e1' : '#64748b',
                      fontSize: 12,
                      cursor: (formatCounts[f.id] || 1) >= 5 ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >+</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div
          className="nodrag nopan"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          {state === 'idle' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ fontSize: 28, opacity: 0.12 }}>↺</div>
              <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
                Conectá una fuente de contenido
                <br />
                y elegí los formatos de salida
              </div>
            </div>
          )}

          {(state === 'running' || running) && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <ThinkingDots />
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Adaptando a {selectedCount} formatos…</div>
            </div>
          )}

          {state === 'error' && (
            <div style={{ padding: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 10, color: '#dc2626', lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          {state === 'done' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <CheckCircle size={32} strokeWidth={1.5} style={{ opacity: 0.3 }} />
              <div style={{ fontSize: 10, color: '#16a34a', textAlign: 'center', lineHeight: 1.6 }}>
                ¡Listo! Se generaron {selectedCount} formato{selectedCount > 1 ? 's' : ''} a la derecha
              </div>
              <div style={{ fontSize: 9, color: '#94a3b8', marginTop: -4 }}>
                Cada formato es un nodo conectable
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
          <button
            onClick={handleRun}
            disabled={running}
            onMouseDown={e => e.stopPropagation()}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: 8,
              border: 'none',
              background: running ? '#f1f5f9' : ACCENT,
              color: running ? '#94a3b8' : '#fff',
              fontSize: 11,
              fontWeight: 700,
              cursor: running ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {running ? (
              <>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    border: `2px solid ${ACCENT}40`,
                    borderTopColor: ACCENT,
                    animation: 'spin 0.7s linear infinite',
                    display: 'inline-block'
                  }}
                />
                Adaptando…
              </>
            ) : state === 'done' ? '↺ Readaptar' : '↺ Adaptar contenido'}
          </button>
        </div>
      </div>

      {overlay && (
        <ContentOverlay
          def={overlay.def}
          content={overlay.content}
          onClose={() => setOverlay(null)}
        />
      )}

      <Handle
        type="target"
        position={Position.Left}
        style={{ background: ACCENT, border: `2px solid ${ACCENT}60`, width: 10, height: 10 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#22c55e', border: '2px solid #16a34a60', width: 10, height: 10 }}
      />
    </>
  )
}