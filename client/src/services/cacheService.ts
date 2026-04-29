import { supabase, getCurrentUser } from '../lib/supabase'
import type { Transcript, Document } from '../types/database'

// ─── TRANSCRIPT CACHE ─────────────────────────────────────────────────────────────

/**
 * Busca una transcripción cacheada por URL
 */
export async function getCachedTranscript(url: string): Promise<Transcript | null> {
  try {
    const user = await getCurrentUser()
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('user_id', user.id)
      .eq('url', url)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting cached transcript:', error)
    return null
  }
}

/**
 * Guarda una transcripción en caché
 */
export async function saveCachedTranscript(transcript: {
  url: string
  platform?: string
  transcript: string
  language?: string
  source?: string
  audio_seconds?: number
  metadata?: Record<string, any>
}): Promise<void> {
  try {
    const user = await getCurrentUser()

    // Verificar si ya existe una transcripción para esta URL
    const existing = await getCachedTranscript(transcript.url)

    if (existing) {
      // Actualizar existente
      const { error } = await supabase
        .from('transcripts')
        .update({
          transcript: transcript.transcript,
          language: transcript.language,
          source: transcript.source,
          audio_seconds: transcript.audio_seconds,
          metadata: transcript.metadata as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (error) throw error
    } else {
      // Crear nueva
      const { error } = await supabase
        .from('transcripts')
        .insert({
          user_id: user.id,
          url: transcript.url,
          platform: transcript.platform || 'other',
          transcript: transcript.transcript,
          language: transcript.language,
          source: transcript.source,
          audio_seconds: transcript.audio_seconds,
          metadata: transcript.metadata as any
        })

      if (error) throw error
    }
  } catch (error) {
    console.error('Error saving cached transcript:', error)
    throw error
  }
}

/**
 * Busca transcripciones por texto
 */
export async function searchTranscripts(searchText: string): Promise<Transcript[]> {
  try {
    const user = await getCurrentUser()
    const { data, error } = await supabase
      .rpc('search_transcripts', {
        p_user_id: user.id,
        p_search_text: searchText
      })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error searching transcripts:', error)
    return []
  }
}

/**
 * Obtiene transcripciones recientes
 */
export async function getRecentTranscripts(limit: number = 50): Promise<Transcript[]> {
  try {
    const user = await getCurrentUser()
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting recent transcripts:', error)
    return []
  }
}

// ─── DOCUMENT CACHE ───────────────────────────────────────────────────────────────

/**
 * Guarda un documento extraído en caché
 */
export async function saveCachedDocument(document: {
  name: string
  type: string
  text: string
  file_url?: string
  pages?: number
  metadata?: Record<string, any>
}): Promise<void> {
  try {
    const user = await getCurrentUser()

    // Verificar si ya existe un documento con el mismo nombre
    const { data: existing } = await supabase
      .from('documents')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', document.name)
      .maybeSingle()

    if (existing) {
      // Actualizar existente
      const { error } = await supabase
        .from('documents')
        .update({
          text: document.text,
          type: document.type,
          file_url: document.file_url,
          pages: document.pages,
          metadata: document.metadata as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (error) throw error
    } else {
      // Crear nuevo
      const { error } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          name: document.name,
          type: document.type,
          text: document.text,
          file_url: document.file_url,
          pages: document.pages,
          metadata: document.metadata as any
        })

      if (error) throw error
    }
  } catch (error) {
    console.error('Error saving cached document:', error)
    throw error
  }
}

/**
 * Busca un documento por nombre
 */
export async function getCachedDocument(name: string): Promise<Document | null> {
  try {
    const user = await getCurrentUser()
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', name)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting cached document:', error)
    return null
  }
}

/**
 * Obtiene todos los documentos del usuario
 */
export async function getAllDocuments(): Promise<Document[]> {
  try {
    const user = await getCurrentUser()
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting documents:', error)
    return []
  }
}

/**
 * Elimina un documento
 */
export async function deleteDocument(id: string): Promise<void> {
  try {
    const user = await getCurrentUser()
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting document:', error)
    throw error
  }
}

// ─── PROFILE ANALYSIS CACHE ──────────────────────────────────────────────────────

/**
 * Guarda un análisis de perfil en caché
 */
export async function saveProfileAnalysis(analysis: {
  platform: string
  username: string
  profile_data: Record<string, any>
  analysis?: string
  video_count?: number
  videos?: any[]
}): Promise<void> {
  try {
    const user = await getCurrentUser()

    // Verificar si ya existe un análisis para este perfil
    const { data: existing } = await supabase
      .from('profile_analyses')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', analysis.platform)
      .eq('username', analysis.username)
      .maybeSingle()

    if (existing) {
      // Actualizar existente
      const { error } = await supabase
        .from('profile_analyses')
        .update({
          profile_data: analysis.profile_data as any,
          analysis: analysis.analysis,
          video_count: analysis.video_count,
          videos: analysis.videos as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (error) throw error
    } else {
      // Crear nuevo
      const { error } = await supabase
        .from('profile_analyses')
        .insert({
          user_id: user.id,
          platform: analysis.platform,
          username: analysis.username,
          profile_data: analysis.profile_data as any,
          analysis: analysis.analysis,
          video_count: analysis.video_count,
          videos: analysis.videos as any
        })

      if (error) throw error
    }
  } catch (error) {
    console.error('Error saving profile analysis:', error)
    throw error
  }
}

/**
 * Obtiene un análisis de perfil cacheado
 */
export async function getCachedProfileAnalysis(platform: string, username: string): Promise<any | null> {
  try {
    const user = await getCurrentUser()
    const { data, error } = await supabase
      .from('profile_analyses')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('username', username)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting cached profile analysis:', error)
    return null
  }
}

// ─── TOKEN USAGE TRACKING ─────────────────────────────────────────────────────────

/**
 * Registra el uso de tokens para cost tracking
 */
export async function trackTokenUsage(usage: {
  model: string
  provider: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  operation?: string
  metadata?: Record<string, any>
}): Promise<void> {
  try {
    const user = await getCurrentUser()
    const { error } = await supabase
      .from('token_usage')
      .insert({
        user_id: user.id,
        model: usage.model,
        provider: usage.provider,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        operation: usage.operation,
        metadata: usage.metadata as any
      })

    if (error) throw error
  } catch (error) {
    console.error('Error tracking token usage:', error)
    // No lanzar error, es solo tracking
  }
}

/**
 * Obtiene estadísticas de consumo de tokens
 */
export async function getTokenStats(days: number = 30): Promise<any[]> {
  try {
    const user = await getCurrentUser()
    const { data, error } = await supabase
      .rpc('get_token_stats', {
        p_user_id: user.id,
        p_days: days
      })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting token stats:', error)
    return []
  }
}