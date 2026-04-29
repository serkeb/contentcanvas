/**
 * Cliente de Supabase y funciones para manejar API keys
 */

import { createClient } from '@supabase/supabase-js'

// Usar las variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url') || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key') || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Some features may not work.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Guarda una API key en Supabase para el usuario actual
 */
export async function saveApiKeyToSupabase(provider, apiKey) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Usuario no autenticado')
    }

    // Primero chequear si ya existe una key para este provider
    const { data: existing } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single()

    if (existing) {
      // Actualizar la existente
      const { error } = await supabase
        .from('user_api_keys')
        .update({
          api_key_encrypted: btoa(apiKey), // TODO: Usar cifrado real en producción
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (error) throw error
    } else {
      // Crear nueva
      const { error } = await supabase
        .from('user_api_keys')
        .insert({
          user_id: user.id,
          provider: provider,
          api_key_encrypted: btoa(apiKey), // TODO: Usar cifrado real en producción
          is_default: true
        })

      if (error) throw error
    }

    return true
  } catch (error) {
    console.error('Error guardando API key en Supabase:', error)
    throw error
  }
}

/**
 * Obtiene todas las API keys del usuario desde Supabase
 */
export async function loadApiKeysFromSupabase() {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return {}
    }

    const { data, error } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', user.id)

    if (error) throw error

    // Convertir al formato esperado: { openai: 'sk-...', ... }
    const apiKeys = {}
    data.forEach(key => {
      try {
        apiKeys[key.provider] = atob(key.api_key_encrypted) // TODO: Usar descifrado real en producción
      } catch (e) {
        console.error('Error descifrando API key:', e)
        apiKeys[key.provider] = ''
      }
    })

    return apiKeys
  } catch (error) {
    console.error('Error cargando API keys desde Supabase:', error)
    return {} // Retornar vacío en caso de error
  }
}

/**
 * Elimina una API key específica del usuario
 */
export async function deleteApiKeyFromSupabase(provider) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Usuario no autenticado')
    }

    const { error } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error eliminando API key de Supabase:', error)
    throw error
  }
}

/**
 * Sincroniza API keys desde localStorage a Supabase
 * Se usa para migrar keys existentes
 */
export async function syncLocalKeysToSupabase() {
  try {
    const localKeys = loadApiKeysFromLocalStorage()
    const providers = ['openai', 'anthropic', 'gemini', 'nano_banana']

    for (const provider of providers) {
      if (localKeys[provider]) {
        await saveApiKeyToSupabase(provider, localKeys[provider])
      }
    }

    return true
  } catch (error) {
    console.error('Error sincronizando keys a Supabase:', error)
    return false
  }
}

/**
 * Carga API keys desde localStorage (función auxiliar)
 */
function loadApiKeysFromLocalStorage() {
  try {
    const KEYS_KEY = 'content-research-api-keys-v1'
    const raw = localStorage.getItem(KEYS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { openai: '', anthropic: '', gemini: '', nano_banana: '', ...parsed }
    }
    return { openai: '', anthropic: '', gemini: '', nano_banana: '' }
  } catch {
    return { openai: '', anthropic: '', gemini: '', nano_banana: '' }
  }
}
