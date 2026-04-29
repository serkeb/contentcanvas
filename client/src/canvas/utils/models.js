/**
 * models.js — Catálogo completo de modelos IA disponibles (2026).
 *
 * Providers soportados: openai · anthropic · gemini
 * Cada modelo tiene: id (API), provider, label, group, tier, description, inputCostPer1M, outputCostPer1M
 *
 * Este archivo es la única fuente de verdad para modelos en toda la app.
 * Los nodos lo importan para armar sus selectores.
 */

export const MODELS = [
  // ── OpenAI — GPT 4.1 ─────────────────────────────────────────────────────────
  {
    id:              'gpt-4.1',
    provider:        'openai',
    label:           'GPT-4.1',
    group:           'OpenAI',
    tier:            'standard',
    recommended:     true,
    description:     'Equilibrio perfecto entre calidad y velocidad. Ideal para la mayoría de tareas.',
    inputCostPer1M:  3.00,
    outputCostPer1M: 12.00,
    supportsReasoning: false,
  },
  {
    id:              'gpt-4.1-mini',
    provider:        'openai',
    label:           'GPT-4.1 Mini',
    group:           'OpenAI',
    tier:            'fast',
    description:     'Rápido y económico. Ideal para ideas, scripts cortos y tareas repetitivas.',
    inputCostPer1M:  0.80,
    outputCostPer1M: 3.20,
    supportsReasoning: false,
  },
  {
    id:              'gpt-4.1-nano',
    provider:        'openai',
    label:           'GPT-4.1 Nano',
    group:           'OpenAI',
    tier:            'economy',
    description:     'El más barato de OpenAI. Para uso masivo o drafts rápidos.',
    inputCostPer1M:  0.20,
    outputCostPer1M: 0.80,
    supportsReasoning: false,
  },
  // ── OpenAI — GPT 5.2 ─────────────────────────────────────────────────────────
  {
    id:              'gpt-5.2',
    provider:        'openai',
    label:           'GPT-5.2',
    group:           'OpenAI',
    tier:            'flagship',
    description:     'Última generación. Razonamiento superior para tareas complejas.',
    inputCostPer1M:  1.75,
    outputCostPer1M: 14.00,
    supportsReasoning: true,
  },
  // ── OpenAI — GPT 5.4 ─────────────────────────────────────────────────────────
  {
    id:              'gpt-5.4',
    provider:        'openai',
    label:           'GPT-5.4',
    group:           'OpenAI',
    tier:            'flagship',
    description:     'El modelo más avanzado de OpenAI. Máxima capacidad con razonamiento ajustable.',
    inputCostPer1M:  3.75,
    outputCostPer1M: 18.75,
    supportsReasoning: true,
  },
]

/** Niveles de reasoning disponibles para modelos que lo soportan */
export const REASONING_LEVELS = [
  { value: 'minimal', label: 'Minimal', description: 'Respuestas rápidas con ligera pausa para pensar' },
  { value: 'low', label: 'Low', description: 'Balance entre velocidad y profundidad' },
  { value: 'medium', label: 'Medium', description: 'Análisis profundo sin sacrificar demasiada velocidad' },
  { value: 'high', label: 'High', description: 'Máxima profundidad para los problemas más complejos' },
]

/** Devuelve el provider de un model ID (siempre 'openai') */
export function getProvider(modelId) {
  return 'openai'
}

/** Verifica si un modelo soporta reasoning */
export function supportsReasoning(modelId) {
  const model = MODELS.find(m => m.id === modelId)
  return model?.supportsReasoning || false
}

/** Devuelve el nivel de reasoning default para un modelo */
export function getDefaultReasoningLevel(modelId) {
  return supportsReasoning(modelId) ? 'low' : null
}

/** Devuelve solo los modelos para los cuales hay key configurada */
export function getAvailableModels(keys = {}) {
  return keys.openai ? MODELS : []
}

/** Default recomendado: GPT-4.1 */
export function getDefaultModel(keys = {}) {
  return keys.openai ? 'gpt-4.1' : 'gpt-4.1'
}

/** Agrupa modelos por provider para el selector con optgroup */
export function groupedModels(models = MODELS) {
  const groups = {}
  models.forEach(m => {
    if (!groups[m.group]) groups[m.group] = []
    groups[m.group].push(m)
  })
  return Object.entries(groups).map(([group, items]) => ({ group, items }))
}

/** Tier badges para UI */
export const TIER_LABELS = {
  flagship:  { label: '⭐ Flagship',  color: '#7c3aed' },
  standard:  { label: '✦ Standard',   color: '#2563eb' },
  fast:      { label: '⚡ Fast',       color: '#059669' },
  economy:   { label: '💰 Economy',    color: '#64748b' },
  reasoning: { label: '🧠 Reasoning',  color: '#dc2626' },
}

// Pricing helpers (reusan los datos de cada modelo)
export function calcModelCost(modelId, promptTokens, completionTokens) {
  const m = MODELS.find(m => m.id === modelId)
  if (!m) return 0
  return (promptTokens * m.inputCostPer1M + completionTokens * m.outputCostPer1M) / 1_000_000
}
