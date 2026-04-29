import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, NodeToolbar, useReactFlow, useStore } from '@xyflow/react'
import Markdown from './Markdown'
import { runLLM } from '../utils/api'
import { Crosshair, Settings } from 'lucide-react'
import ModelSel from '../components/ModelSel'
import PromptEditor from '../components/PromptEditor'
import { getDefaultModel } from '../utils/models'
import { loadApiKeys } from '../utils/storage'

// ─── INLINE TOAST ──────────────────────────────────────────────────────────────
// Replaces alert() with a non-blocking in-node notification
function useToast() {
  const [toast, setToast] = useState(null)
  const show = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2200)
  }, [])
  return { toast, show }
}

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const ACCENT = '#8b5cf6'
const NODE_W = 300
const DROPDOWN_W = 260

const BRANDVOICE_SECTIONS = [
  { id: 'esencia', label: 'Esencia de marca' },
  { id: 'posicionamiento', label: 'Posicionamiento' },
  { id: 'audiencia', label: 'Audiencia ideal' },
  { id: 'brandVoice', label: 'Brand voice' },
  { id: 'vozEnUnaFrase', label: 'Voz en una frase' },
  { id: 'rasgos', label: 'Rasgos de comunicación' },
  { id: 'loQueDiceMucho', label: 'Lo que dice mucho' },
  { id: 'loQueDebeEvitar', label: 'Lo que debe evitar' },
  { id: 'creencias', label: 'Creencias centrales' },
  { id: 'personalidad', label: 'Personalidad comunicacional' },
  { id: 'diferenciales', label: 'Diferenciales reales' },
  { id: 'pilares', label: 'Pilares de contenido' },
  { id: 'promesa', label: 'Promesa de marca' },
  { id: 'mensajeCentral', label: 'Mensaje central' },
  { id: 'arquetipo', label: 'Arquetipo de marca' },
  { id: 'tension', label: 'Tensión interna' },
  { id: 'manualPractico', label: 'Manual práctico' },
  { id: 'ejemplos', label: 'Ejemplos prácticos' },
  { id: 'riesgos', label: 'Riesgos de posicionamiento' },
  { id: 'resumenReutilizable', label: 'Resumen reutilizable' },
]

const BRANDVOICE_PROMPT = `Actuá como un estratega senior de marca personal, posicionamiento y comunicación.

Tu tarea es analizar en profundidad todas las fuentes conectadas y construir un sistema completo de identidad de marca personal. No quiero una respuesta superficial ni una lista genérica de adjetivos. Quiero una definición estratégica, verbal y práctica que sirva para crear contenido, escribir guiones, redactar copies, tomar decisiones de comunicación y mantener coherencia de marca en el tiempo.

Tomá como fuente de verdad principal el material conectado. Si hay contradicciones entre distintas fuentes, detectalas y aclaralas. No inventes atributos que no estén respaldados por el material. Si falta información, indicá qué falta y qué hipótesis estás infiriendo.

## Objetivo
Construir el brand voice y los pilares fundamentales de una marca personal de forma clara, profunda, accionable y reutilizable.

## Instrucciones clave
- Analizá el lenguaje real de la persona, no solo lo que dice sobre sí misma.
- Detectá patrones de comunicación, creencias, valores, estilo, tono, energía, obsesiones temáticas, nivel de claridad, tipo de humor, nivel de confrontación, cercanía, autoridad y forma de enseñar o vender.
- Separá lo que es esencia real de lo que es solo una pose comunicacional.
- Evitá definiciones obvias, vacías o genéricas.
- Priorizá utilidad práctica: esto debe servir para escribir mejor contenido y posicionar mejor la marca.
- No redacteis piezas de contenido todavía. Primero construí el sistema de identidad.

## Quiero que devuelvas exactamente estas secciones:

### 1. Esencia de marca
Definí:
- Quién parece ser realmente esta persona como marca
- Qué representa
- Qué la mueve
- Qué transmite
- Qué lugar quiere ocupar en la mente de su audiencia

### 2. Posicionamiento
Definí:
- Qué problema principal ayuda a resolver
- Para quién parece estar hecha esta marca
- Qué transformación promete
- Qué la diferencia de otras marcas personales del mismo espacio
- Qué territorio comunicacional le conviene ocupar

### 3. Audiencia ideal
Describí:
- Quién es la audiencia principal
- Qué quiere
- Qué le duele
- Qué teme
- Qué objeciones tiene
- Qué la frustra del contenido típico de su nicho
- Qué tipo de tono necesita escuchar para confiar

### 4. Brand voice
Definí el estilo verbal real de la marca, incluyendo:
- Tono general
- Nivel de cercanía
- Nivel de autoridad
- Nivel de intensidad
- Nivel de confrontación
- Nivel de humor
- Nivel de emocionalidad
- Nivel de simpleza o tecnicismo
- Ritmo del lenguaje
- Tipo de vocabulario
- Cómo explica ideas
- Cómo persuade
- Cómo abre temas
- Cómo cierra ideas
- Cómo suena cuando está en su mejor versión

### 5. La voz en una frase
Resumí la voz de marca en una sola frase potente, específica y útil. No quiero algo cliché.

### 6. Rasgos de comunicación
Definí:
- 5 rasgos principales de la voz
- explicación concreta de cada uno
- cómo se ve cada rasgo en la práctica

### 7. Lo que esta marca dice mucho
Identificá:
- palabras
- conceptos
- expresiones
- ideas recurrentes
- estructuras típicas
- formas de introducir o remarcar algo

### 8. Lo que esta marca debería evitar
Definí:
- palabras que no le convienen
- tonos que la debilitan
- poses que suenan falsas
- clichés de nicho que debería evitar
- formas de comunicar que la vuelven genérica

### 9. Creencias centrales
Detectá las creencias profundas que parecen sostener la marca:
- sobre el trabajo
- sobre el éxito
- sobre el problema que resuelve
- sobre su audiencia
- sobre cómo deberían hacerse las cosas

Separá entre:
- creencias explícitas
- creencias implícitas

### 10. Personalidad comunicacional
Definí la personalidad de la marca como si fuera una persona en una conversación real:
- cómo habla
- cómo enseña
- cómo corrige
- cómo opina
- cómo vende
- cómo acompaña
- cómo confronta sin volverse insoportable

### 11. Diferenciales reales
Extraé los diferenciales concretos de la marca personal:
- qué tiene de distinto
- qué combinación particular de habilidades o enfoques la hace especial
- qué hace que no sea "uno más"
- qué activos comunicacionales tiene a favor

### 12. Pilares de contenido recomendados
Definí entre 4 y 6 pilares, y para cada uno indicá:
- nombre del pilar
- función que cumple
- temas que entran ahí
- qué tipo de percepción construye
- qué errores habría que evitar en ese pilar

### 13. Promesa de marca
Redactá:
- una promesa principal de marca
- tres versiones alternativas
- una versión más emocional
- una versión más directa
- una versión más aspiracional

### 14. Mensaje central
Construí:
- mensaje central de marca
- mensaje corto
- mensaje expandido
- versión para bio
- versión para descripción de propuesta de valor

### 15. Arquetipo de marca
Inferí uno o dos arquetipos predominantes y explicá:
- por qué encajan
- cómo deberían traducirse en comunicación
- qué riesgos hay si se exageran

### 16. Tensión interna o contradicción útil
Detectá si hay una tensión interesante en esta marca, por ejemplo:
- cercana pero exigente
- técnica pero simple
- ambiciosa pero humana
- emocional pero racional

Explicá por qué esa tensión puede volverse un diferencial.

### 17. Manual práctico de uso de voz
Creá reglas claras para aplicar esta voz en contenido:
- cómo debería sonar un hook
- cómo debería sonar una explicación
- cómo debería sonar una opinión
- cómo debería sonar una venta
- cómo debería sonar un CTA
- cómo adaptar la voz a reels, carruseles, historias, posteos y mensajes directos

### 18. Ejemplos prácticos
Dame ejemplos concretos de:
- 10 frases que sí suenan a esta marca
- 10 frases que no suenan a esta marca
- 5 hooks alineados con esta voz
- 3 CTAs alineados con esta voz

### 19. Riesgos de posicionamiento
Advertí:
- qué podría hacer que esta marca se vea genérica
- qué podría hacer que pierda credibilidad
- qué podría hacer que se vea impostada
- qué mensajes podrían confundir su posicionamiento

### 20. Resumen final reutilizable
Cerrá con una síntesis operativa pensada para que otro LLM pueda usarla después como contexto. Debe incluir:
- esencia
- posicionamiento
- audiencia
- tono
- rasgos
- palabras clave
- cosas a evitar
- pilares
- promesa
- mensaje central

## Formato de salida
Quiero una respuesta bien estructurada, profunda y accionable.
No quiero texto inflado.
No quiero frases vacías tipo "auténtico, cercano y profesional" sin explicación.
No quiero romanticismo innecesario.
Quiero claridad, criterio y utilidad real.

---

TRANSCRIPCIONES DE LAS FUENTES CONECTADAS:
`

// ─── BRANDVIEW PANEL (PORTALED) ─────────────────────────────────────────────────────

const VIEW_PANEL_W = 540
const VIEW_PANEL_H = 700

function BrandVoiceViewPanel({ nodeRef, transform, brandVoice, personName, onClose }) {
  const [pos, setPos] = useState({ left: 0, top: 0 })
  const [activeSection, setActiveSection] = useState(BRANDVOICE_SECTIONS[0].id)

  const recalc = useCallback(() => {
    if (!nodeRef.current) return
    const r = nodeRef.current.getBoundingClientRect()
    const left = Math.max(8, r.left - VIEW_PANEL_W - 16)
    const top = Math.min(Math.max(8, r.top), window.innerHeight - VIEW_PANEL_H - 8)
    setPos({ left, top })
  }, [nodeRef])

  useEffect(() => { recalc() }, [transform, recalc])

  if (!brandVoice) return null

  const activeContent = brandVoice[activeSection] || '*Sin contenido*'

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        width: VIEW_PANEL_W,
        height: VIEW_PANEL_H,
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
      <style>{`@keyframes slideInPanel { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }`}</style>

      {/* Header */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: `1px solid ${ACCENT}14`,
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
        background: `${ACCENT}06`,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Crosshair size={12} strokeWidth={2} /> {personName || 'BrandVoice'}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#f1f5f9', border: 'none', borderRadius: 7,
            color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>
      </div>

      {/* Content area with sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar navigation */}
        <div style={{
          width: 150,
          borderRight: `1px solid #f1f5f9`,
          overflowY: 'auto',
          background: '#fafafa',
          flexShrink: 0,
        }}>
          {BRANDVOICE_SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                width: '100%',
                padding: '6px 10px',
                textAlign: 'left',
                background: activeSection === section.id ? `${ACCENT}10` : 'transparent',
                border: 'none',
                borderLeft: `3px solid ${activeSection === section.id ? ACCENT : 'transparent'}`,
                color: activeSection === section.id ? ACCENT : '#64748b',
                fontSize: 9,
                fontWeight: activeSection === section.id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => {
                if (activeSection !== section.id) {
                  e.currentTarget.style.background = '#f1f5f9'
                }
              }}
              onMouseLeave={e => {
                if (activeSection !== section.id) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 16px',
          background: '#fff',
        }}>
          <h3 style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: `1px solid ${ACCENT}15`,
          }}>
            {BRANDVOICE_SECTIONS.find(s => s.id === activeSection)?.label}
          </h3>
          <div style={{
            fontSize: 11,
            lineHeight: 1.7,
            color: '#334155',
          }}>
            <Markdown>{activeContent}</Markdown>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────────

export default function BrandVoiceNode({ id, data, selected }) {
  const { setNodes, deleteElements, getNodes, getEdges } = useReactFlow()
  const transform = useStore(s => s.transform)
  const nodeRef = useRef(null)

  const [model, setModel] = useState(() => data.model || getDefaultModel(loadApiKeys()))
  const [showConfig, setShowConfig] = useState(false)
  const [showViewPanel, setShowViewPanel] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(data.personName || 'BrandVoice')
  const [showSelector, setShowSelector] = useState(data.state === undefined || data.state === 'uninitialized')
  const [customPrompt, setCustomPrompt] = useState(data.customPrompt || '')
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [avatarUrlInput, setAvatarUrlInput] = useState('')
  const avatarFileRef = useRef(null)
  const { toast, show: showToast } = useToast()

  const state = data.state || 'idle'
  const brandVoice = data.brandVoice || null
  const personName = data.personName || 'BrandVoice'

  // Sync nameInput when personName changes externally (e.g. loading from library)
  useEffect(() => {
    setNameInput(data.personName || 'BrandVoice')
  }, [data.personName])

  // Block canvas zoom inside node
  useEffect(() => {
    const el = nodeRef.current
    if (!el) return
    const stop = e => e.stopPropagation()
    el.addEventListener('wheel', stop)
    return () => el.removeEventListener('wheel', stop)
  }, [])

  // Close config dropdown on outside click
  useEffect(() => {
    if (!showConfig) return
    const handler = e => {
      if (nodeRef.current && !nodeRef.current.contains(e.target)) {
        setShowConfig(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showConfig])

  function persist(updates) {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n))
  }

  function handleSaveCustomPrompt(prompt) {
    setCustomPrompt(prompt)
    persist({ customPrompt: prompt })
  }

  // Load saved BrandVoices
  function getSavedBrandVoices() {
    try {
      return JSON.parse(localStorage.getItem('brandvoices') || '[]')
    } catch {
      return []
    }
  }

  // Load a specific BrandVoice
  function loadBrandVoice(bv) {
    persist({
      state: 'ready',
      personName: bv.name,
      brandVoice: bv.brandVoice,
    })
    setShowSelector(false)
  }

  // Create new BrandVoice
  function createNew() {
    persist({ state: 'idle' })
    setShowSelector(false)
  }

  // Extract transcripts from connected nodes
  function extractTranscripts() {
    const edges = getEdges()
    const nodes = getNodes()

    // Find incoming edges to this node
    const incomingEdges = edges.filter(e => e.target === id)

    if (incomingEdges.length === 0) {
      throw new Error('No hay fuentes conectadas. Conectá al menos un video, perfil o documento.')
    }

    const transcripts = []

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find(n => n.id === edge.source)
      if (!sourceNode) continue

      // ProfileAnalysisNode
      if (sourceNode.type === 'profileAnalysisNode') {
        const videos = sourceNode.data.videoItems?.filter(v => v.state === 'listo') || []
        if (videos.length === 0) continue

        const platform = sourceNode.data.platform || ''

        videos.forEach(v => {
          transcripts.push({
            url: v.url,
            platform,
            transcript: v.transcript,
            title: v.title,
          })
        })

        // Store avatar if available
        if (sourceNode.data.profile?.avatar && !data.personAvatar) {
          persist({ personAvatar: sourceNode.data.profile.avatar })
        }
      }

      // VideoTranscriptNode
      else if (sourceNode.type === 'videoTranscriptNode' && sourceNode.data.state === 'listo') {
        transcripts.push({
          url: sourceNode.data.url,
          platform: sourceNode.data.platform || '',
          transcript: sourceNode.data.transcript,
          title: sourceNode.data.title || '',
        })

        if (!data.personAvatar) {
          persist({ personAvatar: sourceNode.data.thumbnail || null })
        }
      }

      // DocumentNode
      else if (sourceNode.type === 'documentNode' && sourceNode.data.state === 'listo') {
        transcripts.push({
          url: sourceNode.data.url || '',
          platform: 'document',
          transcript: sourceNode.data.text,
          title: sourceNode.data.name || 'Documento',
        })
      }
    }

    if (transcripts.length === 0) {
      throw new Error('Las fuentes conectadas no tienen contenido transcrito aún.')
    }

    return transcripts
  }

  // Generate BrandVoice
  async function handleGenerate() {
    setAnalyzing(true)
    setError(null)
    persist({ state: 'analyzing', brandVoice: null })

    try {
      const transcripts = extractTranscripts()

      // Build the prompt with transcripts
      const transcriptsText = transcripts.map((t, i) => {
        let text = `### FUENTE ${i + 1}: ${t.title || t.url}\n`
        if (t.platform) text += `Plataforma: ${t.platform}\n`
        if (t.url) text += `URL: ${t.url}\n`
        text += `\n${t.transcript || ''}`
        return text
      }).join('\n\n---\n\n')

      const fullPrompt = (customPrompt || BRANDVOICE_PROMPT) + transcriptsText

      const response = await runLLM([{ role: 'user', content: fullPrompt }], [], model, [], null, null)

      // Parse the response into sections
      const sections = {}

      let currentSection = null
      const lines = response.result.split('\n')
      let buffer = []

      for (const line of lines) {
        const match = line.match(/###?\s*(\d+)\.\s*([^\n]+)/i)
        if (match) {
          // Save previous section
          if (currentSection) {
            sections[currentSection] = buffer.join('\n').trim()
          }

          // Start new section
          const sectionNum = parseInt(match[1])
          if (sectionNum >= 1 && sectionNum <= BRANDVOICE_SECTIONS.length) {
            currentSection = BRANDVOICE_SECTIONS[sectionNum - 1].id
            buffer = []
          }
        } else if (currentSection) {
          buffer.push(line)
        }
      }

      // Save last section
      if (currentSection) {
        sections[currentSection] = buffer.join('\n').trim()
      }

      persist({
        state: 'ready',
        brandVoice: sections,
        transcripts,
      })
    } catch (err) {
      setError(err.message)
      persist({ state: 'error', error: err.message })
    } finally {
      setAnalyzing(false)
    }
  }

  function handleSaveName() {
    if (nameInput.trim()) persist({ personName: nameInput.trim() })
    setEditingName(false)
  }

  function handleAvatarFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      persist({ personAvatar: e.target.result })
      showToast('Foto actualizada ✓')
    }
    reader.readAsDataURL(file)
  }

  function handleAvatarUrl() {
    const url = avatarUrlInput.trim()
    if (!url) return
    persist({ personAvatar: url })
    setAvatarUrlInput('')
    showToast('Foto actualizada ✓')
  }

  function handleRemoveAvatar() {
    persist({ personAvatar: null })
    showToast('Foto eliminada')
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────────

  // State color scheme
  const stateColor = state === 'ready' ? '#22c55e' : state === 'analyzing' ? ACCENT : state === 'error' ? '#ef4444' : '#94a3b8'
  const stateBg    = state === 'ready' ? '#f0fdf4' : state === 'analyzing' ? `${ACCENT}08` : state === 'error' ? '#fef2f2' : '#f8fafc'
  const stateLabel = state === 'ready' ? '✓ Listo' : state === 'analyzing' ? 'Analizando…' : state === 'error' ? 'Error' : 'Sin analizar'

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bvPulse { 0%,100% { opacity:.5 } 50% { opacity:1 } }
      `}</style>

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

      <div
        ref={nodeRef}
        style={{
          width: NODE_W,
          background: '#fff',
          border: `1.5px solid ${selected ? ACCENT + '90' : ACCENT + '35'}`,
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          boxShadow: selected
            ? `0 0 0 3px ${ACCENT}18, 0 8px 32px rgba(139,92,246,0.15)`
            : '0 2px 12px rgba(139,92,246,0.10)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          position: 'relative',
        }}
      >
        {/* Colored top strip — visual identity */}
        <div style={{
          height: 4,
          borderRadius: '14px 14px 0 0',
          background: `linear-gradient(90deg, ${ACCENT}, #a78bfa, #c4b5fd)`,
          flexShrink: 0,
        }} />

        {/* Main card */}
        <div style={{
          padding: '10px 12px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          position: 'relative',
        }}>
          {/* Avatar — click to open config */}
          <div
            onClick={() => setShowConfig(v => !v)}
            onMouseDown={e => e.stopPropagation()}
            title="Clic para cambiar foto"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${ACCENT}20, ${ACCENT}08)`,
              border: `1.5px solid ${ACCENT}30`,
              flexShrink: 0, cursor: 'pointer',
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, position: 'relative',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${ACCENT}30` }}
          >
            {data.personAvatar ? (
              <img src={data.personAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.style.display = 'none' }} />
            ) : <Crosshair size={18} strokeWidth={2} />}
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Editable name */}
            {editingName ? (
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); e.stopPropagation() }}
                onMouseDown={e => e.stopPropagation()}
                autoFocus
                style={{
                  width: '100%', fontSize: 13, fontWeight: 700, color: '#0f172a',
                  background: '#fff', border: `1.5px solid ${ACCENT}`,
                  borderRadius: 5, padding: '2px 6px', outline: 'none',
                  fontFamily: 'system-ui',
                }}
              />
            ) : (
              <div
                onClick={() => { setEditingName(true); setNameInput(personName) }}
                style={{
                  fontSize: 13, fontWeight: 700, color: '#0f172a',
                  cursor: 'text', borderRadius: 4, padding: '1px 3px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${ACCENT}08`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                title="Clic para editar nombre"
              >
                {personName}
              </div>
            )}

            {/* Badge row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <span style={{
                fontSize: 8, fontWeight: 700, letterSpacing: '0.06em',
                color: ACCENT, background: `${ACCENT}12`,
                border: `1px solid ${ACCENT}25`, borderRadius: 4,
                padding: '1px 5px', textTransform: 'uppercase',
              }}>BrandVoice</span>

              <span style={{
                fontSize: 8, fontWeight: 600,
                color: stateColor, background: stateBg,
                borderRadius: 4, padding: '1px 5px',
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                {state === 'analyzing' && (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    border: `1.5px solid ${ACCENT}40`, borderTopColor: ACCENT,
                    animation: 'spin 0.7s linear infinite', display: 'inline-block',
                  }} />
                )}
                {stateLabel}
              </span>
            </div>
          </div>

          {/* Config button */}
          <button
            onClick={() => setShowConfig(v => !v)}
            onMouseDown={e => e.stopPropagation()}
            style={{
              width: 28, height: 28, flexShrink: 0,
              background: showConfig ? ACCENT : '#f1f5f9',
              border: `1px solid ${showConfig ? ACCENT : '#e2e8f0'}`,
              borderRadius: 8, color: showConfig ? '#fff' : '#64748b',
              fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!showConfig) { e.currentTarget.style.background = `${ACCENT}15`; e.currentTarget.style.borderColor = `${ACCENT}50` } }}
            onMouseLeave={e => { if (!showConfig) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#e2e8f0' } }}
            title="Configurar"
          >⚙</button>
        </div>
      </div>

      {/* Config dropdown — to the RIGHT of the node */}
      {showConfig && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: NODE_W + 10,
          width: DROPDOWN_W,
          background: '#fff',
          border: `1.5px solid ${ACCENT}28`,
          borderRadius: 12,
          boxShadow: '0 12px 40px rgba(139,92,246,0.18)',
          display: 'flex',
          flexDirection: 'column',
          padding: '10px',
          gap: 7,
          zIndex: 1000,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          animation: 'slideInPanel 0.15s ease',
        }}>
          {/* ── Nombre ── */}
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', paddingLeft: 2 }}>
            Nombre
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { persist({ personName: nameInput.trim() }); showToast('Nombre guardado ✓') } e.stopPropagation() }}
              onMouseDown={e => e.stopPropagation()}
              placeholder="Nombre del BrandVoice"
              style={{
                flex: 1, fontSize: 11, fontWeight: 600, color: '#0f172a',
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 6, padding: '5px 8px', outline: 'none',
                fontFamily: 'system-ui',
              }}
              onFocus={e => e.target.style.borderColor = `${ACCENT}60`}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
            <button
              onClick={() => { persist({ personName: nameInput.trim() }); showToast('Nombre guardado ✓') }}
              onMouseDown={e => e.stopPropagation()}
              style={{
                padding: '5px 9px', background: ACCENT, border: 'none',
                borderRadius: 6, color: '#fff', fontSize: 10, fontWeight: 700,
                cursor: 'pointer', flexShrink: 0,
              }}
            >✓</button>
          </div>

          {/* ── Foto de perfil ── */}
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', paddingLeft: 2, marginTop: 2 }}>
            Foto de perfil
          </div>

          {/* Current avatar preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: `linear-gradient(135deg, ${ACCENT}20, ${ACCENT}08)`,
              border: `1.5px solid ${ACCENT}30`,
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>
              {data.personAvatar
                ? <img src={data.personAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                : <Crosshair size={20} strokeWidth={2} />}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* File upload */}
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) handleAvatarFile(e.target.files[0]); e.target.value = '' }}
              />
              <button
                onClick={() => avatarFileRef.current?.click()}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  padding: '4px 8px', background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 5, color: '#475569', fontSize: 9, fontWeight: 600,
                  cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
              >
                📁 Subir imagen
              </button>
              {data.personAvatar && (
                <button
                  onClick={handleRemoveAvatar}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    padding: '4px 8px', background: 'none', border: 'none',
                    color: '#ef4444', fontSize: 9, cursor: 'pointer', textAlign: 'left',
                    fontWeight: 600,
                  }}
                >
                  ✕ Quitar foto
                </button>
              )}
            </div>
          </div>

          {/* URL input */}
          <div style={{ display: 'flex', gap: 5 }}>
            <input
              value={avatarUrlInput}
              onChange={e => setAvatarUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAvatarUrl(); e.stopPropagation() }}
              onMouseDown={e => e.stopPropagation()}
              placeholder="O pegá URL de imagen…"
              style={{
                flex: 1, fontSize: 10, color: '#334155',
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 6, padding: '5px 8px', outline: 'none',
                fontFamily: 'system-ui',
              }}
              onFocus={e => e.target.style.borderColor = `${ACCENT}60`}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
            <button
              onClick={handleAvatarUrl}
              onMouseDown={e => e.stopPropagation()}
              disabled={!avatarUrlInput.trim()}
              style={{
                padding: '5px 9px',
                background: avatarUrlInput.trim() ? ACCENT : '#f1f5f9',
                border: 'none', borderRadius: 6,
                color: avatarUrlInput.trim() ? '#fff' : '#94a3b8',
                fontSize: 10, fontWeight: 700,
                cursor: avatarUrlInput.trim() ? 'pointer' : 'default', flexShrink: 0,
              }}
            >✓</button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: `${ACCENT}12`, margin: '2px 0' }} />

          {/* Change BrandVoice button */}
          <button
            onClick={() => setShowSelector(true)}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 7,
              color: '#64748b',
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f1f5f9'
              e.currentTarget.style.borderColor = '#cbd5e1'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.borderColor = '#e2e8f0'
            }}
          >
            📂 Cargar otro BrandVoice
          </button>

          {/* Model selector */}
          <ModelSel value={model} onChange={setModel} />

          {/* Prompt editor button */}
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

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={analyzing}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: analyzing ? '#f1f5f9' : ACCENT,
              border: 'none',
              borderRadius: 7,
              color: analyzing ? '#94a3b8' : '#fff',
              fontSize: 10,
              fontWeight: 700,
              cursor: analyzing ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {analyzing ? (
              <><span style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid #fff4`, borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Analizando...</>
            ) : state === 'ready' ? (
              <>🔄 Regenerar BrandVoice</>
            ) : (
              <>✨ Generar BrandVoice</>
            )}
          </button>

          {/* View button */}
          {state === 'ready' && (
            <button
              onClick={() => { setShowViewPanel(true); setShowConfig(false) }}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: `${ACCENT}10`,
                border: `1px solid ${ACCENT}30`,
                borderRadius: 7,
                color: ACCENT,
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${ACCENT}18` }}
              onMouseLeave={e => { e.currentTarget.style.background = `${ACCENT}10` }}
            >
              👁 Ver análisis completo
            </button>
          )}

          {/* Save to library button */}
          {state === 'ready' && (
            <button
              onClick={() => {
                const saved = JSON.parse(localStorage.getItem('brandvoices') || '[]')
                const existsIdx = saved.findIndex(bv => bv.name === personName)
                if (existsIdx >= 0) {
                  saved[existsIdx] = {
                    ...saved[existsIdx],
                    brandVoice,
                    updatedAt: new Date().toISOString(),
                  }
                  showToast('BrandVoice actualizado ✓')
                } else {
                  saved.push({
                    id: Date.now().toString(),
                    name: personName,
                    brandVoice,
                    createdAt: new Date().toISOString(),
                  })
                  showToast('Guardado en biblioteca ✓')
                }
                localStorage.setItem('brandvoices', JSON.stringify(saved))
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 7,
                color: '#16a34a',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4' }}
            >
              💾 Guardar en biblioteca
            </button>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '8px 10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              fontSize: 9,
              color: '#dc2626',
              lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}

          {/* Toast feedback */}
          {toast && (
            <div style={{
              padding: '7px 10px',
              background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: 6,
              fontSize: 9,
              color: toast.type === 'success' ? '#16a34a' : '#dc2626',
              fontWeight: 600,
              textAlign: 'center',
            }}>
              {toast.msg}
            </div>
          )}

          {/* Status text */}
          <div style={{
            fontSize: 8,
            color: '#94a3b8',
            textAlign: 'center',
            paddingTop: 4,
            borderTop: `1px solid ${ACCENT}10`,
          }}>
            {state === 'idle' && 'Conectá fuentes para comenzar'}
            {state === 'analyzing' && 'Analizando...'}
            {state === 'ready' && '✓ Listo para conectar al LLM'}
            {state === 'error' && '❌ Error - revisá conexiones'}
          </div>
        </div>
      )}

      {/* View Panel */}
      {showViewPanel && state === 'ready' && (
        <BrandVoiceViewPanel
          nodeRef={nodeRef}
          transform={transform}
          brandVoice={brandVoice}
          personName={personName}
          onClose={() => setShowViewPanel(false)}
        />
      )}

      {/* Selection Panel - Choose saved or create new */}
      {showSelector && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
          }}
          onClick={() => setShowSelector(false)}
        >
          <div
            style={{
              width: 420,
              maxHeight: '70vh',
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ height: 5, background: `linear-gradient(90deg, ${ACCENT}, #a78bfa, #c4b5fd)`, flexShrink: 0 }} />
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${ACCENT}15`,
              background: `${ACCENT}04`,
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: ACCENT, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Crosshair size={16} strokeWidth={2} /> BrandVoice
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Elegí un BrandVoice guardado o creá uno nuevo
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {/* Create new button */}
              <button
                onClick={createNew}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: ACCENT,
                  border: 'none',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                ✨ Crear nuevo BrandVoice
              </button>

              {/* Divider */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 16,
                gap: 12,
              }}>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                  O cargá uno guardado
                </div>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              </div>

              {/* Saved list */}
              {getSavedBrandVoices().length === 0 ? (
                <div style={{
                  padding: '30px 20px',
                  textAlign: 'center',
                  fontSize: 11,
                  color: '#94a3b8',
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: '1px dashed #cbd5e1',
                }}>
                  No hay BrandVoices guardados aún
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {getSavedBrandVoices().map(bv => (
                    <button
                      key={bv.id}
                      onClick={() => loadBrandVoice(bv)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = `${ACCENT}08`
                        e.currentTarget.style.borderColor = ACCENT
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#fff'
                        e.currentTarget.style.borderColor = '#e2e8f0'
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                        {bv.name}
                      </div>
                      <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                        {new Date(bv.createdAt).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <button
                onClick={() => { setShowSelector(false); persist({ state: 'idle' }) }}
                style={{
                  padding: '8px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  color: '#64748b',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cerrar
              </button>
              <button
                onClick={() => deleteElements({ nodes: [{ id }] })}
                style={{
                  padding: '8px 14px',
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: 10,
                  cursor: 'pointer',
                  opacity: 0.6,
                }}
              >
                ✕ Eliminar nodo
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: ACCENT, border: `2px solid ${ACCENT}60`, width: 10, height: 10, borderRadius: '50%' }}
      />

      <Handle
        type="source"
        position={Position.Right}
        id="brandvoice"
        style={{ background: state === 'ready' ? '#22c55e' : '#94a3b8', border: `2px solid ${state === 'ready' ? '#16a34a' : '#cbd5e1'}`, width: 10, height: 10, borderRadius: '50%' }}
      />
    </>
  )
}
