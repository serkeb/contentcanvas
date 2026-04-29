import { useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position, NodeResizer, NodeToolbar, useReactFlow } from '@xyflow/react'
import { runLLM } from '../utils/api'
import { useConnectedSources } from '../utils/useConnectedSources'
import ModelSel from '../components/ModelSel'
import PromptEditor from '../components/PromptEditor'
import { getDefaultModel } from '../utils/models'
import { loadApiKeys } from '../utils/storage'
import { Settings } from 'lucide-react'

const ACCENT = '#f59e0b'

const QUANTITIES = [5, 10, 15, 20]
const PLATFORMS = [
  { id: 'all', label: 'Todas las plataformas' },
  { id: 'tiktok', label: '🎵 TikTok' },
  { id: 'instagram', label: '📷 Instagram' },
  { id: 'youtube', label: '▶️ YouTube' },
  { id: 'linkedin', label: '💼 LinkedIn' },
]
const FORMATS = [
  { id: 'all', label: 'Todos los formatos' },
  { id: 'reel', label: 'Reel / Short' },
  { id: 'carrusel', label: 'Carrusel' },
  { id: 'post', label: 'Post' },
  { id: 'hilo', label: 'Hilo' },
]

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

function IdeaCard({ idea, onToggleFav }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: idea.favorite ? `${ACCENT}06` : '#f8fafc',
        border: `1px solid ${idea.favorite ? ACCENT + '30' : '#e2e8f0'}`,
        borderRadius: 9, padding: '9px 11px',
        transition: 'border-color 0.1s, background 0.1s',
        position: 'relative',
      }}
    >
      {/* Star + format */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
        <button
          onClick={onToggleFav}
          onMouseDown={e => e.stopPropagation()}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 13, flexShrink: 0, lineHeight: 1,
            opacity: idea.favorite || hovered ? 1 : 0.3,
            transition: 'opacity 0.15s',
          }}
          title={idea.favorite ? 'Quitar favorito' : 'Marcar favorito'}
        >{idea.favorite ? '⭐' : '☆'}</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', lineHeight: 1.3, marginBottom: 2 }}>
            {idea.titulo}
          </div>
          <div style={{ fontSize: 10, color: '#475569', fontStyle: 'italic', lineHeight: 1.4, marginBottom: 5 }}>
            {idea.angulo}
          </div>
        </div>

        {idea.formato && (
          <span style={{
            fontSize: 8, fontWeight: 700, color: ACCENT, background: `${ACCENT}12`,
            border: `1px solid ${ACCENT}25`, borderRadius: 4, padding: '2px 5px',
            whiteSpace: 'nowrap', flexShrink: 0, alignSelf: 'flex-start',
          }}>{idea.formato}</span>
        )}
      </div>

      {idea.porQue && (
        <div style={{ fontSize: 9, color: '#64748b', lineHeight: 1.5 }}>
          💡 {idea.porQue}
        </div>
      )}
    </div>
  )
}

export default function IdeasNode({ id, data, selected }) {
  const { setNodes, deleteElements } = useReactFlow()
  const nodeRef = useRef(null)
  const [running, setRunning] = useState(false)
  const [model, setModel] = useState(() => data.model || getDefaultModel(loadApiKeys()))
  const [quantity, setQuantity] = useState(data.quantity || 10)
  const [platform, setPlatform] = useState(data.platform || 'all')
  const [format, setFormat] = useState(data.format || 'all')
  const [filter, setFilter] = useState('all') // all | favorites
  const [customPrompt, setCustomPrompt] = useState(data.customPrompt || '')
  const [showPromptEditor, setShowPromptEditor] = useState(false)

  const state = data.state || 'idle'
  const ideas = data.ideas || []
  const error = data.error || null

  // Reactive — updates immediately when nodes are connected/disconnected
  const { transcripts, brandVoice } = useConnectedSources(id)
  const connectedCount = transcripts.length + (brandVoice ? 1 : 0)

  useEffect(() => {
    const el = nodeRef.current; if (!el) return
    const stop = e => e.stopPropagation()
    el.addEventListener('wheel', stop)
    return () => el.removeEventListener('wheel', stop)
  }, [])

  const persist = useCallback((updates) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n))
  }, [id, setNodes])

  function handleSaveCustomPrompt(prompt) {
    setCustomPrompt(prompt)
    persist({ customPrompt: prompt })
  }

  function getMasterPrompt() {
    const platformLabel = PLATFORMS.find(p => p.id === platform)?.label || platform
    const formatLabel = format === 'all'
      ? 'cualquier formato'
      : (FORMATS.find(f => f.id === format)?.label || format)

    const allowedFormats = format === 'all'
      ? ['reel', 'carrusel', 'post', 'hilo']
      : [format]

    const platformBehavior = {
      all: 'Adaptá cada idea al formato y plataforma que mejor la haga funcionar.',
      tiktok: 'Priorizá ideas con hook inmediato, tensión, curiosidad, opinión fuerte o contraste claro.',
      instagram: 'Priorizá ideas claras, compartibles, visuales y fáciles de guardar o enviar.',
      youtube: 'Priorizá ideas con promesa fuerte, profundidad, desarrollo claro y potencial de retención.',
      linkedin: 'Priorizá ideas con opinión, aprendizaje, frameworks, experiencia real o takeaways profesionales.',
    }[platform] || 'Adaptá cada idea a la plataforma elegida.'

    const cleanedSources = transcripts
      .slice(0, 6)
      .map((t, i) => {
        const title = t.title || t.url || `Fuente ${i + 1}`
        const text = (t.transcript || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 1800)

        return `### Fuente ${i + 1}: ${title}\n${text}`
      })
      .join('\n\n')

    const systemPrompt = `
Sos un estratega senior de contenido, posicionamiento y creatividad editorial.

Tu trabajo NO es dar temas sueltos ni ideas genéricas.
Tu trabajo es generar ideas que parezcan listas para convertirse en contenido con potencial real.

Una idea buena debe cumplir la mayor cantidad posible de estos criterios:
- tener un ángulo específico, no un tema amplio
- estar conectada con patrones, tensiones, objeciones, vacíos u oportunidades detectados en las fuentes
- sentirse diferenciada, no reciclada
- tener claridad inmediata
- ser útil, interesante, sorprendente o provocadora
- sonar alineada con la voz de marca si existe
- evitar títulos genéricos tipo "3 tips", "errores comunes", "beneficios de..." salvo que tengan un giro concreto y fuerte

Reglas estrictas:
- No copies frases literales de las fuentes
- No repitas el mismo concepto con wording distinto
- No devuelvas ideas vagas, obvias o intercambiables
- No rellenes con ideas débiles para llegar a la cantidad
- Si hay suficiente material, priorizá ideas nacidas de:
  1. patrones repetidos
  2. contradicciones
  3. huecos no explotados
  4. objeciones latentes
  5. observaciones contraintuitivas
  6. transformaciones concretas
- Variá el tipo de idea dentro del lote: algunas prácticas, algunas opinables, algunas de storytelling, algunas de contraste, algunas de error o creencia equivocada

Pensá primero qué está sobreexplotado y evitá caer ahí.
Después generá ideas más inteligentes.
`.trim()

    const userPrompt = `
Generá exactamente ${quantity} ideas de contenido.

## Parámetros
- Plataforma: ${platformLabel}
- Formato preferido: ${formatLabel}
- Formatos permitidos: ${allowedFormats.join(', ')}
- Instrucción de plataforma: ${platformBehavior}

## Qué priorizar
Quiero ideas:
- originales pero publicables
- específicas y accionables
- con potencial de captar atención
- alineadas al material conectado
- diferenciadas entre sí
- útiles para crear contenido mejor, no solo más contenido

## Qué evitar
Evitá:
- ideas genéricas
- temas demasiado amplios
- reformulaciones del mismo concepto
- consejos vacíos
- ideas que podrían servirle a cualquier nicho sin cambios
- títulos marketineros sin sustancia

## Criterio interno de trabajo
Antes de responder:
1. detectá patrones y temas repetidos en las fuentes
2. identificá oportunidades, vacíos, objeciones o tensiones
3. descartá lo obvio
4. recién ahí proponé ideas

## Brand Voice
${brandVoice?.resumenReutilizable ? brandVoice.resumenReutilizable : 'No hay brand voice conectado. Mantené una voz clara, humana y estratégica.'}

## Material de referencia
${cleanedSources || 'No hay fuentes conectadas. Generá ideas sólidas basadas en el objetivo general y evitá vaguedades.'}

## Calidad mínima por idea
Cada idea debe:
- tener un título concreto y atractivo
- explicar un ángulo específico
- elegir el mejor formato posible dentro de los permitidos
- incluir una razón breve de por qué podría funcionar

## Diversidad del lote
El conjunto completo de ideas no debe sentirse repetitivo.
Mezclá distintos mecanismos, por ejemplo:
- error o creencia equivocada
- contraste o comparación
- storytelling / observación
- opinión o take incómodo
- framework o paso a paso
- objeción o miedo
- oportunidad poco vista
- insight contraintuitivo

## Salida
Devolvé SOLO un array JSON válido.
Sin markdown.
Sin comentarios.
Sin texto antes o después.

Formato exacto:
[
  {
    "titulo": "Título concreto y atractivo",
    "angulo": "Ángulo específico que hace que la idea no sea genérica",
    "formato": "${format === 'all' ? 'reel|carrusel|post|hilo' : format}",
    "porQue": "Por qué esta idea tiene potencial real de funcionar"
  }
]

Reglas finales:
- Generá exactamente ${quantity} items
- Usá solo estos formatos permitidos: ${allowedFormats.join(', ')}
- No repitas ideas similares
- Si dudás entre dos ideas, elegí la más específica
`.trim()

    return `[SYSTEM PROMPT]\n\n${systemPrompt}\n\n\n[USER PROMPT]\n\n${userPrompt}`
  }

  function buildPrompt() {

    const platformLabel = PLATFORMS.find(p => p.id === platform)?.label || platform
    const formatLabel = format === 'all'
      ? 'cualquier formato'
      : (FORMATS.find(f => f.id === format)?.label || format)

    const allowedFormats = format === 'all'
      ? ['reel', 'carrusel', 'post', 'hilo']
      : [format]

    const platformBehavior = {
      all: 'Adaptá cada idea al formato y plataforma que mejor la haga funcionar.',
      tiktok: 'Priorizá ideas con hook inmediato, tensión, curiosidad, opinión fuerte o contraste claro.',
      instagram: 'Priorizá ideas claras, compartibles, visuales y fáciles de guardar o enviar.',
      youtube: 'Priorizá ideas con promesa fuerte, profundidad, desarrollo claro y potencial de retención.',
      linkedin: 'Priorizá ideas con opinión, aprendizaje, frameworks, experiencia real o takeaways profesionales.',
    }[platform] || 'Adaptá cada idea a la plataforma elegida.'

    const cleanedSources = transcripts
      .slice(0, 6)
      .map((t, i) => {
        const title = t.title || t.url || `Fuente ${i + 1}`
        const text = (t.transcript || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 1800)

        return `### Fuente ${i + 1}: ${title}\n${text}`
      })
      .join('\n\n')

    const systemPrompt = `
Sos un estratega senior de contenido, posicionamiento y creatividad editorial.

Tu trabajo NO es dar temas sueltos ni ideas genéricas.
Tu trabajo es generar ideas que parezcan listas para convertirse en contenido con potencial real.

Una idea buena debe cumplir la mayor cantidad posible de estos criterios:
- tener un ángulo específico, no un tema amplio
- estar conectada con patrones, tensiones, objeciones, vacíos u oportunidades detectadas en las fuentes
- sentirse diferenciada, no reciclada
- tener claridad inmediata
- ser útil, interesante, sorprendente o provocadora
- sonar alineada con la voz de marca si existe
- evitar títulos genéricos tipo "3 tips", "errores comunes", "beneficios de..." salvo que tengan un giro concreto y fuerte

Reglas estrictas:
- No copies frases literales de las fuentes
- No repitas el mismo concepto con wording distinto
- No devuelvas ideas vagas, obvias o intercambiables
- No rellenes con ideas débiles para llegar a la cantidad
- Si hay suficiente material, priorizá ideas nacidas de:
  1. patrones repetidos
  2. contradicciones
  3. huecos no explotados
  4. objeciones latentes
  5. observaciones contraintuitivas
  6. transformaciones concretas
- Variá el tipo de idea dentro del lote: algunas prácticas, algunas opinables, algunas de storytelling, algunas de contraste, algunas de error o creencia equivocada

Pensá primero qué está sobreexplotado y evitá caer ahí.
Después generá ideas más inteligentes.
`.trim()

    const userPrompt = `
Generá exactamente ${quantity} ideas de contenido.

## Parámetros
- Plataforma: ${platformLabel}
- Formato preferido: ${formatLabel}
- Formatos permitidos: ${allowedFormats.join(', ')}
- Instrucción de plataforma: ${platformBehavior}

## Qué priorizar
Quiero ideas:
- originales pero publicables
- específicas y accionables
- con potencial de captar atención
- alineadas al material conectado
- diferenciadas entre sí
- útiles para crear contenido mejor, no solo más contenido

## Qué evitar
Evitá:
- ideas genéricas
- temas demasiado amplios
- reformulaciones del mismo concepto
- consejos vacíos
- ideas que podrían servirle a cualquier nicho sin cambios
- títulos marketineros sin sustancia

## Criterio interno de trabajo
Antes de responder:
1. detectá patrones y temas repetidos en las fuentes
2. identificá oportunidades, vacíos, objeciones o tensiones
3. descartá lo obvio
4. recién ahí proponé ideas

## Brand Voice
${brandVoice?.resumenReutilizable ? brandVoice.resumenReutilizable : 'No hay brand voice conectado. Mantené una voz clara, humana y estratégica.'}

## Material de referencia
${cleanedSources || 'No hay fuentes conectadas. Generá ideas sólidas basadas en el objetivo general y evitá vaguedades.'}

## Calidad mínima por idea
Cada idea debe:
- tener un título concreto y atractivo
- explicar un ángulo específico
- elegir el mejor formato posible dentro de los permitidos
- incluir una razón breve de por qué podría funcionar

## Diversidad del lote
El conjunto completo de ideas no debe sentirse repetitivo.
Mezclá distintos mecanismos, por ejemplo:
- error o creencia equivocada
- contraste o comparación
- storytelling / observación
- opinión o take incómodo
- framework o paso a paso
- objeción o miedo
- oportunidad poco vista
- insight contraintuitivo

## Salida
Devolvé SOLO un array JSON válido.
Sin markdown.
Sin comentarios.
Sin texto antes o después.

Formato exacto:
[
  {
    "titulo": "Título concreto y atractivo",
    "angulo": "Ángulo específico que hace que la idea no sea genérica",
    "formato": "${format === 'all' ? 'reel|carrusel|post|hilo' : format}",
    "porQue": "Por qué esta idea tiene potencial real de funcionar"
  }
]

Reglas finales:
- Generá exactamente ${quantity} items
- Usá solo estos formatos permitidos: ${allowedFormats.join(', ')}
- No repitas ideas similares
- Si dudás entre dos ideas, elegí la más específica
`.trim()

    return {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      transcripts
    }
  }

  async function handleRun() {
    setRunning(true)
    persist({ state: 'running', error: null })
    try {
      const { messages, transcripts } = buildPrompt()
      const res = await runLLM(messages, transcripts, model, [], null, customPrompt)

      // Parse JSON response
      let parsed = []
      try {
        // Extract JSON array from response (LLM sometimes adds markdown code fences)
        const jsonMatch = res.result.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          parsed = JSON.parse(res.result)
        }
      } catch {
        throw new Error('No se pudo parsear la respuesta del LLM como JSON. Intentá de nuevo.')
      }

      const ideas = parsed.map((idea, i) => ({
        id: `idea-${Date.now()}-${i}`,
        titulo: idea.titulo || idea.title || 'Sin título',
        angulo: idea.angulo || idea.angle || '',
        formato: idea.formato || idea.format || '',
        porQue: idea.porQue || idea.why || '',
        favorite: false,
      }))

      persist({ state: 'done', ideas, quantity, platform, format })
    } catch (err) {
      persist({ state: 'error', error: err.message })
    } finally {
      setRunning(false)
    }
  }

  function toggleFav(ideaId) {
    const updated = ideas.map(idea =>
      idea.id === ideaId ? { ...idea, favorite: !idea.favorite } : idea
    )
    persist({ ideas: updated })
  }

  const displayedIdeas = filter === 'favorites'
    ? ideas.filter(i => i.favorite)
    : ideas

  const favCount = ideas.filter(i => i.favorite).length

  return (
    <>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-5px);opacity:1} }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <NodeToolbar isVisible={selected} position="top" align="end">
        <button onClick={() => deleteElements({ nodes: [{ id }] })} style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7,
          color: '#dc2626', fontSize: 10, fontWeight: 600, cursor: 'pointer',
          padding: '4px 10px', fontFamily: 'system-ui',
        }}>✕ Eliminar</button>
      </NodeToolbar>

      <NodeResizer
        isVisible={selected} minWidth={320} minHeight={300}
        handleStyle={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', border: `2px solid ${ACCENT}` }}
        lineStyle={{ borderColor: `${ACCENT}50` }}
      />

      <div ref={nodeRef} style={{
        width: '100%', height: '100%',
        background: '#fff',
        border: `1.5px solid ${selected ? ACCENT + '80' : ACCENT + '30'}`,
        borderRadius: 14, display: 'flex', flexDirection: 'column',
        fontFamily: 'system-ui', overflow: 'hidden',
        boxShadow: selected ? `0 0 0 3px ${ACCENT}14, 0 8px 28px rgba(245,158,11,0.12)` : '0 2px 12px rgba(245,158,11,0.08)',
      }}>
        {/* Top strip */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${ACCENT}, #fbbf24, #fde68a)`, flexShrink: 0 }} />

        {/* Header */}
        <div style={{
          padding: '8px 12px', borderBottom: '1px solid #f1f5f9',
          background: `${ACCENT}04`, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT, background: `${ACCENT}12`, border: `1px solid ${ACCENT}25`, borderRadius: 5, padding: '2px 7px', letterSpacing: '0.04em' }}>
            ✦ IDEAS
          </span>
          <div style={{ flex: 1 }} />
          <ModelSel value={model} onChange={setModel} />
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
          {state === 'done' && ideas.length > 0 && (
            <>
              <button
                onClick={() => setFilter(filter === 'favorites' ? 'all' : 'favorites')}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  padding: '3px 8px', background: filter === 'favorites' ? '#fef3c7' : '#f8fafc',
                  border: `1px solid ${filter === 'favorites' ? '#fde68a' : '#e2e8f0'}`,
                  borderRadius: 5, color: filter === 'favorites' ? '#92400e' : '#64748b',
                  fontSize: 9, fontWeight: 600, cursor: 'pointer',
                }}
              >⭐ {favCount > 0 ? favCount : ''} Favoritos</button>
              <span style={{ fontSize: 9, color: '#94a3b8' }}>{ideas.length} ideas</span>
            </>
          )}
        </div>

        {/* Config row */}
        <div style={{
          padding: '7px 12px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0,
        }}>
          {showPromptEditor ? (
            <div style={{ width: '100%', marginBottom: 5 }}>
              <PromptEditor
                customPrompt={customPrompt}
                onSave={handleSaveCustomPrompt}
                masterPrompt={getMasterPrompt()}
                accentColor={ACCENT}
              />
            </div>
          ) : null}
          <select
            value={quantity}
            onChange={e => { const v = +e.target.value; setQuantity(v); persist({ quantity: v }) }}
            onMouseDown={e => e.stopPropagation()}
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, color: '#334155', fontSize: 10, fontWeight: 600, padding: '4px 6px', outline: 'none', cursor: 'pointer', fontFamily: 'system-ui' }}
          >
            {QUANTITIES.map(q => <option key={q} value={q}>{q} ideas</option>)}
          </select>
          <select
            value={platform}
            onChange={e => { setPlatform(e.target.value); persist({ platform: e.target.value }) }}
            onMouseDown={e => e.stopPropagation()}
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, color: '#334155', fontSize: 10, fontWeight: 600, padding: '4px 6px', outline: 'none', cursor: 'pointer', fontFamily: 'system-ui' }}
          >
            {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <select
            value={format}
            onChange={e => { setFormat(e.target.value); persist({ format: e.target.value }) }}
            onMouseDown={e => e.stopPropagation()}
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, color: '#334155', fontSize: 10, fontWeight: 600, padding: '4px 6px', outline: 'none', cursor: 'pointer', fontFamily: 'system-ui' }}
          >
            {FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>

        {/* Body */}
        <div className="nodrag nopan" style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
          {state === 'idle' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ fontSize: 28, opacity: 0.12 }}>✦</div>
              <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
                Conectá fuentes o un BrandVoice<br />y generá ideas de contenido
              </div>
            </div>
          )}

          {(state === 'running' || running) && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <ThinkingDots />
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Generando {quantity} ideas…</div>
            </div>
          )}

          {state === 'error' && (
            <div style={{ padding: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 10, color: '#dc2626', lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          {state === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {displayedIdeas.length === 0 && filter === 'favorites' && (
                <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 10, color: '#94a3b8' }}>
                  No hay ideas marcadas como favoritas
                </div>
              )}
              {displayedIdeas.map(idea => (
                <IdeaCard key={idea.id} idea={idea} onToggleFav={() => toggleFav(idea.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
          <button
            onClick={handleRun}
            disabled={running}
            onMouseDown={e => e.stopPropagation()}
            style={{
              width: '100%', padding: '8px', borderRadius: 8, border: 'none',
              background: running ? '#f1f5f9' : ACCENT,
              color: running ? '#94a3b8' : '#fff',
              fontSize: 11, fontWeight: 700, cursor: running ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {running ? (
              <><span style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${ACCENT}40`, borderTopColor: ACCENT, animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Generando…</>
            ) : state === 'done' ? '🔄 Regenerar ideas' : '✦ Generar ideas'}
          </button>
        </div>
      </div>

      <Handle type="target" position={Position.Left}
        style={{ background: ACCENT, border: `2px solid ${ACCENT}60`, width: 10, height: 10 }} />
    </>
  )
}
