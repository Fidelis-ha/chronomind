import { type TimeEntry, type UserSettings } from '@/lib/types'
import { nanoid } from '@/lib/utils'

// In-memory store (resets on Vercel cold start — demo only)
// For production, replace with a proper database (e.g., Turso, PlanetScale)
const store: {
  timeEntries: TimeEntry[]
  userSettings: Record<string, UserSettings>
} = {
  timeEntries: [],
  userSettings: {}
}

// ── Time Entries ─────────────────────────────────────────────────────────────

export function getTimeEntries(userId: string, date?: string): TimeEntry[] {
  let entries = store.timeEntries.filter(e => e.user_id === userId)

  if (date) {
    const target = new Date(date)
    target.setHours(0, 0, 0, 0)
    const next = new Date(target)
    next.setDate(next.getDate() + 1)

    entries = entries.filter(e => {
      const d = new Date(e.started_at)
      return d >= target && d < next
    })
  }

  return entries.sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  )
}

export function createTimeEntry(
  userId: string,
  data: Omit<TimeEntry, 'id' | 'user_id' | 'created_at' | 'duration_seconds'>
): TimeEntry {
  const entry: TimeEntry = {
    ...data,
    id: nanoid(),
    user_id: userId,
    duration_seconds: data.ended_at
      ? Math.round((new Date(data.ended_at).getTime() - new Date(data.started_at).getTime()) / 1000)
      : null,
    created_at: new Date().toISOString()
  }
  store.timeEntries.push(entry)
  return entry
}

export function updateTimeEntry(
  userId: string,
  id: string,
  data: Partial<Pick<TimeEntry, 'title' | 'category' | 'description' | 'started_at' | 'ended_at'>>
): TimeEntry | null {
  const idx = store.timeEntries.findIndex(e => e.id === id && e.user_id === userId)
  if (idx === -1) return null

  const updated = { ...store.timeEntries[idx], ...data }
  if (updated.ended_at && updated.started_at) {
    updated.duration_seconds = Math.round(
      (new Date(updated.ended_at).getTime() - new Date(updated.started_at).getTime()) / 1000
    )
  }
  store.timeEntries[idx] = updated
  return updated
}

export function deleteTimeEntry(userId: string, id: string): boolean {
  const idx = store.timeEntries.findIndex(e => e.id === id && e.user_id === userId)
  if (idx === -1) return false
  store.timeEntries.splice(idx, 1)
  return true
}

// ── User Settings ─────────────────────────────────────────────────────────────

export function getUserSettings(userId: string): UserSettings | null {
  return store.userSettings[userId] ?? null
}

export function upsertUserSettings(
  userId: string,
  data: Partial<Omit<UserSettings, 'user_id'>>
): UserSettings {
  const existing = store.userSettings[userId] ?? {
    user_id: userId,
    ai_provider: 'mistral',
    ai_model: 'mistral-large-latest',
    ai_api_key_mistral: null,
    ai_api_key_routerlab: null,
    routerlab_base_url: 'https://routerlab.ch/v1',
    timezone: 'Europe/Berlin',
    work_day_start: '08:00',
    work_day_end: '18:00'
  }

  const updated = { ...existing, ...data }
  store.userSettings[userId] = updated
  return updated
}
