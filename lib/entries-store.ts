'use client'

// Zentraler Einträge-Speicher (localStorage) – einzige Quelle für load/save
import { type TimeEntry } from '@/lib/types'
import { ACTIVITIES_CHANGED_EVENT } from '@/lib/activities'

export const ENTRIES_STORAGE_KEY = 'chronomind_entries'
export const ENTRIES_CHANGED_EVENT = 'chronomind:entries-changed'

export function loadEntries(): TimeEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ENTRIES_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveEntries(entries: TimeEntry[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries))
  window.dispatchEvent(new CustomEvent(ENTRIES_CHANGED_EVENT))
}

// Aktivitäten-Event weiterexportieren für Komfort
export { ACTIVITIES_CHANGED_EVENT }
