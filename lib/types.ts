import { type UIMessage } from 'ai'

export interface Chat extends Record<string, unknown> {
  id: string
  title: string
  createdAt: Date
  userId: string
  path: string
  messages: UIMessage[]
  sharePath?: string // Refactor to use RLS
}

export type ServerActionResult<Result> = Promise<
  | Result
  | {
      error: string
    }
>

// Time Tracking Types
export interface TimeEntry {
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
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface Calendar {
  id: string
  user_id: string
  name: string
  webcal_url: string
  color: string | null
  auto_suggest: boolean
  last_synced_at: string | null
  created_at: string
}

export interface CalendarEvent {
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

export interface UserSettings {
  user_id: string
  ai_provider: 'mistral' | 'routerlab' | null
  ai_model: string | null
  ai_api_key_mistral: string | null
  ai_api_key_routerlab: string | null
  routerlab_base_url: string | null
  timezone: string | null
  work_day_start: string | null
  work_day_end: string | null
  backup_provider: string | null
  backup_config: BackupConfig | null
}

export interface BackupConfig {
  s3_bucket?: string
  s3_region?: string
  aws_access_key_id?: string
  aws_secret_access_key?: string
  webdav_url?: string
}
