export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string | null
          encrypted_key: string
          id: string
          provider: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          encrypted_key: string
          id?: string
          provider: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          encrypted_key?: string
          id?: string
          provider?: string
          updated_at?: string | null
          user_id?: string | null
        }
      }
      boards: {
        Row: {
          created_at: string | null
          edges: Json
          id: string
          is_default: boolean | null
          name: string
          nodes: Json
          updated_at: string | null
          user_id: string | null
          viewport: Json | null
        }
        Insert: {
          created_at?: string | null
          edges?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          nodes?: Json
          updated_at?: string | null
          user_id?: string | null
          viewport?: Json | null
        }
        Update: {
          created_at?: string | null
          edges?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          nodes?: Json
          updated_at?: string | null
          user_id?: string | null
          viewport?: Json | null
        }
      }
      brand_voices: {
        Row: {
          brand_voice_data: Json
          created_at: string | null
          id: string
          name: string
          person_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          brand_voice_data?: Json
          created_at?: string | null
          id?: string
          name: string
          person_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          brand_voice_data?: Json
          created_at?: string | null
          id?: string
          name?: string
          person_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
      }
      documents: {
        Row: {
          created_at: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          name: string
          pages: number | null
          text: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          name: string
          pages?: number | null
          text?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          pages?: number | null
          text?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
      }
      profile_analyses: {
        Row: {
          analysis: string | null
          created_at: string | null
          id: string
          platform: string | null
          profile_data: Json | null
          updated_at: string | null
          user_id: string | null
          username: string
          video_count: number | null
          videos: Json | null
        }
        Insert: {
          analysis?: string | null
          created_at?: string | null
          id?: string
          platform?: string | null
          profile_data?: Json | null
          updated_at?: string | null
          user_id?: string | null
          username: string
          video_count?: number | null
          videos?: Json | null
        }
        Update: {
          analysis?: string | null
          created_at?: string | null
          id?: string
          platform?: string | null
          profile_data?: Json | null
          updated_at?: string | null
          user_id?: string | null
          username?: string
          video_count?: number | null
          videos?: Json | null
        }
      }
      token_usage: {
        Row: {
          completion_tokens: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          model: string
          operation: string | null
          prompt_tokens: number | null
          provider: string
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model: string
          operation?: string | null
          prompt_tokens?: number | null
          provider: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model?: string
          operation?: string | null
          prompt_tokens?: number | null
          provider?: string
          total_tokens?: number | null
          user_id?: string | null
        }
      }
      transcripts: {
        Row: {
          audio_seconds: number | null
          created_at: string | null
          id: string
          language: string | null
          metadata: Json | null
          platform: string | null
          source: string | null
          transcript: string | null
          updated_at: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          audio_seconds?: number | null
          created_at?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          platform?: string | null
          source?: string | null
          transcript?: string | null
          updated_at?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          audio_seconds?: number | null
          created_at?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          platform?: string | null
          source?: string | null
          transcript?: string | null
          updated_at?: string | null
          url?: string
          user_id?: string | null
        }
      }
      user_settings: {
        Row: {
          created_at: string | null
          id: string
          settings: Json
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          settings?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          settings?: Json
          updated_at?: string | null
          user_id?: string | null
        }
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
      }
      datasets: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
      }
      dataset_items: {
        Row: {
          created_at: string | null
          date: string | null
          dataset_id: string
          description: string | null
          end_date: string | null
          id: string
          linked_node_ids: string[] | null
          platform: string | null
          priority: string | null
          start_date: string | null
          status: string | null
          tags: string[] | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          dataset_id: string
          description?: string | null
          end_date?: string | null
          id?: string
          linked_node_ids?: string[] | null
          platform?: string | null
          priority?: string | null
          start_date?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          dataset_id?: string
          description?: string | null
          end_date?: string | null
          id?: string
          linked_node_ids?: string[] | null
          platform?: string | null
          priority?: string | null
          start_date?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
      }
      dataset_views: {
        Row: {
          config: Json
          created_at: string | null
          dataset_id: string
          id: string
          name: string
          type: string
        }
        Insert: {
          config?: Json
          created_at?: string | null
          dataset_id: string
          id?: string
          name: string
          type: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          dataset_id?: string
          id?: string
          name?: string
          type?: string
        }
      }
    }
  }
}

// Tipos útiles para la aplicación
export type Board = Database['public']['Tables']['boards']['Row']
export type BoardInsert = Database['public']['Tables']['boards']['Insert']
export type BrandVoice = Database['public']['Tables']['brand_voices']['Row']
export type BrandVoiceInsert = Database['public']['Tables']['brand_voices']['Insert']
export type ApiKey = Database['public']['Tables']['api_keys']['Row']
export type ApiKeyInsert = Database['public']['Tables']['api_keys']['Insert']
export type Document = Database['public']['Tables']['documents']['Row']
export type Transcript = Database['public']['Tables']['transcripts']['Row']
export type ProfileAnalysis = Database['public']['Tables']['profile_analyses']['Row']
export type TokenUsage = Database['public']['Tables']['token_usage']['Row']
export type UserSettings = Database['public']['Tables']['user_settings']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Dataset = Database['public']['Tables']['datasets']['Row']
export type DatasetInsert = Database['public']['Tables']['datasets']['Insert']
export type DatasetItem = Database['public']['Tables']['dataset_items']['Row']
export type DatasetItemInsert = Database['public']['Tables']['dataset_items']['Insert']
export type DatasetView = Database['public']['Tables']['dataset_views']['Row']
export type DatasetViewInsert = Database['public']['Tables']['dataset_views']['Insert']

// Tipos para React Flow
export type Node = {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, any>
}

export type Edge = {
  id: string
  source: string
  target: string
  type?: string
  style?: Record<string, any>
  markerEnd?: Record<string, any>
}