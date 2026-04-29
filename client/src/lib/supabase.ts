import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Configuración de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Helper para obtener el usuario actual
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// Helper para crear o actualizar usuario
export async function ensureUserExists(email?: string, name?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  // Llamar a la función RPC de Supabase
  const { data, error } = await supabase.rpc('create_user_if_not_exists', {
    p_user_id: user.id,
    p_email: email || user.email,
    p_name: name || user.user_metadata?.name
  })

  if (error) throw error
  return data
}