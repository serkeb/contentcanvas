import { saveApiKeyToSupabase, loadApiKeysFromSupabase } from '../../lib/supabaseApiKeys.js'

const STORAGE_KEY = 'content-research-canvas-v1'
const CONFIG_KEY = 'content-research-config-v1'
const BRANDVOICE_KEY = 'content-research-brandvoices-v1'

// ─── Board persistence ──────────────────────────────────────────────────────────

const BOARDS_KEY   = 'canvas-boards-v1'
const CURRENT_KEY  = 'canvas-current-board-v1'
const BOARD_PREFIX = 'canvas-board-'
const LEGACY_KEY   = 'content-research-canvas-v1'

// Runs once on first load. Promotes the legacy single-canvas key into a board.
function migrateIfNeeded() {
  if (localStorage.getItem(BOARDS_KEY)) return  // already migrated
  const defaultBoard = { id: 'default', name: 'Tablero 1', createdAt: Date.now() }
  localStorage.setItem(BOARDS_KEY, JSON.stringify([defaultBoard]))
  localStorage.setItem(CURRENT_KEY, 'default')
  const legacy = localStorage.getItem(LEGACY_KEY)
  localStorage.setItem(
    BOARD_PREFIX + 'default',
    legacy || JSON.stringify({ nodes: [], edges: [] })
  )
}

export function saveCanvas(nodes, edges) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }))
  } catch (e) {
    console.warn('No se pudo guardar el canvas:', e)
  }
}

export function loadCanvas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { nodes: [], edges: [] }
    return JSON.parse(raw)
  } catch {
    return { nodes: [], edges: [] }
  }
}

export function clearCanvas() {
  localStorage.removeItem(STORAGE_KEY)
}

export function saveConfig(config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch (e) {
    console.warn('No se pudo guardar la config:', e)
  }
}

export function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/**
 * API keys storage — separate from general config for clarity.
 * Structure: { openai: 'sk-...', anthropic: 'sk-ant-...', gemini: 'AIza...', nano_banana: '...' }
 *
 * - loadApiKeys(): síncrono, solo lee localStorage (rápido)
 * - loadApiKeysAsync(): asíncrono, carga desde Supabase primero (persistencia)
 * - saveApiKeys(): asíncrono, guarda en ambos lugares
 */
const KEYS_KEY = 'content-research-api-keys-v1'

export async function saveApiKeys(keys) {
  try {
    // Guardar en localStorage (fallback rápido)
    localStorage.setItem(KEYS_KEY, JSON.stringify(keys))

    // Intentar guardar en Supabase (persistencia en la nube)
    try {
      const providers = ['openai', 'anthropic', 'gemini', 'nano_banana']

      for (const provider of providers) {
        if (keys[provider]) {
          await saveApiKeyToSupabase(provider, keys[provider])
        }
      }
    } catch (error) {
      console.warn('No se pudo guardar en Supabase (puede que el usuario no esté logueado):', error)
    }
  } catch (e) {
    console.warn('No se pudo guardar las keys:', e)
  }
}

/**
 * Carga API keys desde localStorage síncronamente (rápido, sin Supabase)
 * Útil para inicialización de componentes donde no necesitamos esperar
 */
export function loadApiKeys() {
  try {
    const raw = localStorage.getItem(KEYS_KEY)
    if (!raw) {
      // Migrate legacy single key if present
      const cfg = loadConfig()
      if (cfg.apiKey) return { openai: cfg.apiKey, anthropic: '', gemini: '', nano_banana: '' }
      return { openai: '', anthropic: '', gemini: '', nano_banana: '' }
    }
    const parsed = JSON.parse(raw)
    return { openai: '', anthropic: '', gemini: '', nano_banana: '', ...parsed }
  } catch {
    return { openai: '', anthropic: '', gemini: '', nano_banana: '' }
  }
}

/**
 * Carga API keys desde Supabase primero (persistencia en la nube), luego fallback a localStorage
 * Útil para cargar las keys actualizadas cuando el usuario se loguea
 */
export async function loadApiKeysAsync() {
  try {
    // Primero intentar cargar desde Supabase
    try {
      const supabaseKeys = await loadApiKeysFromSupabase()

      // Si hay keys en Supabase, usarlas
      if (Object.keys(supabaseKeys).length > 0) {
        // También actualizar localStorage para tener backup local
        localStorage.setItem(KEYS_KEY, JSON.stringify(supabaseKeys))
        return { openai: '', anthropic: '', gemini: '', nano_banana: '', ...supabaseKeys }
      }
    } catch (error) {
      console.warn('No se pudo cargar desde Supabase (puede que no esté logueado):', error)
    }

    // Fallback a localStorage
    return loadApiKeys()
  } catch {
    return { openai: '', anthropic: '', gemini: '', nano_banana: '' }
  }
}

/** Returns true if at least one provider key is configured (async version) */
export async function hasAnyApiKey() {
  const keys = await loadApiKeysAsync()
  return !!(keys.openai || keys.anthropic || keys.gemini || keys.nano_banana)
}

/** Returns true if at least one provider key is configured (sync version - solo localStorage) */
export function hasAnyApiKeySync() {
  const keys = loadApiKeys()
  return !!(keys.openai || keys.anthropic || keys.gemini || keys.nano_banana)
}

// ─── BrandVoice persistence ───────────────────────────────────────────────────────

export function saveBrandVoice(brandVoice) {
  try {
    const saved = loadBrandVoices()
    const existingIndex = saved.findIndex(bv => bv.id === brandVoice.id)

    if (existingIndex >= 0) {
      saved[existingIndex] = brandVoice
    } else {
      saved.push(brandVoice)
    }

    localStorage.setItem(BRANDVOICE_KEY, JSON.stringify(saved))
    return true
  } catch (e) {
    console.warn('No se pudo guardar el BrandVoice:', e)
    return false
  }
}

export function loadBrandVoices() {
  try {
    const raw = localStorage.getItem(BRANDVOICE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function deleteBrandVoice(id) {
  try {
    const saved = loadBrandVoices()
    const filtered = saved.filter(bv => bv.id !== id)
    localStorage.setItem(BRANDVOICE_KEY, JSON.stringify(filtered))
    return true
  } catch (e) {
    console.warn('No se pudo eliminar el BrandVoice:', e)
    return false
  }
}

export function getBrandVoiceById(id) {
  try {
    const saved = loadBrandVoices()
    return saved.find(bv => bv.id === id) || null
  } catch {
    return null
  }
}

export function listBoards() {
  migrateIfNeeded()
  try {
    const raw = localStorage.getItem(BOARDS_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch { return [] }
}

export function saveBoards(boards) {
  try { localStorage.setItem(BOARDS_KEY, JSON.stringify(boards)) }
  catch (e) { console.warn('No se pudo guardar los tableros:', e) }
}

export function getCurrentBoardId() {
  migrateIfNeeded()
  return localStorage.getItem(CURRENT_KEY) || 'default'
}

export function setCurrentBoardId(id) {
  localStorage.setItem(CURRENT_KEY, id)
}

export function saveBoard(id, nodes, edges) {
  try { localStorage.setItem(BOARD_PREFIX + id, JSON.stringify({ nodes, edges })) }
  catch (e) { console.warn('No se pudo guardar el tablero:', e) }
}

export function loadBoard(id) {
  try {
    const raw = localStorage.getItem(BOARD_PREFIX + id)
    if (!raw) return { nodes: [], edges: [] }
    const data = JSON.parse(raw)
    // Validate: filter nodes/edges with missing required fields
    const nodes = (data.nodes || []).filter(n => n && n.id && n.type)
    const nodeIds = new Set(nodes.map(n => n.id))
    const edges = (data.edges || []).filter(
      e => e && e.source && e.target && nodeIds.has(e.source) && nodeIds.has(e.target)
    )
    return { nodes, edges }
  } catch { return { nodes: [], edges: [] } }
}

export function deleteBoardData(id) {
  localStorage.removeItem(BOARD_PREFIX + id)
}
