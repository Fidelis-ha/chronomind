'use client'

// Gemeinsame Payload-Erstellung für Cloud-Sync (Watcher + Hook).
// WICHTIG: Secret-Felder werden vor dem Upload aus den Settings entfernt.

import { loadEntries } from '@/lib/entries-store'
import { loadActivities } from '@/lib/activities'
import { type CloudPayload } from '@/lib/cloud-sync'

export const SETTINGS_STORAGE_KEY = 'chronomind_settings'
export const RUNNING_ENTRY_KEY = 'chronomind-running-entry'

export function isTimerRunning(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(RUNNING_ENTRY_KEY) !== null
}

function stripSecrets(settings: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(settings)) {
    const lower = key.toLowerCase()
    if (lower.includes('key') || lower.includes('secret') || lower.includes('password') || lower.includes('token')) {
      continue
    }
    result[key] = settings[key]
  }
  return result
}

export function buildPayload(): Omit<CloudPayload, 'timestamp' | 'device'> {
  let settings: unknown = {}
  try {
    settings = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}')
  } catch { /* ignore */ }
  if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
    settings = stripSecrets(settings as Record<string, unknown>)
  } else {
    settings = {}
  }
  return { version: 1, entries: loadEntries(), settings, activities: loadActivities() }
}

let changeCounter = 0

export function getChangeCounter(): number {
  return changeCounter
}

export function bumpChangeCounter(): void {
  changeCounter += 1
}
