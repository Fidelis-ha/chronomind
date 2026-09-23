'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { type TimeEntry } from '@/lib/types'
import { loadEntries, saveEntries, ENTRIES_CHANGED_EVENT } from '@/lib/entries-store'
import { loadActivities, saveActivities, type Activity, ACTIVITIES_CHANGED_EVENT } from '@/lib/activities'
import { isDirty, markDirty, clearDirty, SETTINGS_CHANGED_EVENT } from '@/lib/dirty-state'
import {
  loadCloudConfig,
  pushToCloud,
  pullFromCloud,
  compareWithCloud,
  type CloudConfig,
  type CloudPayload
} from '@/lib/cloud-sync'

export interface CloudSyncState {
  config: CloudConfig | null
  syncing: boolean
  lastResult: 'ok' | 'error' | null
  lastError: string | null
}

export function useCloudSync(): CloudSyncState & {
  pushNow: () => Promise<void>
  scheduleAutoPush: () => void
  checkCloudOnLoad: () => Promise<void>
  applyCloudData: (payload: CloudPayload) => void
  cloudQuestion: { cloudTs: string; onKeepLocal: () => void; onUseCloud: () => void } | null
  dismissCloudQuestion: () => void
  reconnect: () => void
} {
  const [config, setConfig] = useState<CloudConfig | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<'ok' | 'error' | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [cloudQuestion, setCloudQuestion] = useState<{
    cloudTs: string
    onKeepLocal: () => void
    onUseCloud: () => void
  } | null>(null)
  const checkRan = useRef(false)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const configVersion = useRef(0)

  const refreshConfig = useCallback(() => {
    setConfig(loadCloudConfig())
    configVersion.current += 1
  }, [])

  useEffect(() => {
    refreshConfig()
    const handler = () => refreshConfig()
    window.addEventListener('storage', handler)
    window.addEventListener('chronomind:cloud-config-changed', handler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('chronomind:cloud-config-changed', handler)
    }
  }, [refreshConfig])

  const buildPayload = (): Omit<import('@/lib/cloud-sync').CloudPayload, 'timestamp' | 'device'> => {
    const entries = loadEntries()
    let settings: unknown = {}
    try { settings = JSON.parse(localStorage.getItem('chronomind_settings') || '{}') } catch { /* ignore */ }
    return { version: 1, entries, settings, activities: loadActivities() }
  }

  const pushNow = useCallback(async (): Promise<void> => {
    const cfg = loadCloudConfig()
    if (!cfg) return
    setSyncing(true)
    try {
      const result = await pushToCloud(cfg, buildPayload())
      if (result.ok) {
        setLastResult('ok')
        setLastError(null)
        clearDirty() // Speicherung = Cloud-Upload erfolgt
      } else {
        setLastResult('error')
        setLastError(result.error || 'Unbekannter Fehler')
      }
    } catch (err) {
      setLastResult('error')
      setLastError(err instanceof Error ? err.message : String(err))
    } finally {
      setSyncing(false)
    }
  }, [])

  /** Auto-Push nach Änderungen (debounced 2s) */
  const scheduleAutoPush = useCallback(() => {
    const cfg = loadCloudConfig()
    if (!cfg) return
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => {
      pushNow()
    }, 2000)
  }, [pushNow])

  const lastErrorRef = useRef<string | null>(null)
  useEffect(() => { lastErrorRef.current = lastError }, [lastError])

  const applyCloudData = useCallback((payload: CloudPayload) => {
    if (Array.isArray(payload.entries)) {
      const entries = payload.entries as TimeEntry[]
      saveEntries(entries)
    }
    if (payload.settings && typeof payload.settings === 'object') {
      localStorage.setItem('chronomind_settings', JSON.stringify(payload.settings))
    }
    if (Array.isArray(payload.activities)) {
      saveActivities(payload.activities as Activity[])
    }
  }, [])

function newestEntryIso(entries: TimeEntry[]): string | null {
  // Neueste lokale Änderung: created_at ist der Anker
  let newest: string | null = null
  for (const e of entries) {
    if (e.created_at && (!newest || e.created_at > newest)) newest = e.created_at
  }
  return newest
}

/** Beim Laden der Seite: Cloud-Stand prüfen */
  const checkCloudOnLoad = useCallback(async () => {
    const cfg = loadCloudConfig()
    if (!cfg) return
    setSyncing(true)
    try {
      const result = await pullFromCloud(cfg)
      if (!result.ok) {
        setLastResult('error')
        setLastError(result.error || 'Cloud nicht erreichbar')
        return
      }
      setLastResult('ok')
      const cloudTs = result.data?.timestamp || null
      const localNewest = newestEntryIso(loadEntries())
      const comparison = compareWithCloud(localNewest, cloudTs)
      if (comparison === 'cloud-neuer' && result.data) {
        // Cloud ist neuer → Nutzer fragen
        setCloudQuestion({
          cloudTs: cloudTs!,
          onKeepLocal: () => {
            setCloudQuestion(null)
            // Lokal behalten → pushen, um Cloud zu überschreiben
            pushNow()
          },
          onUseCloud: () => {
            setCloudQuestion(null)
            if (result.data) applyCloudData(result.data)
            toast.success('Cloud-Stand übernommen – Seite aktualisiert sich')
            setTimeout(() => window.location.reload(), 800)
          }
        })
      } else if (comparison === 'lokal-neuer') {
        // Lokal neuer (z.B. Änderungen vor dem letzten Schließen) → still hochladen
        pushNow()
      }
    } catch (err) {
      setLastResult('error')
      setLastError(err instanceof Error ? err.message : String(err))
    } finally {
      setSyncing(false)
    }
  }, [applyCloudData, pushNow])

  // Prüfung nur einmal pro Mount
  useEffect(() => {
    if (checkRan.current) return
    checkRan.current = true
    checkCloudOnLoad()
  }, [checkCloudOnLoad])

  // Globale Änderungen: Dirty markieren + Auto-Push (einmal pro Hook, wirkt app-weit über Events)
  useEffect(() => {
    const onChange = () => {
      if (loadCloudConfig()) {
        markDirty()
        scheduleAutoPush()
      }
    }
    window.addEventListener(ENTRIES_CHANGED_EVENT, onChange)
    window.addEventListener(ACTIVITIES_CHANGED_EVENT, onChange)
    window.addEventListener(SETTINGS_CHANGED_EVENT, onChange)
    return () => {
      window.removeEventListener(ENTRIES_CHANGED_EVENT, onChange)
      window.removeEventListener(ACTIVITIES_CHANGED_EVENT, onChange)
      window.removeEventListener(SETTINGS_CHANGED_EVENT, onChange)
    }
  }, [scheduleAutoPush])

  // Warnung beim Schließen, wenn ungespeicherte Änderungen (kein Cloud-Upload seit letzter Änderung)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty() && loadCloudConfig()) {
        e.preventDefault()
        e.returnValue = '' // Chrome/Edge verlangen returnValue
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const dismissCloudQuestion = useCallback(() => setCloudQuestion(null), [])

  return {
    config,
    syncing,
    lastResult,
    lastError,
    pushNow,
    scheduleAutoPush,
    checkCloudOnLoad,
    applyCloudData,
    cloudQuestion,
    dismissCloudQuestion,
    reconnect: refreshConfig
  }
}
