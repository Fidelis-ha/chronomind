'use client'

// Gemeinsame Payload-Erstellung für Cloud-Sync (Watcher + Hook).
// WICHTIG: Secret-Felder werden vor dem Upload mit dem Device-Key verschluesselt
// (encryptSecret / 'enc:v1:'). Der Device-Key verlaesst das Geraet nie, daher sind
// die Werte in der Cloud ohne dieses Geraet nicht lesbar – anders als bei den
// passphrasenbasierten Exporten (encryptForBackup) ist hier keine Nutzereingabe
// moeglich, weil Auto-Push unbeaufsichtigt laeuft.

import { loadEntries } from '@/lib/entries-store'
import { loadPlans } from '@/lib/plans'
import { loadCategories } from '@/lib/categories'
import { type CloudPayload } from '@/lib/cloud-sync'
import { encryptSecretFields } from '@/lib/secrets-crypto'

export const SETTINGS_STORAGE_KEY = 'chronomind_settings'
export const RUNNING_ENTRY_KEY = 'chronomind-running-entry'
/** Event: laufender Timer wurde irgendwo gestartet/gestoppt (gleicher Tab) */
export const RUNNING_CHANGED_EVENT = 'chronomind:running-changed'

export function isTimerRunning(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(RUNNING_ENTRY_KEY) !== null
}

export async function buildPayload(): Promise<Omit<CloudPayload, 'timestamp' | 'device'>> {
  let settings: unknown = {}
  try {
    settings = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}')
  } catch { /* ignore */ }
  if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
    // Secret-Felder (ai_api_key_*, aws_secret_access_key, ...) verschluesselt senden
    settings = await encryptSecretFields(settings as Record<string, unknown>)
  } else {
    settings = {}
  }
  // Version 3: Pläne unter 'plans' (v2: Kategorien, v1: activities).
  return { version: 3, entries: loadEntries(), plans: loadPlans(), settings, categories: loadCategories() }
}

let changeCounter = 0

export function getChangeCounter(): number {
  return changeCounter
}

export function bumpChangeCounter(): void {
  changeCounter += 1
}
