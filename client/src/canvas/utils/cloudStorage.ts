import { supabase, getCurrentUser, ensureUserExists } from '../../lib/supabase'
import type { Board, BrandVoice, ApiKey, UserSettings, Node, Edge } from '../../types/database'

// ─── BOARD PERSISTENCE ───────────────────────────────────────────────────────────

/**
 * Obtiene todos los tableros del usuario
 */
export async function listBoards(): Promise<Board[]> {
  try {
    const user = await getCurrentUser()
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error loading boards:', error)
    return []
  }
}

/**
 * Guarda la lista de tableros (para compatibilidad con la interfaz original)
 */
export async function saveBoards(boards: Board[]): Promise<void> {
  // En Supabase no necesitamos guardar la lista separadamente,
  // ya que cada tablero es una fila independiente
  // Esta función es para compatibilidad con la interfaz original
}

/**
 * Obtiene el ID del tablero actual desde localStorage
 */
export async function getCurrentBoardId(): Promise<string> {
  const stored = localStorage.getItem('canvas-current-board-v1')
  if (stored) return stored

  // Si no hay tablero actual, obtener el default o el primero
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('boards')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .limit(1)
    .single()

  if (data?.id) {
    setCurrentBoardId(data.id)
    return data.id
  }

  // Si no hay default, obtener el primero
  const { data: firstBoard } = await supabase
    .from('boards')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (firstBoard?.id) {
    setCurrentBoardId(firstBoard.id)
    return firstBoard.id
  }

  return 'default'
}

/**
 * Establece el ID del tablero actual
 */
export function setCurrentBoardId(id: string): void {
  localStorage.setItem('canvas-current-board-v1', id)
}

/**
 * Guarda un tablero (nodes y edges)
 */
export async function saveBoard(id: string, nodes: Node[], edges: Edge[]): Promise<void> {
  try {
    const user = await getCurrentUser()

    // Verificar si el tablero existe
    const { data: existing } = await supabase
      .from('boards')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      // Actualizar tablero existente
      const { error } = await supabase
        .from('boards')
        .update({
          nodes: nodes as any,
          edges: edges as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
    } else {
      // Crear nuevo tablero
      const { error } = await supabase
        .from('boards')
        .insert({
          id,
          user_id: user.id,
          name: `Tablero ${Date.now()}`,
          nodes: nodes as any,
          edges: edges as any
        })

      if (error) throw error
    }
  } catch (error) {
    console.error('Error saving board:', error)
    throw error
  }
}

/**
 * Carga un tablero
 */
export async function loadBoard(id: string): Promise<{ nodes: Node[], edges: Edge[] }> {
  try {
    const user = await getCurrentUser()
    const { data, error } = await supabase
      .from('boards')
      .select('nodes, edges')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) throw error

    // Validar y filtrar nodes/edges
    const nodes = (data?.nodes || []).filter((n: any) => n && n.id && n.type)
    const nodeIds = new Set(nodes.map((n: any) => n.id))
    const edges = (data?.edges || []).filter((e: any) =>
      e && e.source && e.target && nodeIds.has(e.source) && nodeIds.has(e.target)
    )

    return { nodes, edges }
  } catch (error) {
    console.error('Error loading board:', error)
    return { nodes: [], edges: [] }
  }
}

/**
 * Elimina los datos de un tablero
 */
export async function deleteBoardData(id: string): Promise<void> {
  try {
    const user = await getCurrentUser()
    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting board:', error)
    throw error
  }
}

/**
 * Crea un nuevo tablero
 */
export async function createBoard(name: string): Promise<string> {
  try {
    const user = await getCurrentUser()
    const id = `board-${Date.now()}`

    const { error } = await supabase
      .from('boards')
      .insert({
        id,
        user_id: user.id,
        name: name.trim(),
        nodes: [],
        edges: []
      })

    if (error) throw error
    return id
  } catch (error) {
    console.error('Error creating board:', error)
    throw error
  }
}

/**
 * Renombra un tablero
 */
export async function renameBoard(id: string, name: string): Promise<void> {
  try {
    const user = await getCurrentUser()
    const { error } = await supabase
      .from('boards')
      .update({ name: name.trim() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
  } catch (error) {
    console.error('Error renaming board:', error)
    throw error
  }
}

// ─── CONFIG PERSISTENCE ──────────────────────────────────────────────────────────

const CONFIG_KEY = 'content-research-config-v1'

export async function saveConfig(config: Record<string, any>): Promise<void> {
  try {
    const user = await getCurrentUser()
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .single()

    const settings = { config }

    if (existing) {
      await supabase
        .from('user_settings')
        .update({ settings: settings as any })
        .eq('user_id', user.id)
    } else {
      await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          settings: settings as any
        })
    }
  } catch (error) {
    console.error('Error saving config:', error)
    // Fallback a localStorage
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  }
}

export async function loadConfig(): Promise<Record<string, any>> {
  try {
    const user = await getCurrentUser()
    const { data, error } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', user.id)
      .single()

    if (data?.settings) {
      return (data.settings as any).config || {}
    }
    return {}
  } catch (error) {
    console.error('Error loading config:', error)
    // Fallback a localStorage
    const stored = localStorage.getItem(CONFIG_KEY)
    return stored ? JSON.parse(stored) : {}
  }
}

// ─── API KEYS PERSISTENCE ───────────────────────────────────────────────────────

export async function saveApiKeys(keys: { openai?: string, anthropic?: string, gemini?: string }): Promise<void> {
  try {
    const user = await getCurrentUser()

    // Guardar cada API key por separado
    for (const [provider, key] of Object.entries(keys)) {
      if (key && provider !== 'openai' && provider !== 'anthropic' && provider !== 'gemini') continue

      if (key) {
        const { error } = await supabase
          .from('api_keys')
          .upsert({
            user_id: user.id,
            provider,
            encrypted_key: key, // NOTA: En producción, encriptar esto
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,provider'
          })

        if (error) throw error
      }
    }
  } catch (error) {
    console.error('Error saving API keys:', error)
    // Fallback a localStorage
    const KEYS_KEY = 'content-research-api-keys-v1'
    localStorage.setItem(KEYS_KEY, JSON.stringify(keys))
  }
}

export async function loadApiKeys(): Promise<{ openai: string, anthropic: string, gemini: string }> {
  try {
    const user = await getCurrentUser()
    const { data, error } = await supabase
      .from('api_keys')
      .select('provider, encrypted_key')
      .eq('user_id', user.id)

    if (error) throw error

    const keys: any = {
      openai: '',
      anthropic: '',
      gemini: ''
    }

    for (const item of data || []) {
      keys[item.provider] = item.encrypted_key
    }

    return keys
  } catch (error) {
    console.error('Error loading API keys:', error)
    // Fallback a localStorage
    const KEYS_KEY = 'content-research-api-keys-v1'
    const stored = localStorage.getItem(KEYS_KEY)
    if (stored) return JSON.parse(stored)
    return { openai: '', anthropic: '', gemini: '' }
  }
}

export async function hasAnyApiKey(): Promise<boolean> {
  const keys = await loadApiKeys()
  return !!(keys.openai || keys.anthropic || keys.gemini)
}

// ─── BRANDVOICE PERSISTENCE ───────────────────────────────────────────────────────

export async function saveBrandVoice(brandVoice: BrandVoiceInsert): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    const { error } = await supabase
      .from('brand_voices')
      .upsert({
        ...brandVoice,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error saving BrandVoice:', error)
    return false
  }
}

export async function loadBrandVoices(): Promise<BrandVoice[]> {
  try {
    const user = await getCurrentUser()
    const { data, error } = await supabase
      .from('brand_voices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error loading BrandVoices:', error)
    return []
  }
}

export async function deleteBrandVoice(id: string): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    const { error } = await supabase
      .from('brand_voices')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting BrandVoice:', error)
    return false
  }
}

export async function getBrandVoiceById(id: string): Promise<BrandVoice | null> {
  try {
    const user = await getCurrentUser()
    const { data, error } = await supabase
      .from('brand_voices')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error loading BrandVoice:', error)
    return null
  }
}

// ─── LEGACY FUNCTIONS (for backward compatibility) ────────────────────────────────

export async function saveCanvas(nodes: Node[], edges: Edge[]): Promise<void> {
  const currentBoardId = await getCurrentBoardId()
  await saveBoard(currentBoardId, nodes, edges)
}

export async function loadCanvas(): Promise<{ nodes: Node[], edges: Edge[] }> {
  const currentBoardId = await getCurrentBoardId()
  return loadBoard(currentBoardId)
}

export async function clearCanvas(): Promise<void> {
  const currentBoardId = await getCurrentBoardId()
  await saveBoard(currentBoardId, [], [])
}