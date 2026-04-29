import { useState, useRef, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, NodeToolbar, useReactFlow } from '@xyflow/react'
import { runLLM } from '../utils/api'
import Markdown from './Markdown'
import { layoutGroupChildren, calculateGroupSize } from '../utils/layout'
import { Brain, Ruler, Dna, TrendingUp, Fish, Microscope, Lightbulb, FileText, Wand2 } from 'lucide-react'

// ─── Prompt Templates ─────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'contexto-maestro',
    icon: Brain,
    label: 'Contexto Maestro',
    desc: 'Base de conocimiento completa y reutilizable para otros LLMs',
    prompt: `Actúa como un arquitecto de contexto para LLMs.

Tu tarea es transformar el material en un documento de contexto altamente útil, preciso y reutilizable. No hagas un resumen genérico — construí una "base de conocimiento condensada".

ESTRUCTURA DE SALIDA:

# CONTEXTO MAESTRO

## 1. Resumen ejecutivo (8-12 líneas)
Qué contiene el material, cuál es su foco y qué valor tiene.

## 2. Temas principales
Para cada tema: nombre, explicación breve y por qué es importante.

## 3. Ideas clave y aprendizajes (10-30 ideas)
Cada idea redactada como insight útil y accionable, no como frase vaga.

## 4. Hechos, datos y afirmaciones concretas
Pasos, procesos, frameworks, ejemplos, comparaciones, causas/efectos, errores frecuentes, recomendaciones explícitas.

## 5. Patrones repetidos
Ideas, argumentos o estructuras que se repiten. Explicá por qué aparecen.

## 6. Frases y hooks potentes
Frases útiles, giros de lenguaje, hooks, estructuras verbales con valor reutilizable.

## 7. Estilo y tono
Tono general, formalidad, vocabulario, ritmo, recursos persuasivos, cómo se explican las ideas.

## 8. Entidades y referencias
Personas, marcas, herramientas, conceptos, métodos. Qué rol cumple cada uno.

## 9. Contradicciones, vacíos o ambigüedades
Puntos confusos, cosas no resueltas, info incompleta o contradictoria.

## 10. Contexto comprimido para reutilización
Bloque denso, sin relleno, listo para pasarle a otro LLM como contexto de entrada.

REGLAS: Sé preciso y exhaustivo. Prioriza utilidad futura. Consolida ideas que aparecen varias veces.`,
  },
  {
    id: 'clonar-voz',
    icon: '🎙️',
    label: 'Clonar Tono y Voz',
    desc: 'Extrae el estilo comunicativo para replicarlo',
    prompt: `Eres un especialista en lingüística y comunicación. Analizá estas transcripciones con el objetivo de extraer el tono de voz y estilo comunicativo del creador para poder replicarlo con precisión.

ESTRUCTURA DE SALIDA:

# PERFIL DE VOZ Y TONO

## 1. Personalidad comunicativa
Describí en 5-8 adjetivos precisos la personalidad que transmite. Explicá cada uno con ejemplos del texto.

## 2. Nivel de formalidad y registro
¿Formal, informal, coloquial, técnico, conversacional? ¿Varía según el tema? ¿Cómo?

## 3. Vocabulario característico
- Palabras y expresiones que usa frecuentemente
- Términos que EVITA (si se detecta)
- Jerga específica, neologismos, modismos
- Palabras de relleno o muletillas

## 4. Estructura de las oraciones
- ¿Frases largas o cortas? ¿Ritmo rápido o pausado?
- ¿Usa preguntas retóricas? ¿Con qué frecuencia?
- ¿Cómo construye los argumentos?

## 5. Recursos retóricos y narrativos
- Analogías y metáforas más usadas
- Humor: ¿Lo usa? ¿Cómo? ¿Qué tipo?
- Hipérbole, ironía, sarcasmo
- Storytelling: ¿Cuenta historias personales?

## 6. Relación con la audiencia
¿Cómo se dirige a su público? ¿Usa "tú/vos/ustedes"? ¿Qué tan cercano o distante es el trato?

## 7. Frases modelo para imitar
Lista de 10-15 frases reales extraídas del material que capturen mejor su voz. Organizadas por tipo (apertura, desarrollo, cierre, transición).

## 8. Guía de replicación
Instrucciones concretas para que un LLM escriba en este estilo. Qué hacer y qué evitar.

## 9. Ejemplos de transformación
Tomá 3 ideas genéricas y mostrá cómo las diría esta persona específicamente.`,
  },
  {
    id: 'estructuras-narrativas',
    icon: Ruler,
    label: 'Estructuras Narrativas',
    desc: 'Identifica frameworks de storytelling y formatos de contenido',
    prompt: `Eres un analista experto en narrativa y estructura de contenido. Estudiá estas transcripciones para identificar los patrones estructurales, formatos y técnicas narrativas que usa el creador.

ESTRUCTURA DE SALIDA:

# ANÁLISIS DE ESTRUCTURAS NARRATIVAS

## 1. Estructura general predominante
¿Qué formato base usa? (Problema-Solución, Historia-Lección, Lista, Tutorial, Debate, Opinión, etc.)
Describí la arquitectura habitual de sus piezas de principio a fin.

## 2. Apertura y hooks
- ¿Cómo abre cada pieza? (pregunta, dato, afirmación polémica, historia, promesa)
- Los 5-10 hooks más efectivos detectados, textuales
- Patrón común en las aperturas: ¿qué tienen en común?

## 3. Desarrollo y cuerpo
- ¿Cómo organiza la información? (cronológico, temático, por importancia, contrastivo)
- ¿Usa transiciones? ¿Cómo?
- ¿Cuántos puntos principales por pieza en promedio?
- ¿Cómo mantiene el interés en el medio?

## 4. Cierre y llamada a la acción
- ¿Cómo termina? (resumen, reflexión, pregunta, CTA directo, cliffhanger)
- Fórmulas de cierre más usadas

## 5. Técnicas de retención y engagement
- ¿Genera anticipación? ¿Cómo?
- ¿Usa bucles abiertos (open loops)?
- Patrones de "pausa dramática" o reencuadre

## 6. Frameworks identificados
Nombrá y describí cualquier framework o estructura repetible que use (ej: "El Antes/Después/Puente", "El Error + La Lección", etc.)

## 7. Plantillas extraíbles
Convertí sus estructuras más usadas en plantillas con variables que cualquiera pueda completar. Ejemplo: "[AFIRMACIÓN POLÉMICA] + Pero en realidad... + [REENCUADRE] + [EJEMPLO PERSONAL]"

## 8. Recomendaciones
¿Qué estructuras funcionan mejor para qué tipo de contenido según este análisis?`,
  },
  {
    id: 'personalidad-creador',
    icon: Dna,
    label: 'Personalidad del Creador',
    desc: 'Extrae creencias, valores, postura y worldview',
    prompt: `Eres un psicólogo del comportamiento y analista de identidad de marca. Analizá estas transcripciones para construir un perfil profundo de la personalidad, creencias y visión del mundo del creador.

ESTRUCTURA DE SALIDA:

# PERFIL DE PERSONALIDAD Y WORLDVIEW

## 1. Valores centrales
¿Qué le importa profundamente? ¿Qué defiende? ¿Contra qué se posiciona?
Listá entre 5-10 valores con evidencia textual de cada uno.

## 2. Creencias fundamentales
¿Qué cree que es verdad sobre su industria, el mundo, las personas o el éxito?
Incluid creencias explícitas (las que dice directamente) e implícitas (las que se infieren).

## 3. Posicionamiento y "enemigos"
¿Contra qué corriente va? ¿Qué narrativa dominante rechaza?
¿Cuáles son sus "villanos" conceptuales (ideas, comportamientos, sistemas)?

## 4. Miedos y frustraciones que comparte con su audiencia
¿Qué problemas describe? ¿Qué frustraciones valida en su público?

## 5. Aspiraciones y promesas implícitas
¿Qué futuro pinta? ¿Qué transformación promete (aunque sea implícitamente)?

## 6. Experiencias personales como capital simbólico
¿Qué vivencias propias usa para dar autoridad a sus ideas? ¿Cuál es su "historia de origen"?

## 7. Arquetipos y rol que ocupa
¿Es el Mentor, el Rebelde, el Experto, el Explorador, el Héroe? ¿Cómo lo proyecta?

## 8. Contradicciones o tensiones internas
¿Hay ideas en tensión? ¿Evoluciona su postura entre distintas piezas?

## 9. Perfil sintetizado (para usar en prompts)
Un párrafo denso de 100-150 palabras que capture su esencia para pasarle a un LLM como contexto de personaje.`,
  },
  {
    id: 'estrategia-contenido',
    icon: '♟️',
    label: 'Estrategia de Contenido',
    desc: 'Decodifica la estrategia detrás del contenido',
    prompt: `Eres un estratega de contenido digital. Analizá estas transcripciones para reverse-engineerear la estrategia de contenido del creador: qué está intentando lograr y cómo lo está ejecutando.

ESTRUCTURA DE SALIDA:

# ANÁLISIS ESTRATÉGICO DE CONTENIDO

## 1. Objetivos implícitos del contenido
¿Qué busca este creador? (autoridad, ventas, comunidad, entretenimiento, educación, influencia)
¿Cómo se evidencia cada objetivo en el contenido?

## 2. Audiencia objetivo
¿A quién habla específicamente? Describí el perfil del oyente ideal según el contenido.
¿Qué problemas, deseos y nivel de conocimiento tiene esa audiencia?

## 3. Pilares de contenido
¿Cuáles son los grandes temas recurrentes? Organizalos en 3-5 pilares temáticos con descripción.

## 4. Ángulos y posicionamiento
¿Qué ángulo único toma en cada tema? ¿Cómo se diferencia de lo obvio?
¿Hay un "punto de vista de marca" consistente?

## 5. Funnel de contenido implícito
¿Hay contenido de atracción (awareness), de consideración (trust), de conversión?
¿Hacia dónde dirige a su audiencia?

## 6. Técnicas de retención de audiencia
¿Qué hace para que la gente vuelva? (serialización, cliffhangers, comunidad, promesas)

## 7. Monetización detectada o probable
¿Se mencionan productos, servicios, cursos, afiliados? ¿Qué modelo de negocio se intuye?

## 8. Brechas y oportunidades
¿Qué temas relevantes NO cubre? ¿Qué preguntas de su audiencia quedan sin responder?

## 9. Calendario sugerido
Basado en los patrones detectados, proponé una estructura de 4 semanas de contenido coherente con su estrategia.`,
  },
  {
    id: 'detectar-tendencias',
    icon: TrendingUp,
    label: 'Detectar Tendencias',
    desc: 'Encuentra patrones virales y temas emergentes',
    prompt: `Eres un analista de tendencias digitales y comportamiento de audiencias. Estudiá estas transcripciones para identificar qué está funcionando, qué se repite y qué señala hacia dónde va el contenido en este nicho.

ESTRUCTURA DE SALIDA:

# ANÁLISIS DE TENDENCIAS Y PATRONES VIRALES

## 1. Temas con mayor energía
¿Qué temas aparecen con más frecuencia o con mayor profundidad de tratamiento?
¿Cuáles generan más emociones evidentes en el creador?

## 2. Patrones de contenido viral
¿Qué tipos de afirmaciones, preguntas o formatos se repiten?
¿Hay estructuras que aparecen en múltiples piezas exitosas?

## 3. Problemas que la audiencia tiene (detectados implícitamente)
¿Qué frustraciones, miedos o deseos se mencionan o implican repetidamente?

## 4. Términos y conceptos emergentes
Palabras, frases o conceptos que aparecen con frecuencia. ¿Son nuevos en el nicho o ya establecidos?

## 5. Cambios de postura o evolución detectada
¿El creador cambió de opinión o enfoque entre distintos videos? ¿Qué señala eso?

## 6. Preguntas sin responder (oportunidades)
¿Qué queda sin resolver? ¿Qué temas se mencionan pero no se desarrollan?

## 7. Timing y contexto cultural
¿Qué eventos, plataformas o fenómenos culturales aparecen como contexto? ¿Hay urgencia en el contenido?

## 8. Predicciones y tendencias emergentes
Basado en el análisis, ¿hacia dónde va este nicho? ¿Qué temas van a ser importantes próximamente?

## 9. Ideas de contenido accionables
Lista de 10 ideas de contenido que aprovechan las tendencias detectadas, listas para producir.`,
  },
  {
    id: 'extraer-hooks',
    icon: Fish,
    label: 'Extraer Hooks y Aperturas',
    desc: 'Colecta las mejores frases de apertura y técnicas de enganche',
    prompt: `Eres un copywriter especializado en atención y engagement. Tu única tarea es extraer, analizar y sistematizar todos los hooks, aperturas y técnicas de captura de atención del material.

ESTRUCTURA DE SALIDA:

# BIBLIOTECA DE HOOKS Y APERTURAS

## 1. Hooks textuales (extracto directo)
Copiá textualmente las 15-25 mejores aperturas o frases de gancho del material.
Organizalas por tipo:
- Pregunta provocadora
- Afirmación contraintuitiva
- Dato o estadística impactante
- Historia o anécdota
- Promesa directa
- Problema compartido

## 2. Anatomía de cada tipo de hook
Para cada categoría, explicá la estructura subyacente. ¿Qué mecanismo psicológico activa?

## 3. Fórmulas extraíbles
Convertí los mejores hooks en fórmulas con variables. Ejemplo:
"¿Por qué [resultado deseado] cuando la mayoría hace [acción común inútil]?"

## 4. Hooks por emoción activada
Reclasificá los hooks según la emoción que generan: curiosidad, miedo, esperanza, frustración, FOMO, identidad, sorpresa.

## 5. Técnicas de retención en el medio
Frases o recursos usados para mantener la atención después del hook inicial (antes/después, cliffhangers, "ahora te explico por qué", etc.)

## 6. Cierres que generan acción
Las mejores frases de cierre, CTA o remate. ¿Qué piden? ¿Cómo lo piden?

## 7. Los 10 hooks más potentes rankeados
Con explicación de por qué funcionan y cómo adaptarlos.

## 8. Generador de hooks propio
Basado en los patrones, creá 10 hooks nuevos sobre temas del nicho usando las mismas fórmulas detectadas.`,
  },
  {
    id: 'analisis-competitivo',
    icon: Microscope,
    label: 'Análisis Competitivo',
    desc: 'Compara enfoques y detecta brechas de oportunidad',
    prompt: `Eres un analista estratégico de mercado de contenidos. Analizá estas transcripciones como si estudiaras un conjunto de competidores o referentes del nicho, buscando diferenciación, brechas y oportunidades.

ESTRUCTURA DE SALIDA:

# ANÁLISIS COMPETITIVO DE CONTENIDO

## 1. Mapa del territorio
¿Qué posiciones están ocupadas? ¿Quién está en qué lugar del espectro (principiante↔experto, emocional↔técnico, etc.)?

## 2. Mensajes dominantes en el nicho
¿Qué narrativas, creencias o consejos se repiten entre los distintos creadores/videos?
¿Cuál es el "consenso" del nicho?

## 3. Diferenciadores por creador/fuente
¿Qué tiene cada uno de único? ¿Dónde se solapan?

## 4. Brechas y nichos sin cubrir
¿Qué temas importantes nadie (o casi nadie) aborda?
¿Qué audiencias sub-representadas hay?
¿Qué preguntas frecuentes quedan sin respuesta?

## 5. Contradicciones entre creadores
¿Dónde dicen cosas opuestas? ¿Qué evidencia hay para cada posición?

## 6. Puntos de acuerdo universal
¿Qué afirman todos? Estos son los "axiomas" del nicho.

## 7. Saturación vs. oportunidad
¿Qué temas están sobreexplotados? ¿Cuáles están subexplotados?

## 8. Análisis de profundidad
¿Quién va más profundo en los temas? ¿Quién se queda superficial? ¿Qué falta en profundidad?

## 9. Estrategia de diferenciación recomendada
Basado en el análisis, ¿cómo podría un nuevo creador (o el usuario) posicionarse de forma única?
Describí 3 ángulos de entrada diferentes con propuesta de valor clara.`,
  },
  {
    id: 'generar-ideas',
    icon: Lightbulb,
    label: 'Generador de Ideas',
    desc: 'Produce ideas de contenido derivadas del material',
    prompt: `Eres un director creativo de contenido digital. Usando el material como base de inspiración y contexto, generá el máximo de ideas de contenido accionables y específicas.

ESTRUCTURA DE SALIDA:

# BANCO DE IDEAS DE CONTENIDO

## 1. Ideas de videos/posts directos (25 ideas mínimo)
Ideas concretas y específicas (no genéricas). Para cada una incluí:
- Título o hook
- Formato sugerido (tutorial, opinión, historia, lista, debate, etc.)
- Ángulo único / por qué funcionaría
- Audiencia que atrae

## 2. Series de contenido
3-5 ideas de series multi-episodio basadas en los temas del material. Para cada serie:
- Nombre de la serie
- Premisa
- 5 episodios propuestos con título

## 3. Ángulos contraintuitivos
10 ideas que vayan contra la narrativa dominante del nicho o den vuelta una creencia común.

## 4. Contenido de autoridad profunda
5 ideas de contenido largo/denso (guide, análisis exhaustivo, ensayo) que establezcan expertise.

## 5. Ideas para viralización
10 ideas optimizadas para compartirse, basadas en los patrones de enganche detectados en el material.

## 6. Contenido de conversión
5 ideas de contenido diseñado para llevar a la audiencia a una acción específica.

## 7. Remezclas y derivados
¿Qué partes del material existente se podrían reutilizar, remezclar o expandir?
Lista 10 derivados posibles del contenido analizado.

## 8. Calendario de 30 días
Un calendario concreto de 30 días usando las mejores ideas, equilibrando tipos de contenido.`,
  },
  {
    id: 'guion-rapido',
    icon: '✍️',
    label: 'Guión Rápido',
    desc: 'Genera un guión completo basado en el estilo del material',
    prompt: `Eres un guionista experto en contenido digital. Basándote en el estilo, tono, estructura y temas del material, creá un guión completo y listo para producir.

ESTRUCTURA DE SALIDA:

# GUIÓN BASADO EN EL MATERIAL

## 1. Brief del guión
- Tema elegido (el más relevante o potente del material)
- Formato: [tipo de contenido]
- Duración estimada: [X minutos]
- Objetivo: [qué debe lograr]
- Audiencia: [a quién va dirigido]

## 2. Hook de apertura (primeros 5-15 segundos)
Escribí 3 opciones de hook diferentes. Deben estar en el tono y voz del material original.

## 3. Desarrollo del guión completo
Escribí el guión palabra por palabra, en el tono y estilo exacto del creador original.
Incluid:
- [PAUSA] o [ÉNFASIS] donde corresponda
- Notas de dirección entre corchetes: [gestos, tono, velocidad]
- Transiciones marcadas

## 4. Cierre y CTA
Cierre en el estilo del creador + llamada a la acción.

## 5. Variantes del mismo guión
- Versión corta (30-60 seg para Reels/TikTok)
- Versión larga (para YouTube o podcast)
- Versión texto (para post de LinkedIn o newsletter)

## 6. Notas de producción
Sugerencias de edición, recursos visuales o referencias para hacer el contenido más efectivo.

IMPORTANTE: El guión debe sonar EXACTAMENTE como el creador del material, no genérico.`,
  },
  {
    id: 'personalizado',
    icon: '⚙️',
    label: 'Personalizado',
    desc: 'Escribí tu propio prompt',
    prompt: '',
  },
]

const COLORS = [
  { id: 'indigo', bg: 'rgba(99,102,241,0.06)', border: '#6366f1' },
  { id: 'rose', bg: 'rgba(244,63,94,0.06)', border: '#f43f5e' },
  { id: 'green', bg: 'rgba(34,197,94,0.06)', border: '#22c55e' },
  { id: 'amber', bg: 'rgba(245,158,11,0.06)', border: '#f59e0b' },
  { id: 'sky', bg: 'rgba(14,165,233,0.06)', border: '#0ea5e9' },
  { id: 'violet', bg: 'rgba(139,92,246,0.06)', border: '#8b5cf6' },
]

const DEFAULT_INSTRUCTION = `Actúa como un arquitecto de contexto para LLMs.

Tu tarea NO es hacer un resumen genérico. Tu tarea es transformar el material adjunto en un documento de contexto altamente útil, preciso y reutilizable para que otro modelo de lenguaje pueda usarlo después para crear guiones, ideas, posts, análisis, estrategias o cualquier otra pieza derivada.

Debes trabajar como si estuvieras construyendo una "base de conocimiento condensada" y no un resumen común.

OBJETIVO:
Leer todas las transcripciones/documentos adjuntos y producir un CONTEXTO ESTRUCTURADO que conserve la máxima cantidad de información útil, eliminando relleno, repeticiones innecesarias y ruido.

INSTRUCCIONES CLAVE:
- No hagas un resumen superficial.
- No escribas introducciones innecesarias.
- No generalices de más.
- No inventes nada que no esté en el material.
- Si hay ambigüedad o algo no queda claro, indícalo.
- Si varios documentos repiten una idea, márcala como patrón recurrente.
- Separa hechos, interpretaciones, ejemplos, ideas accionables y estilo.
- Prioriza información que sirva para reutilizar este contexto en tareas futuras.
- Conserva nombres, conceptos, frameworks, ejemplos concretos, procesos, pasos, objeciones, analogías, frases destacables y criterios de decisión.
- Si aparecen contradicciones entre documentos, señálalas.
- Si el contenido tiene un tono o estilo particular, descríbelo.
- Organiza la salida para que otro LLM pueda entender el material sin leer la fuente original.

ESTRUCTURA DE SALIDA OBLIGATORIA:

# CONTEXTO MAESTRO

## 1. Resumen ejecutivo
Explica en 8-12 líneas qué contiene el material, cuál es su foco principal y qué valor tiene.

## 2. Temas principales
Lista los temas centrales tratados. Para cada tema incluye: nombre, explicación breve y por qué es importante.

## 3. Ideas clave y aprendizajes
Extrae las ideas más importantes (entre 10 y 30). Cada idea debe estar redactada como insight útil, no como frase vaga.

## 4. Hechos, datos y afirmaciones concretas
Extrae toda información específica: pasos, procesos, sistemas, frameworks, ejemplos concretos, comparaciones, causas y efectos, errores frecuentes, recomendaciones explícitas.

## 5. Patrones repetidos
Detecta ideas, argumentos, consejos o estructuras que se repiten a lo largo de múltiples transcripciones. Aclara por qué parecen repetirse.

## 6. Frases, hooks o formulaciones potentes
Extrae frases útiles, giros de lenguaje, hooks, formas de explicar ideas o estructuras verbales destacables. Solo lo que tenga valor reutilizable.

## 7. Estilo y tono del material
Describe: tono general, nivel de formalidad, tipo de vocabulario, ritmo, estructura frecuente, recursos persuasivos o narrativos.

## 8. Entidades y referencias importantes
Lista: personas, marcas, herramientas, conceptos, métodos, plataformas, ejemplos mencionados. Aclara qué rol cumplen.

## 9. Contradicciones, ambigüedades o vacíos
Señala: puntos confusos, cosas no resueltas, contradicciones entre piezas, información que parece incompleta.

## 10. Información útil para tareas futuras
Organiza lo que serviría para: generar ideas de contenido, escribir guiones, hacer copies, crear propuestas, resumir la postura del autor, replicar el estilo, extraer frameworks, detectar objeciones.

## 11. Contexto comprimido para reutilización
Escribe un bloque final de contexto compacto, muy denso en información y sin relleno, listo para ser usado como input por otro LLM. Debe ser autosuficiente y conservar la esencia del material sin depender de las transcripciones originales.

REGLAS FINALES:
- Sé preciso y exhaustivo, pero no redundante.
- Prioriza utilidad futura por encima de belleza narrativa.
- No uses frases vacías. Si una idea aparece muchas veces, consolídala.
- Mantén una lógica clara y jerárquica.`

const LLM_ACCENT = '#6366f1'

function GroupNode({ id, data, selected }) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(data.title || 'Colección')
  const [colorId, setColorId] = useState(data.colorId || 'indigo')
  const [templateId, setTemplateId] = useState(data.templateId || 'contexto-maestro')
  const [instruction, setInstruction] = useState(
    data.instruction !== undefined ? data.instruction
      : (TEMPLATES.find(t => t.id === (data.templateId || 'contexto-maestro'))?.prompt || TEMPLATES[0].prompt)
  )
  const [instrOpen, setInstrOpen] = useState(false)
  const [showTplMenu, setShowTplMenu] = useState(false)
  const [tplAnchor, setTplAnchor] = useState({ left: 0, top: 0 })
  const [showModal, setShowModal] = useState(false)
  const [summaryState, setSummaryState] = useState(data.summaryState || 'idle')
  const [summary, setSummary] = useState(data.summary || '')
  const [summaryError, setSummaryError] = useState(data.summaryError || '')
  const [collapsed, setCollapsed] = useState(data.collapsed || false)

  const inputRef = useRef(null)
  const nodeRef = useRef(null)
  const tplBtnRef = useRef(null)
  const { getNodes, setNodes, deleteElements } = useReactFlow()

  function handleDuplicate() {
    const allNodes = getNodes()
    const groupNode = allNodes.find(n => n.id === id)

    if (!groupNode) return

    // Get all child nodes of this group
    const childNodes = allNodes.filter(n => n.parentId === id)

    // Create new IDs
    const newGroupId = `group-${Date.now()}`
    const idMap = new Map()
    idMap.set(id, newGroupId)

    // Create ID mapping for child nodes
    childNodes.forEach(child => {
      idMap.set(child.id, `${child.type === 'videoTranscriptNode' ? 'vt' : 'doc'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
    })

    // Offset position for the new group
    const offset = { x: 40, y: 40 }
    const newGroupPosition = {
      x: groupNode.position.x + offset.x,
      y: groupNode.position.y + offset.y,
    }

    // Create the new group node
    const newGroup = {
      ...groupNode,
      id: newGroupId,
      position: newGroupPosition,
      data: {
        ...groupNode.data,
        title: `${groupNode.data.title || 'Colección'} (copia)`,
      },
    }

    // Create new child nodes with updated IDs and parent references
    const newChildren = childNodes.map(child => ({
      ...child,
      id: idMap.get(child.id),
      parentId: newGroupId,
      position: { ...child.position },
      data: {
        ...child.data,
        groupId: newGroupId,
      },
    }))

    // Add new nodes to the canvas
    setNodes(prev => [...prev, newGroup, ...newChildren])

    // Layout the new group's children
    setTimeout(() => {
      setNodes(prev => layoutGroupChildren(prev, newGroupId))
    }, 0)
  }

  function toggleCollapse() {
    const newCollapsed = !collapsed
    setCollapsed(newCollapsed)
    persist({ collapsed: newCollapsed })

    const allNodes = getNodes()
    const groupNode = allNodes.find(n => n.id === id)
    const children = allNodes.filter(n => n.parentId === id)

    if (newCollapsed) {
      // Collapsing: move children out of the group temporarily
      setNodes(nds => nds.map(n => {
        if (n.id === id) {
          // Shrink the group with smooth transition
          return {
            ...n,
            style: {
              ...n.style,
              width: 300,
              height: 120,
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }
          }
        }
        if (n.parentId === id) {
          // Move child outside the group, but save the state
          const absX = groupNode ? n.position.x + groupNode.position.x : n.position.x
          const absY = groupNode ? n.position.y + groupNode.position.y : n.position.y
          return {
            ...n,
            parentId: undefined,
            position: { x: absX, y: absY },
            data: {
              ...n.data,
              _collapsedParentId: id,
              _collapsedPosition: n.position,
              compact: false,
              groupId: null,
            },
            hidden: true, // Hide the node while collapsed
          }
        }
        return n
      }))
    } else {
      // Expanding: restore children to the group
      setNodes(nds => {
        // First, restore group size with smooth transition
        let updated = nds.map(n => {
          if (n.id === id) {
            return {
              ...n,
              style: {
                ...n.style,
                width: 500,
                height: 380,
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              } // Will auto-size later
            }
          }
          return n
        })

        // Then restore children to the group
        updated = updated.map(n => {
          if (n.data?._collapsedParentId === id) {
            return {
              ...n,
              parentId: id,
              position: n.data._collapsedPosition || { x: 10, y: 50 },
              data: {
                ...n.data,
                groupId: id,
                compact: true,
                _collapsedParentId: undefined,
                _collapsedPosition: undefined,
              },
              hidden: false,
            }
          }
          return n
        })

        return updated
      })

      // Auto-size and layout after a short delay (after animation completes)
      setTimeout(() => {
        const currentNodes = getNodes()
        const size = calculateGroupSize(currentNodes, id)
        if (size) {
          setNodes(nds => nds.map(n => {
            if (n.id !== id) return n
            return {
              ...n,
              style: {
                ...n.style,
                width: size.width,
                height: size.height,
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }
            }
          }))
        }
        setNodes(nds => layoutGroupChildren(nds, id))
      }, 350) // Wait for collapse animation to complete
    }
  }

  const curTemplate = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0]

  const color = COLORS.find(c => c.id === colorId) || COLORS[0]

  const videosInGroup = getNodes().filter(
    n => n.type === 'videoTranscriptNode' && (n.parentId === id || n.data?._collapsedParentId === id)
  )
  const readyCount = videosInGroup.filter(n => n.data.state === 'listo').length

  // Auto-size group when children change (only when not collapsed)
  useEffect(() => {
    if (collapsed) return

    const allNodes = getNodes()
    const size = calculateGroupSize(allNodes, id)
    if (size) {
      setNodes(nds => nds.map(n => {
        if (n.id !== id) return n
        return {
          ...n,
          style: {
            ...n.style,
            width: size.width,
            height: size.height,
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }
        }
      }))
    }
  }, [videosInGroup.length, collapsed])

  // Block canvas zoom while cursor is inside (same fix as LLM node)
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

  function saveTitle(val) {
    const t = val.trim() || 'Colección'
    setTitle(t)
    setEditingTitle(false)
    persist({ title: t })
  }

  function changeColor(cid) {
    setColorId(cid)
    persist({ colorId: cid })
  }

  function handleInstructionChange(val) {
    setInstruction(val)
    persist({ instruction: val })
  }

  function selectTemplate(tpl) {
    setTemplateId(tpl.id)
    if (tpl.prompt) {
      setInstruction(tpl.prompt)
      persist({ templateId: tpl.id, instruction: tpl.prompt })
    } else {
      // "Personalizado" — keep current instruction, just open the editor
      persist({ templateId: tpl.id })
      setInstrOpen(true)
    }
    setShowTplMenu(false)
  }

  function openTplMenu() {
    if (tplBtnRef.current) {
      const r = tplBtnRef.current.getBoundingClientRect()
      setTplAnchor({ left: r.left, top: r.bottom + 6 })
    }
    setShowTplMenu(v => !v)
  }

  async function handleSummarize() {
    const ready = videosInGroup.filter(n => n.data.state === 'listo')
    if (ready.length === 0) return

    setSummaryState('running')
    setSummaryError('')
    persist({ summaryState: 'running', summaryError: '' })

    const transcripts = ready.map(n => ({
      url: n.data.url,
      platform: n.data.platform,
      transcript: n.data.transcript,
      title: n.data.title,
      collection: null,
    }))

    try {
      const res = await runLLM(
        [{ role: 'user', content: instruction || DEFAULT_INSTRUCTION }],
        transcripts,
        'gpt-5.4',
      )
      setSummary(res.result)
      setSummaryState('done')
      setShowModal(true)
      persist({ summary: res.result, summaryState: 'done', summaryError: '' })
    } catch (err) {
      setSummaryError(err.message)
      setSummaryState('error')
      persist({ summaryState: 'error', summaryError: err.message })
    }
  }

  const hasSummary = summaryState === 'done' && summary
  const isRunning = summaryState === 'running'

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .group-node-${id} {
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
      `}</style>

      <NodeToolbar isVisible={selected} position="top" align="end" style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={toggleCollapse}
          style={{
            background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 7,
            color: '#0284c7', fontSize: 10, fontWeight: 600,
            cursor: 'pointer', padding: '4px 10px', fontFamily: 'system-ui',
            display: 'flex', alignItems: 'center', gap: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {collapsed ? '▶ Expandir' : '▼ Contraer'}
        </button>
        <button
          onClick={handleDuplicate}
          style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7,
            color: '#16a34a', fontSize: 10, fontWeight: 600,
            cursor: 'pointer', padding: '4px 10px', fontFamily: 'system-ui',
            display: 'flex', alignItems: 'center', gap: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          ❐ Duplicar
        </button>
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

      <div
        ref={nodeRef}
        className={`group-node-${id}`}
        style={{
          width: '100%', height: '100%',
          background: color.bg,
          border: `2px dashed ${selected ? color.border + 'bb' : color.border + '45'}`,
          borderRadius: 18,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          transition: 'border-color 0.15s',
        }}
      >

        {/* ── HEADER ROW 1: title + controls ── */}
        <div style={{
          padding: collapsed ? '6px 10px' : '8px 12px',
          borderBottom: `1px solid ${color.border}18`,
          display: 'flex', alignItems: 'center', gap: 8,
          background: color.border + '0b', flexShrink: 0,
        }}>
          {/* Color dots - hide when collapsed */}
          {!collapsed && (
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
              {COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => changeColor(c.id)}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    width: 11, height: 11, borderRadius: '50%',
                    background: c.border,
                    border: colorId === c.id ? '2px solid white' : '2px solid transparent',
                    outline: colorId === c.id ? `2px solid ${c.border}` : 'none',
                    cursor: 'pointer', padding: 0,
                  }}
                />
              ))}
            </div>
          )}

          {/* Title */}
          {editingTitle ? (
            <input
              ref={inputRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => saveTitle(title)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveTitle(title)
                if (e.key === 'Escape') { setTitle(data.title || 'Colección'); setEditingTitle(false) }
                e.stopPropagation()
              }}
              autoFocus
              style={{
                flex: 1, background: 'none', border: 'none',
                borderBottom: `1px solid ${color.border}`,
                color: color.border, fontSize: collapsed ? 10 : 12, fontWeight: 700,
                outline: 'none', fontFamily: 'system-ui', padding: '0 2px',
              }}
            />
          ) : (
            <span
              onDoubleClick={() => !collapsed && setEditingTitle(true)}
              title={collapsed ? '' : "Doble clic para editar"}
              style={{
                flex: 1, fontSize: collapsed ? 10 : 12, fontWeight: 700, color: color.border,
                cursor: collapsed ? 'default' : 'text', userSelect: 'none',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {title}
            </span>
          )}

          {/* Count badge - hide when collapsed (shown in body instead) */}
          {!collapsed && videosInGroup.length > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: color.border,
              background: color.border + '18', border: `1px solid ${color.border}30`,
              borderRadius: 20, padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {readyCount}/{videosInGroup.length}
            </span>
          )}

          <span style={{ fontSize: 9, color: '#94a3b8', flexShrink: 0 }}>COLECCIÓN</span>
        </div>

        {/* ── HEADER ROW 2: template selector + summarize (only when expanded) ── */}
        {!collapsed && (
          <div style={{
            padding: '5px 10px',
            borderBottom: `1px solid ${color.border}18`,
            background: color.border + '05',
            flexShrink: 0,
            display: 'flex', flexDirection: 'column', gap: 5,
          }}>
            {/* Row: template pill + action button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>

              {/* Template selector pill */}
              <button
                ref={tplBtnRef}
                onClick={openTplMenu}
                onMouseDown={e => e.stopPropagation()}
                title="Elegir plantilla de análisis"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: showTplMenu ? `${LLM_ACCENT}12` : `${color.border}0a`,
                  border: `1px solid ${showTplMenu ? LLM_ACCENT + '50' : color.border + '30'}`,
                  borderRadius: 20, padding: '2px 8px 2px 6px',
                  cursor: 'pointer', maxWidth: 140, overflow: 'hidden',
                }}
              >
                <span style={{ fontSize: 10, flexShrink: 0 }}>
                  {typeof curTemplate.icon === 'string' ? curTemplate.icon : <curTemplate.icon size={10} />}
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 600, color: showTplMenu ? LLM_ACCENT : '#64748b',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {curTemplate.label}
                </span>
                <span style={{ fontSize: 7, color: '#94a3b8', flexShrink: 0 }}>▾</span>
              </button>

              {/* Edit prompt button */}
              <button
                onClick={() => setInstrOpen(v => !v)}
                onMouseDown={e => e.stopPropagation()}
                title={instrOpen ? 'Cerrar prompt' : 'Ver/editar prompt'}
                style={{
                  background: instrOpen ? `${LLM_ACCENT}14` : 'none',
                  border: `1px solid ${instrOpen ? LLM_ACCENT + '40' : color.border + '25'}`,
                  borderRadius: 5, color: instrOpen ? LLM_ACCENT : '#94a3b8',
                  fontSize: 9, cursor: 'pointer', padding: '2px 6px', flexShrink: 0,
                }}
              >
                ✎
              </button>

              {summaryState === 'error' && (
                <span style={{ fontSize: 9, color: '#dc2626', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  ⚠ {summaryError}
                </span>
              )}
              <div style={{ flex: 1 }} />

              {/* Main action button */}
              {hasSummary ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => setShowModal(true)}
                    onMouseDown={e => e.stopPropagation()}
                    style={{
                      background: `${LLM_ACCENT}14`, border: `1px solid ${LLM_ACCENT}40`,
                      borderRadius: 6, color: LLM_ACCENT,
                      fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: '3px 10px',
                    }}
                  >✦ Ver análisis</button>
                  <button
                    onClick={handleSummarize}
                    onMouseDown={e => e.stopPropagation()}
                    disabled={isRunning || readyCount === 0}
                    title="Re-generar"
                    style={{
                      background: 'none', border: `1px solid ${color.border}30`,
                      borderRadius: 6, color: '#94a3b8',
                      fontSize: 10, cursor: 'pointer', padding: '3px 7px',
                    }}
                  >↺</button>
                </div>
              ) : (
                <button
                  onClick={handleSummarize}
                  onMouseDown={e => e.stopPropagation()}
                  disabled={isRunning || readyCount === 0}
                  title={readyCount === 0 ? 'Necesitás al menos un video transcrito' : `Analizar con: ${curTemplate.label}`}
                  style={{
                    background: isRunning ? `${LLM_ACCENT}14` : readyCount > 0 ? LLM_ACCENT : '#f1f5f9',
                    border: 'none', borderRadius: 6,
                    color: isRunning ? LLM_ACCENT : readyCount > 0 ? '#fff' : '#94a3b8',
                    fontSize: 10, fontWeight: 700,
                    cursor: readyCount > 0 && !isRunning ? 'pointer' : 'default',
                    padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {isRunning ? (
                    <>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        border: `2px solid ${LLM_ACCENT}40`, borderTopColor: LLM_ACCENT,
                        animation: 'spin 0.7s linear infinite', display: 'inline-block',
                      }} />
                      Analizando…
                    </>
                  ) : `✦ Analizar`}
                </button>
              )}
            </div>

            {/* Editable prompt (collapsible) */}
            {instrOpen && (
              <textarea
                value={instruction}
                onChange={e => handleInstructionChange(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                rows={3}
                placeholder="Escribí tu instrucción personalizada…"
                style={{
                  width: '100%', resize: 'vertical', boxSizing: 'border-box',
                  background: '#fff', border: `1px solid ${color.border}30`,
                  borderRadius: 6, color: '#334155', fontSize: 10,
                  fontFamily: 'system-ui', lineHeight: 1.5, padding: '5px 8px',
                  outline: 'none', minHeight: 48,
                }}
              />
            )}
          </div>
        )}

        {/* ── BODY: React Flow child nodes float here ── */}
        {collapsed ? (
          // Collapsed view: compact summary
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            gap: 8,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 9, fontWeight: 600, color: color.border,
                marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span>📹</span>
                <span>{videosInGroup.length} video{videosInGroup.length !== 1 ? 's' : ''}</span>
                {readyCount > 0 && (
                  <span style={{ color: '#22c55e' }}>({readyCount} listo{readyCount !== 1 ? 's' : ''})</span>
                )}
              </div>
              <div style={{ fontSize: 8, color: '#94a3b8' }}>
                {hasSummary ? '✓ Análisis generado' : summaryState === 'running' ? '⏳ Analizando...' : readyCount > 0 ? 'Listo para analizar' : 'Esperando transcripciones'}
              </div>
            </div>
          </div>
        ) : (
          // Expanded view: React Flow child nodes float here
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {videosInGroup.length === 0 && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none', textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, opacity: 0.18, marginBottom: 6 }}>↙</div>
                <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
                  Arrastrá videos aquí
                  <br />
                  <span style={{ fontSize: 10, color: '#b0bec5' }}>para agruparlos</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Handle labels (inside border, right side) - only when expanded ── */}
      {!collapsed && (
        <>
          <div style={{
            position: 'absolute', right: 18, top: '38%',
            transform: 'translateY(-50%)', pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 7, fontWeight: 700, color: LLM_ACCENT, letterSpacing: '0.05em', opacity: 0.7 }}>
              RESUMEN
            </span>
          </div>
          <div style={{
            position: 'absolute', right: 18, top: '72%',
            transform: 'translateY(-50%)', pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 7, fontWeight: 700, color: color.border, letterSpacing: '0.05em', opacity: 0.7 }}>
              VIDEOS
            </span>
          </div>
        </>
      )}

      {/* ── Two source handles - only when expanded ── */}
      {!collapsed && (
        <>
          <Handle
            type="source"
            id="summary"
            position={Position.Right}
            style={{
              top: '38%', bottom: 'auto',
              background: LLM_ACCENT, border: `2px solid ${LLM_ACCENT}60`,
              width: 10, height: 10, borderRadius: '50%',
              opacity: hasSummary ? 1 : 0.35,
            }}
          />
          <Handle
            type="source"
            id="transcripts"
            position={Position.Right}
            style={{
              top: '72%', bottom: 'auto',
              background: color.border, border: `2px solid ${color.border}60`,
              width: 10, height: 10, borderRadius: '50%',
            }}
          />
        </>
      )}

      {/* ── Collapsed mode: single handle on the right ── */}
      {collapsed && (
        <>
          <div style={{
            position: 'absolute', right: 18, top: '50%',
            transform: 'translateY(-50%)', pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 7, fontWeight: 700, color: LLM_ACCENT, letterSpacing: '0.05em', opacity: 0.7 }}>
              RESUMEN
            </span>
          </div>
          <Handle
            type="source"
            id="summary"
            position={Position.Right}
            style={{
              top: '50%', bottom: 'auto',
              background: hasSummary ? LLM_ACCENT : color.border,
              border: `2px solid ${hasSummary ? LLM_ACCENT : color.border}60`,
              width: 10, height: 10, borderRadius: '50%',
              opacity: hasSummary ? 1 : 0.35,
              transform: 'translateY(-50%)',
            }}
          />
        </>
      )}

      {/* ── Template picker dropdown (portaled) ── */}
      {showTplMenu && createPortal(
        <>
          {/* Backdrop to close */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
            onClick={() => setShowTplMenu(false)}
          />
          <div
            onMouseDown={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: Math.min(tplAnchor.left, window.innerWidth - 320),
              top: tplAnchor.top,
              zIndex: 99999,
              background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: 14, padding: '8px 6px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
              width: 310, fontFamily: 'system-ui',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', padding: '2px 8px 6px', letterSpacing: '0.06em' }}>
              PLANTILLAS DE ANÁLISIS
            </div>
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => selectTemplate(tpl)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 10px', borderRadius: 10, border: 'none',
                  background: templateId === tpl.id ? `${LLM_ACCENT}10` : 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                  outline: templateId === tpl.id ? `1.5px solid ${LLM_ACCENT}30` : 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (templateId !== tpl.id) e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { if (templateId !== tpl.id) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                  {typeof tpl.icon === 'string' ? tpl.icon : <tpl.icon size={16} />}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700,
                    color: templateId === tpl.id ? LLM_ACCENT : '#1e293b',
                  }}>{tpl.label}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>{tpl.desc}</div>
                </div>
                {templateId === tpl.id && (
                  <span style={{ fontSize: 10, color: LLM_ACCENT, flexShrink: 0, marginTop: 2 }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}

      {showModal && createPortal(
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(2px)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 18,
              padding: '24px 28px',
              maxWidth: 640, width: '90vw', maxHeight: '78vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
              border: `1.5px solid ${color.border}30`,
            }}
          >
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 16, flexShrink: 0,
            }}>
              <span style={{
                fontSize: 13, fontWeight: 800, color: LLM_ACCENT,
                letterSpacing: '-0.01em', flex: 1,
                display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
              }}>
                <span>
                  {typeof curTemplate.icon === 'string' ? curTemplate.icon : <curTemplate.icon size={13} />} {curTemplate.label}
                </span>
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>— {title}</span>
              </span>
              <button
                onClick={handleSummarize}
                disabled={isRunning || readyCount === 0}
                title="Re-generar resumen"
                style={{
                  background: 'none', border: `1px solid #e2e8f0`,
                  borderRadius: 7, color: '#94a3b8',
                  fontSize: 12, cursor: 'pointer', padding: '4px 10px',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                ↺ Re-generar
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: '#f1f5f9', border: 'none',
                  borderRadius: 8, color: '#64748b',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  width: 30, height: 30, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Videos count */}
            <div style={{
              fontSize: 10, color: '#94a3b8', marginBottom: 14,
              flexShrink: 0,
            }}>
              {readyCount} video{readyCount !== 1 ? 's' : ''} incluido{readyCount !== 1 ? 's' : ''}
              {videosInGroup.length > readyCount && ` (${videosInGroup.length - readyCount} sin transcripción)`}
            </div>

            {/* Summary content */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {isRunning ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: LLM_ACCENT, fontSize: 13 }}>
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%',
                    border: `2px solid ${LLM_ACCENT}40`, borderTopColor: LLM_ACCENT,
                    animation: 'spin 0.7s linear infinite', display: 'inline-block',
                    flexShrink: 0,
                  }} />
                  Generando resumen…
                </div>
              ) : <Markdown>{summary}</Markdown>}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

const MemoizedGroupNode = memo(GroupNode, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.data.title === nextProps.data.title &&
    prevProps.data.summary === nextProps.data.summary &&
    prevProps.data.state === nextProps.data.state
  )
})

MemoizedGroupNode.displayName = 'GroupNode'

export default MemoizedGroupNode
