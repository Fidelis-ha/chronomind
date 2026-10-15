'use client'

// Zentraler Einträge-Speicher (localStorage) – einzige Quelle für load/save
import { type TimeEntry } from '@/lib/types'

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

/**
 * Eintrag anlegen und DIREKT angrenzende Einträge derselben Aktivität
 * (gleicher Titel + Kategorie) automatisch in einem zusammenfassen.
 * Toleranz: <= 1 Minute Lücke gilt als "direkt nebeneinander".
 * Gibt den überlebenden (ggf. erweiterten) Eintrag zurück.
 */
export function saveEntryMergingAdjacent(entry: TimeEntry, toleranceMs = 60_000): TimeEntry {
  const all = loadEntries()
  const s = entry.started_at ? Date.parse(entry.started_at) : NaN
  const e = entry.ended_at ? Date.parse(entry.ended_at) : NaN
  if (Number.isNaN(s) || Number.isNaN(e)) {
    saveEntries([entry, ...all])
    return entry
  }
  const adjacent = all.filter(x => {
    if (x.title !== entry.title) return false
    if ((x.category ?? null) !== (entry.category ?? null)) return false
    const xs = x.started_at ? Date.parse(x.started_at) : NaN
    const xe = x.ended_at ? Date.parse(x.ended_at) : NaN
    if (Number.isNaN(xs) || Number.isNaN(xe)) return false
    return Math.abs(xe - s) <= toleranceMs || Math.abs(e - xs) <= toleranceMs
  })
  if (!adjacent.length) {
    saveEntries([entry, ...all])
    return entry
  }
  const start = Math.min(s, ...adjacent.map(x => Date.parse(x.started_at as string)))
  const end = Math.max(e, ...adjacent.map(x => Date.parse(x.ended_at as string)))
  // Der früheste angrenzende Eintrag "gewinnt" (id/created_at bleiben stabil)
  const keep = adjacent.reduce((a, b) =>
    Date.parse(a.started_at as string) <= Date.parse(b.started_at as string) ? a : b
  )
  const merged: TimeEntry = {
    ...keep,
    started_at: new Date(start).toISOString(),
    ended_at: new Date(end).toISOString(),
    duration_seconds: Math.round((end - start) / 1000)
  }
  // Alle angrenzenden Einträge entfernen (keep lebt als `merged` weiter)
  const adjacentIds = new Set(adjacent.map(x => x.id))
  saveEntries([merged, ...all.filter(x => !adjacentIds.has(x.id))])
  return merged
}
