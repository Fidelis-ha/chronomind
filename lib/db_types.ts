export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      time_entries: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          category: string | null
          tags: string[] | null
          started_at: string
          ended_at: string | null
          duration_seconds: number | null
          source: 'ai_chat' | 'manual' | 'voice' | 'calendar'
          calendar_event_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          category?: string | null
          tags?: string[] | null
          started_at: string
          ended_at?: string | null
          source?: 'ai_chat' | 'manual' | 'voice' | 'calendar'
          calendar_event_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          category?: string | null
          tags?: string[] | null
          started_at?: string
          ended_at?: string | null
          source?: 'ai_chat' | 'manual' | 'voice' | 'calendar'
          calendar_event_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      calendars: {
        Row: {
          id: string
          user_id: string
          name: string
          webcal_url: string
          color: string | null
          auto_suggest: boolean
          last_synced_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          webcal_url: string
          color?: string | null
          auto_suggest?: boolean
          last_synced_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          webcal_url?: string
          color?: string | null
          auto_suggest?: boolean
          last_synced_at?: string | null
          created_at?: string
        }
      }
      calendar_events: {
        Row: {
          id: string
          calendar_id: string
          user_id: string
          external_id: string
          title: string
          description: string | null
          started_at: string
          ended_at: string | null
          location: string | null
          raw_ical: string | null
        }
        Insert: {
          id?: string
          calendar_id: string
          user_id: string
          external_id: string
          title: string
          description?: string | null
          started_at: string
          ended_at?: string | null
          location?: string | null
          raw_ical?: string | null
        }
        Update: {
          id?: string
          calendar_id?: string
          user_id?: string
          external_id?: string
          title?: string
          description?: string | null
          started_at?: string
          ended_at?: string | null
          location?: string | null
          raw_ical?: string | null
        }
      }
      user_settings: {
        Row: {
          user_id: string
          ai_provider: 'mistral' | 'routerlab'
          ai_model: string
          ai_api_key_mistral: string | null
          ai_api_key_routerlab: string | null
          routerlab_base_url: string
          timezone: string
          work_day_start: string
          work_day_end: string
        }
        Insert: {
          user_id: string
          ai_provider?: 'mistral' | 'routerlab'
          ai_model?: string
          ai_api_key_mistral?: string | null
          ai_api_key_routerlab?: string | null
          routerlab_base_url?: string
          timezone?: string
          work_day_start?: string
          work_day_end?: string
        }
        Update: {
          user_id?: string
          ai_provider?: 'mistral' | 'routerlab'
          ai_model?: string
          ai_api_key_mistral?: string | null
          ai_api_key_routerlab?: string | null
          routerlab_base_url?: string
          timezone?: string
          work_day_start?: string
          work_day_end?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
