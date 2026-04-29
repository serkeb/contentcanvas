import { useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position, NodeToolbar, useReactFlow } from '@xyflow/react'
import { runLLM } from '../utils/api'
import { useConnectedSources } from '../utils/useConnectedSources'
import { groupedModels, getDefaultModel, MODELS } from '../utils/models'
import { loadApiKeys } from '../utils/storage'
import PromptEditor from '../components/PromptEditor'
import { Settings } from 'lucide-react'

const ACCENT = '#8b5cf6'
const NODE_W = 260
const PANEL_W = 300

// ── Config options ────────────────────────────────────────────────────────────
const OBJECTIVES = [
  { id: 'warm_up_before_reel', label: '🔥 Calentar antes de un Reel' },
  { id: 'support_published_reel', label: '📢 Apoyar Reel publicado' },
  { id: 'sell_product_service', label: '💰 Vender producto/servicio' },
  { id: 'announce_something', label: '📣 Anunciar algo' },
  { id: 'educate', label: '🎓 Educar' },
  { id: 'engage_audience', label: '🔁 Engagement con audiencia' },
  { id: 'build_trust', label: '🤝 Generar confianza' },
  { id: 'drive_dms', label: '💬 Atraer DMs' },
  { id: 'soft_nurture', label: '💛 Nurturing suave' },
  { id: 'objection_handling', label: '🛡️ Manejar objeciones' },
]

const LENGTHS = [
  { id: '1', label: '1 historia' },
  { id: '3', label: '3 historias' },
  { id: '5', label: '5 historias' },
  { id: '7', label: '7 historias' },
]

const AWARENESS = [
  { id: 'cold', label: '❄️ Frío (no me conoce)' },
  { id: 'warm', label: '🌤️ Tibio (me siguió o vio)' },
  { id: 'hot', label: '🔥 Caliente (listo para comprar)' },
]

const TONES = [
  { id: 'casual', label: 'Casual' },
  { id: 'authority', label: 'Autoridad' },
  { id: 'emotional', label: 'Emocional' },
  { id: 'direct', label: 'Directo' },
  { id: 'playful', label: 'Juguetón' },
  { id: 'urgent', label: 'Urgente' },
  { id: 'aspirational', label: 'Aspiracional' },
  { id: 'intimate', label: 'Íntimo' },
]

const CTA_TYPES = [
  { id: 'watch_reel', label: '▶ Ver el Reel' },
  { id: 'reply_to_story', label: '💬 Responder historia' },
  { id: 'vote_poll', label: '🗳 Votar encuesta' },
  { id: 'answer_question', label: '❓ Responder pregunta' },
  { id: 'click_link', label: '🔗 Clic en link' },
  { id: 'send_dm_keyword', label: '📩 DM con palabra clave' },
  { id: 'go_to_whatsapp', label: '📱 Ir a WhatsApp' },
  { id: 'save_this', label: '🔖 Guardar esto' },
]

const STORY_FORMATS = [
  { id: 'talking_head', label: 'Hablando a cámara' },
  { id: 'text_only', label: 'Solo texto' },
  { id: 'selfie', label: 'Selfie' },
  { id: 'b_roll', label: 'B-Roll' },
  { id: 'screenshot', label: 'Screenshot' },
  { id: 'product_shot', label: 'Foto de producto' },
  { id: 'mixed', label: 'Mixto (lo que sea)' },
  { id: 'poll_led', label: 'Liderado por encuesta' },
  { id: 'question_led', label: 'Liderado por pregunta' },
]

const OUTPUT_STYLES = [
  { id: 'compact', label: '⚡ Compacto (rápida lectura)' },
  { id: 'strategic', label: '🧠 Estratégico (con razonamiento)' },
  { id: 'creator_friendly', label: '🎬 Para creador (listo para grabar)' },
  { id: 'client_ready', label: '📋 Para cliente (presentable)' },
]

const SOURCE_PRIORITIES = [
  { id: 'transcript_first', label: '📄 Priorizar transcripción' },
  { id: 'topic_first', label: '📝 Priorizar tema manual' },
  { id: 'balanced', label: '⚖ Balanceado' },
]

// ── Shared components ─────────────────────────────────────────────────────────
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
              <option key={m.id} value={m.id}>{m.label}{m.recommended ? ' ★' : ''}</option>
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
      {label && (
        <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {label}
        </span>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onMouseDown={e => e.stopPropagation()}
        className="nodrag nopan"
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 7,
          color: '#334155',
          fontSize: 11,
          fontWeight: 500,
          fontFamily: 'system-ui',
          padding: '5px 8px',
          outline: 'none',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        {options.map(o => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      onMouseDown={e => e.stopPropagation()}
      className="nodrag nopan"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        width: '100%',
        padding: '7px 9px',
        borderRadius: 8,
        border: `1px solid ${checked ? `${ACCENT}55` : '#e2e8f0'}`,
        background: checked ? '#f5f3ff' : '#f8fafc',
        cursor: 'pointer',
        fontSize: 11,
        color: '#334155',
        fontWeight: 600,
      }}
    >
      <span>{label}</span>
      <span
        style={{
          width: 30,
          height: 17,
          borderRadius: 999,
          background: checked ? ACCENT : '#cbd5e1',
          position: 'relative',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 15 : 2,
            width: 13,
            height: 13,
            borderRadius: '50%',
            background: '#fff',
            transition: 'all 0.15s',
          }}
        />
      </span>
    </button>
  )
}

// ── Prompt helpers ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are an expert Instagram Stories strategist for creators, brands, and service businesses.

Your task is NOT to generate random story ideas.
Your task is to build strategic Instagram Story sequences where each story has a distinct role and the full sequence serves a clear objective.

General rules:
- Each story must serve a different function in the sequence
- Avoid repetition across consecutive stories
- The sequence must progress naturally from one step to the next
- Each story must add something new
- Make the sequence feel native to Instagram Stories
- Prioritize usefulness and execution over generic creativity
- Avoid vague motivational filler
- Avoid making every story sound like a hard sales pitch unless the objective requires it
- Use brand voice for tone and style, but do not let it override the sequence objective
- If source content exists, use it as the main basis for the sequence depending on source priority
- Keep outputs concrete, executable, and practical for a creator or strategist

Output rules:
- Return ONLY valid JSON
- Do not wrap JSON in markdown
- Do not include explanations outside the JSON
`

function getObjectiveInstructions(objective) {
  switch (objective) {
    case 'warm_up_before_reel':
      return `
Objective-specific rules:
- Build interest before the reel is published or before the audience watches it
- Start with identification, tension, curiosity, or a relatable setup
- Create a bridge into the reel topic
- End by naturally pushing the audience to watch the reel
- Avoid sounding too promotional
- The sequence should feel like warm-up, not like a standalone sales flow
`
    case 'support_published_reel':
      return `
Objective-specific rules:
- Assume the reel is already live
- Clearly remind the audience that a reel is available
- Reinforce the main idea of the reel without repeating it word-for-word
- Include at least one follow-up or interaction angle
- End with a CTA to watch the reel or respond
`
    case 'sell_product_service':
      return `
Objective-specific rules:
- Build persuasion gradually
- Use a natural structure such as problem -> tension -> solution -> trust/proof -> CTA
- Do not push the sale too early unless audience awareness is hot
- Make the CTA clear and actionable
`
    case 'announce_something':
      return `
Objective-specific rules:
- Make the announcement clear
- Add light narrative or framing so it does not feel flat
- Build a small amount of anticipation or relevance before the core announcement
- Close with a clear next action
`
    case 'educate':
      return `
Objective-specific rules:
- Focus on clarity and value
- Break the idea into digestible steps or angles
- Avoid overwhelming with too much information
- End with a soft CTA or interaction if appropriate
`
    case 'engage_audience':
      return `
Objective-specific rules:
- Prioritize interaction and watch-through
- Include at least one real interactive mechanism such as poll, question, slider, or direct reply trigger
- Keep the flow easy to answer and emotionally low-friction
`
    case 'build_trust':
      return `
Objective-specific rules:
- Focus on credibility, empathy, proof, or thoughtful positioning
- Use reassurance, clarity, or perspective-building
- Avoid coming across as defensive or overly salesy
`
    case 'drive_dms':
      return `
Objective-specific rules:
- Build toward a reply or DM action
- The final CTA must clearly invite a DM, reply, or keyword
- Make the sequence feel conversational and low-friction
`
    case 'soft_nurture':
      return `
Objective-specific rules:
- Focus on connection, consistency, and light value
- Avoid urgency-heavy language
- The sequence should feel warm and natural, not like a campaign push
`
    case 'objection_handling':
      return `
Objective-specific rules:
- Surface a relevant objection early
- Reframe it clearly and credibly
- Use trust, clarity, proof, or nuance to lower resistance
- End with a soft but clear next step
`
    default:
      return ''
  }
}

function summarizeBrandVoice(brandVoice, personName) {
  if (!brandVoice) return ''

  if (typeof brandVoice === 'string') {
    return `Brand voice for ${personName || 'creator'}: ${brandVoice.slice(0, 900)}`
  }

  const preferredFields = [
    'tone',
    'style',
    'voice',
    'communication_style',
    'writing_style',
    'personality',
    'hooks',
    'cadence',
    'rhythm',
    'avoid',
    'dos',
    'donts',
    'characteristics',
    'summary',
    'notes',
  ]

  const parts = []
  for (const key of preferredFields) {
    if (brandVoice?.[key]) {
      const value = typeof brandVoice[key] === 'string'
        ? brandVoice[key]
        : JSON.stringify(brandVoice[key])
      parts.push(`${key}: ${value}`)
    }
  }

  if (parts.length === 0) {
    parts.push(JSON.stringify(brandVoice).slice(0, 900))
  }

  return `Brand voice summary for ${personName || 'creator'}:\n${parts.join('\n').slice(0, 1500)}`
}

function summarizeTranscripts(transcripts = []) {
  if (!transcripts?.length) return ''

  const top = transcripts.slice(0, 5)
  const chunks = top.map((t, i) => {
    const title = t?.title || t?.url || `Source ${i + 1}`
    const transcript = (t?.transcript || '').replace(/\s+/g, ' ').trim().slice(0, 750)
    return `[${i + 1}] ${title}\n${transcript}`
  })

  return `Connected source material:\n${chunks.join('\n\n')}`
}

function getSourcePriorityInstructions(sourcePriority) {
  switch (sourcePriority) {
    case 'transcript_first':
      return `
Source priority:
- Use connected transcripts as the primary factual/context basis
- Use manual topic only as framing or extra context
- Use brand voice for style and tone, not for factual content
`
    case 'topic_first':
      return `
Source priority:
- Use the manual topic/context as the main direction
- Use transcripts only as supporting references
- Use brand voice for style and tone
`
    default:
      return `
Source priority:
- Balance manual topic, transcript context, and brand voice
- Prefer source material when it provides stronger specificity
- Use brand voice mainly for tone/style rather than factual content
`
  }
}

function buildUserPrompt({
  objective,
  length,
  awareness,
  tone,
  ctaType,
  storyFormat,
  outputStyle,
  topic,
  transcripts,
  brandVoice,
  personName,
  includeSpokenLines,
  includeStickers,
  sourcePriority,
}) {
  const objectiveLabel = OBJECTIVES.find(o => o.id === objective)?.label || objective
  const awarenessLabel = AWARENESS.find(a => a.id === awareness)?.label || awareness
  const toneLabel = TONES.find(t => t.id === tone)?.label || tone
  const ctaLabel = CTA_TYPES.find(c => c.id === ctaType)?.label || ctaType
  const formatLabel = STORY_FORMATS.find(f => f.id === storyFormat)?.label || storyFormat
  const outputLabel = OUTPUT_STYLES.find(s => s.id === outputStyle)?.label || outputStyle

  const transcriptSummary = summarizeTranscripts(transcripts)
  const brandVoiceSummary = summarizeBrandVoice(brandVoice, personName)

  return `
Create a strategic Instagram Story sequence with the following setup:

Objective: ${objectiveLabel}
Sequence length: ${length} stories
Audience awareness: ${awarenessLabel}
Tone: ${toneLabel}
Primary CTA: ${ctaLabel}
Preferred format: ${formatLabel}
Output style: ${outputLabel}
Include spoken lines: ${includeSpokenLines ? 'yes' : 'no'}
Include stickers: ${includeStickers ? 'yes' : 'no'}

${getObjectiveInstructions(objective)}
${getSourcePriorityInstructions(sourcePriority)}

Main topic / manual context:
${topic?.trim() ? topic.trim() : 'No manual topic provided.'}

${transcriptSummary || 'No transcript sources connected.'}

${brandVoiceSummary || 'No brand voice connected.'}

Important sequence rules:
- Every story must have a distinct role
- Avoid repeating the same angle, emotional beat, or rhetorical structure
- Each story should move the audience forward
- The sequence must feel coherent and intentionally ordered
- Keep it natural for Instagram Stories
- If spoken lines are disabled, keep spoken_line as an empty string
- If stickers are disabled, set sticker_type to "none" and sticker_text to ""
- If output style is not "strategic", keep reasoning_short brief and concise anyway
- If preferred format is "mixed", choose the best format story by story
- Make the final CTA match the selected objective and CTA type

Return ONLY valid JSON with this exact structure:
{
  "stories": [
    {
      "story_number": 1,
      "story_role": "short role label",
      "goal": "specific goal of this story",
      "format": "talking_head | text_only | selfie | b_roll | screenshot | product_shot | poll_led | question_led | mixed",
      "visual_direction": "brief visual execution guidance",
      "on_screen_text": "exact text shown on screen",
      "spoken_line": "spoken line or empty string if disabled",
      "sticker_type": "poll | question | slider | quiz | countdown | link | none",
      "sticker_text": "text for sticker or empty string",
      "cta": "specific CTA for this story",
      "reasoning_short": "brief reason for why this story exists here",
      "design_note": "practical execution note"
    }
  ],
  "sequence_logic": "brief explanation of the narrative logic of the sequence"
}
`.trim()
}

// ── JSON parsing helpers ──────────────────────────────────────────────────────
function stripCodeFences(raw = '') {
  let text = String(raw).trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/\n?```$/, '').trim()
  }
  return text
}

function safeParseJSON(raw) {
  return JSON.parse(stripCodeFences(raw))
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StoryFlowNode({ id, data, selected }) {
  const { setNodes, setEdges, getNodes, deleteElements } = useReactFlow()
  const nodeRef = useRef(null)
  const panelRef = useRef(null)

  const [showPanel, setShowPanel] = useState(false)
  const [running, setRunning] = useState(false)

  const [model,     setModel]     = useState(data.model     || getDefaultModel(loadApiKeys()))
  const [objective, setObjective] = useState(data.objective || 'warm_up_before_reel')
  const [length, setLength] = useState(data.length || '5')
  const [awareness, setAwareness] = useState(data.awareness || 'warm')
  const [tone, setTone] = useState(data.tone || 'casual')
  const [ctaType, setCtaType] = useState(data.ctaType || 'watch_reel')
  const [storyFormat, setStoryFormat] = useState(data.storyFormat || 'mixed')
  const [outputStyle, setOutputStyle] = useState(data.outputStyle || 'creator_friendly')
  const [topic, setTopic] = useState(data.topic || '')
  const [customPrompt, setCustomPrompt] = useState(data.customPrompt || '')
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [includeSpokenLines, setIncludeSpokenLines] = useState(
    data.includeSpokenLines ?? true
  )
  const [includeStickers, setIncludeStickers] = useState(
    data.includeStickers ?? true
  )
  const [sourcePriority, setSourcePriority] = useState(
    data.sourcePriority || 'balanced'
  )


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
    const objectiveLabel = OBJECTIVES.find(o => o.id === objective)?.label || objective
    const awarenessLabel = AWARENESS.find(a => a.id === awareness)?.label || awareness
    const toneLabel = TONES.find(t => t.id === tone)?.label || tone
    const ctaLabel = CTA_TYPES.find(c => c.id === ctaType)?.label || ctaType
    const formatLabel = STORY_FORMATS.find(f => f.id === storyFormat)?.label || storyFormat
    const outputLabel = OUTPUT_STYLES.find(s => s.id === outputStyle)?.label || outputStyle

    const userPrompt = buildUserPrompt({
      objective,
      length,
      awareness,
      tone,
      ctaType,
      storyFormat,
      outputStyle,
      topic,
      transcripts,
      brandVoice,
      personName,
      includeSpokenLines,
      includeStickers,
      sourcePriority,
    })

    return `[SYSTEM PROMPT]\n\n${SYSTEM_PROMPT.trim()}\n\n\n[USER PROMPT]\n\n${userPrompt}`
  }

  async function handleGenerate() {
    setRunning(true)
    persist({ state: 'running', error: null })

    try {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildUserPrompt({
            objective,
            length,
            awareness,
            tone,
            ctaType,
            storyFormat,
            outputStyle,
            topic,
            transcripts,
            brandVoice,
            personName,
            includeSpokenLines,
            includeStickers,
            sourcePriority,
          }),
        },
      ]

      let res = await runLLM(messages, [], model, [], null, customPrompt)
      let raw = (res?.result || '').trim()
      let parsed

      try {
        parsed = safeParseJSON(raw)
      } catch {
        const repairMessages = [
          {
            role: 'system',
            content: 'You repair malformed JSON. Return ONLY valid JSON. Do not add commentary.',
          },
          {
            role: 'user',
            content: `Fix this into valid JSON matching the same intended schema. Return only JSON:\n\n${stripCodeFences(raw)}`,
          },
        ]
        const repairRes = await runLLM(repairMessages, [], model, [], null, null)
        parsed = safeParseJSON(repairRes?.result || '')
      }

      const thisNode = getNodes().find(n => n.id === id)
      const posX = (thisNode?.position?.x || 0) + NODE_W + 60
      const posY = thisNode?.position?.y || 0

      const outputId = `story-out-${Date.now()}`

      setNodes(nds => [...nds, {
        id: outputId,
        type: 'storyFlowOutputNode',
        position: { x: posX, y: posY },
        style: { width: 400, height: Math.max(460, parseInt(length, 10) * 170) },
        data: {
          stories: parsed?.stories || [],
          sequenceLogic: parsed?.sequence_logic || '',
          objective,
          length,
          awareness,
          tone,
          ctaType,
          storyFormat,
          outputStyle,
          topic,
          includeSpokenLines,
          includeStickers,
          sourcePriority,
          model,
        },
      }])

      setEdges(eds => [...eds, {
        id: `e-${id}-${outputId}`,
        source: id,
        target: outputId,
        sourceHandle: 'out',
        type: 'deletable',
        style: { stroke: `${ACCENT}70`, strokeWidth: 1.5, strokeDasharray: '4 3' },
        markerEnd: { type: 'arrowclosed', color: `${ACCENT}70` },
      }])

      persist({
        state: 'done',
        error: null,
        objective,
        length,
        awareness,
        tone,
        ctaType,
        storyFormat,
        outputStyle,
        topic,
        includeSpokenLines,
        includeStickers,
        sourcePriority,
        model,
      })
    } catch (err) {
      persist({
        state: 'error',
        error: err?.message || 'Error generando stories',
      })
    } finally {
      setRunning(false)
    }
  }

  // Visual state
  const stateColor = state === 'done'
    ? '#16a34a'
    : state === 'error'
      ? '#dc2626'
      : state === 'running'
        ? ACCENT
        : '#94a3b8'

  const stateLabel = state === 'done'
    ? '✓ Listo'
    : state === 'error'
      ? '✕ Error'
      : state === 'running'
        ? '⟳ Generando'
        : ''

  const objectiveDef = OBJECTIVES.find(o => o.id === objective) || OBJECTIVES[0]
  const lengthLabel = `${length} hist.`

  return (
    <>
      <style>{`@keyframes spin-sf { to { transform: rotate(360deg) } }`}</style>

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

      {/* ── Config panel ── */}
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
            boxShadow: '0 8px 32px rgba(139,92,246,0.18)',
            padding: '14px',
            zIndex: 9999,
            fontFamily: 'system-ui',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: ACCENT, letterSpacing: '0.05em' }}>
              📱 STORY FLOW CONFIG
            </span>
            <button
              onClick={() => setShowPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: 14,
                cursor: 'pointer',
                lineHeight: 1,
                padding: 0,
              }}
            >
              ✕
            </button>
          </div>

          <ModelSel value={model} onChange={v => { setModel(v); persist({ model: v }) }} />

          <button
            onClick={() => setShowPromptEditor(v => !v)}
            onMouseDown={e => e.stopPropagation()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              background: showPromptEditor || customPrompt ? `${ACCENT}15` : '#f8fafc',
              border: `1px solid ${showPromptEditor || customPrompt ? ACCENT : '#e2e8f0'}`,
              borderRadius: 5, padding: '3px 7px',
              cursor: 'pointer', fontSize: 9, fontWeight: 600,
              color: showPromptEditor || customPrompt ? ACCENT : '#64748b',
              transition: 'all 0.15s',
            }}
            title={customPrompt ? 'Prompt personalizado configurado' : 'Personalizar prompt del sistema'}
          >
            <Settings size={10} strokeWidth={2} />
            {customPrompt && '✓'}
          </button>

          {showPromptEditor && (
            <div style={{ gridColumn: '1 / -1' }}>
              <PromptEditor
                customPrompt={customPrompt}
                onSave={handleSaveCustomPrompt}
                masterPrompt={getMasterPrompt()}
                accentColor={ACCENT}
              />
            </div>
          )}

          <Sel
            label="Objetivo"
            value={objective}
            onChange={v => { setObjective(v); persist({ objective: v }) }}
            options={OBJECTIVES}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Sel
              label="Cantidad"
              value={length}
              onChange={v => { setLength(v); persist({ length: v }) }}
              options={LENGTHS}
            />
            <Sel
              label="Consciencia"
              value={awareness}
              onChange={v => { setAwareness(v); persist({ awareness: v }) }}
              options={AWARENESS}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Sel
              label="Tono"
              value={tone}
              onChange={v => { setTone(v); persist({ tone: v }) }}
              options={TONES}
            />
            <Sel
              label="CTA"
              value={ctaType}
              onChange={v => { setCtaType(v); persist({ ctaType: v }) }}
              options={CTA_TYPES}
            />
          </div>

          <Sel
            label="Formato preferido"
            value={storyFormat}
            onChange={v => { setStoryFormat(v); persist({ storyFormat: v }) }}
            options={STORY_FORMATS}
          />

          <Sel
            label="Estilo de output"
            value={outputStyle}
            onChange={v => { setOutputStyle(v); persist({ outputStyle: v }) }}
            options={OUTPUT_STYLES}
          />

          <Sel
            label="Prioridad de fuentes"
            value={sourcePriority}
            onChange={v => { setSourcePriority(v); persist({ sourcePriority: v }) }}
            options={SOURCE_PRIORITIES}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            <Toggle
              label="Incluir líneas habladas"
              checked={includeSpokenLines}
              onChange={(v) => { setIncludeSpokenLines(v); persist({ includeSpokenLines: v }) }}
            />
            <Toggle
              label="Incluir stickers"
              checked={includeStickers}
              onChange={(v) => { setIncludeStickers(v); persist({ includeStickers: v }) }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Contexto / Tema
            </span>
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onBlur={() => persist({ topic })}
              placeholder="Ej: Lanzo mi curso el lunes. Quiero calentar la audiencia antes del reel..."
              rows={4}
              style={{
                width: '100%',
                fontSize: 11,
                color: '#0f172a',
                fontFamily: 'system-ui',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 7,
                padding: '6px 9px',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                lineHeight: 1.5,
              }}
            />
          </div>

          {brandVoice && (
            <div style={{ fontSize: 10, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, padding: '5px 8px' }}>
              🎯 <strong>{personName || 'BrandVoice'}</strong> conectado — usará su voz
            </div>
          )}

          {connectedCount > 0 && (
            <div style={{ fontSize: 10, color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '5px 8px' }}>
              📎 {connectedCount} fuente{connectedCount > 1 ? 's' : ''} conectada{connectedCount > 1 ? 's' : ''} — transcripts: {transcripts.length} {brandVoice ? '• brand voice: sí' : ''}
            </div>
          )}

          {state === 'error' && error && (
            <div style={{ fontSize: 10, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '6px 8px', lineHeight: 1.4 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={running}
            style={{
              width: '100%',
              padding: '9px',
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
              marginTop: 2,
            }}
          >
            {running
              ? (
                <>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      border: `2px solid ${ACCENT}40`,
                      borderTopColor: ACCENT,
                      animation: 'spin-sf 0.7s linear infinite',
                      display: 'inline-block',
                    }}
                  />
                  Generando…
                </>
              )
              : state === 'done'
                ? '🔄 Regenerar stories'
                : '✦ Generar stories'}
          </button>
        </div>
      )}

      {/* ── Compact card ── */}
      <div
        ref={nodeRef}
        style={{
          width: NODE_W,
          minHeight: 140,
          background: '#fff',
          border: `1.5px solid ${selected ? `${ACCENT}60` : '#e2e8f0'}`,
          borderRadius: 14,
          fontFamily: 'system-ui',
          overflow: 'hidden',
          boxShadow: selected
            ? `0 0 0 3px ${ACCENT}12, 0 6px 20px rgba(139,92,246,0.13)`
            : '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ height: 3, background: `linear-gradient(90deg, ${ACCENT}, #a78bfa, #c4b5fd)` }} />

        <div style={{ padding: '9px 11px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: ACCENT, letterSpacing: '0.04em', flexShrink: 0 }}>
            📱 STORIES
          </span>

          <span
            style={{
              fontSize: 9,
              color: '#7c3aed',
              background: '#f5f3ff',
              border: '1px solid #ddd6fe',
              borderRadius: 5,
              padding: '2px 6px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {lengthLabel}
          </span>

          <div style={{ flex: 1 }} />

          {state !== 'idle' && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: stateColor,
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                flexShrink: 0,
              }}
            >
              {state === 'running'
                ? (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      border: `2px solid ${ACCENT}30`,
                      borderTopColor: ACCENT,
                      animation: 'spin-sf 0.7s linear infinite',
                      display: 'inline-block',
                    }}
                  />
                )
                : (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: stateColor,
                      display: 'inline-block',
                    }}
                  />
                )}
              {stateLabel}
            </span>
          )}

          <button
            onClick={() => setShowPanel(v => !v)}
            onMouseDown={e => e.stopPropagation()}
            title="Configurar"
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              flexShrink: 0,
              background: showPanel ? `${ACCENT}12` : 'transparent',
              border: `1px solid ${showPanel ? `${ACCENT}35` : '#e2e8f0'}`,
              color: showPanel ? ACCENT : '#94a3b8',
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.12s',
            }}
          >
            ⚙
          </button>
        </div>

        <div style={{ padding: '0 11px 5px', display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 9,
              color: '#0369a1',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 5,
              padding: '2px 6px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {AWARENESS.find(a => a.id === awareness)?.label?.split(' ')[0]} {TONES.find(t => t.id === tone)?.label}
          </span>

          {includeStickers && (
            <span
              style={{
                fontSize: 9,
                color: '#7c2d12',
                background: '#fff7ed',
                border: '1px solid #fdba74',
                borderRadius: 5,
                padding: '2px 6px',
                fontWeight: 700,
              }}
            >
              🏷 Stickers
            </span>
          )}
        </div>

        <div style={{ padding: '0 11px 9px' }}>
          <div
            style={{
              fontSize: 11,
              color: '#334155',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.4,
            }}
          >
            {objectiveDef.label}
          </div>

          <div
            style={{
              fontSize: 10,
              color: '#94a3b8',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {MODELS.find(m => m.id === model)?.label || model}
          </div>

          {topic && (
            <div
              style={{
                fontSize: 10,
                color: '#94a3b8',
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {topic}
            </div>
          )}
        </div>

        <div style={{ height: 1, background: '#f1f5f9' }} />

        <div style={{ padding: '8px 10px 10px', marginTop: 'auto' }}>
          <button
            onClick={handleGenerate}
            disabled={running}
            onMouseDown={e => e.stopPropagation()}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 8,
              border: 'none',
              background: running ? '#f1f5f9' : state === 'done' ? '#f5f3ff' : ACCENT,
              color: running ? '#94a3b8' : state === 'done' ? ACCENT : '#fff',
              border: `1px solid ${running ? '#e2e8f0' : state === 'done' ? `${ACCENT}30` : 'transparent'}`,
              fontSize: 11,
              fontWeight: 700,
              cursor: running ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              transition: 'all 0.12s',
              letterSpacing: '0.01em',
            }}
          >
            {running
              ? (
                <>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      border: `2px solid ${ACCENT}30`,
                      borderTopColor: ACCENT,
                      animation: 'spin-sf 0.7s linear infinite',
                      display: 'inline-block',
                    }}
                  />
                  Generando…
                </>
              )
              : state === 'done'
                ? '↺ Regenerar'
                : '✦ Generar stories'}
          </button>
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