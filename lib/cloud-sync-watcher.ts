'use client'

// App-weiter Watcher (kein React): markiert Änderungen als dirty und
// stößt bei konfiguriertem Cloud-Speicher automatisch einen Upload an.
// Wird einmalig über components/pwa-register.tsx initialisiert und läuft
// dadurch auf jeder Seite.

import { markDirty, clearDirty, isDirty, SETTINGS_CHANGED_EVENT } from '@/lib/dirty-state'
import { ENTRIES_CHANGED_EVENT } from '@/lib/entries-store'
import { CATEGORIES_CHANGED_EVENT } from '@/lib/categories'
import { loadCloudConfig, pushToCloud } from '@/lib/cloud-sync'
import { buildPayload, getChangeCounter, bumpChangeCounter, isTimerRunning } from '@/lib/cloud-sync-payload'

const AUTO_PUSH_DELAY_MS = 2000

let pushTimer: ReturnType<typeof setTimeout> | null = null
let retryScheduled = false

function scheduleAutoPush() {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(async () => {
    pushTimer = null
    try {
      const cfg = loadCloudConfig()
      if (!cfg) return
      const capturedCounter = getChangeCounter()
      const result = await pushToCloud(cfg, buildPayload())
      if (result.ok) {
        retryScheduled = false
        // Nur clearDirty, wenn sich seit Push-Start nichts geändert hat
        // und kein laufender Timer existiert (er wird noch laufend geändert)
        if (getChangeCounter() === capturedCounter && !isTimerRunning()) clearDirty()
      } else {
        console.warn('Auto-Push fehlgeschlagen:', result.error || 'Unbekannter Fehler')
        retryOnce()
      }
    } catch (err) {
      console.warn('Auto-Push fehlgeschlagen:', err)
      retryOnce()
    }
  }, AUTO_PUSH_DELAY_MS)
}

function retryOnce() {
  if (retryScheduled) return
  retryScheduled = true
  setTimeout(scheduleAutoPush, 30000)
}

export function initCloudSyncWatcher(): void {
  if (typeof window === 'undefined') return
  if ((window as unknown as { __chronoSyncWatcherInit?: boolean }).__chronoSyncWatcherInit) return
  ;(window as unknown as { __chronoSyncWatcherInit?: boolean }).__chronoSyncWatcherInit = true

  const onChange = () => {
    // Immer dirty markieren – auch ohne Cloud-Konfiguration
    bumpChangeCounter()
    retryScheduled = false
    markDirty()
    scheduleAutoPush()
  }
  window.addEventListener(ENTRIES_CHANGED_EVENT, onChange)
  window.addEventListener(CATEGORIES_CHANGED_EVENT, onChange)
  window.addEventListener(SETTINGS_CHANGED_EVENT, onChange)

  // Warnung beim Schließen nur bei ungespeicherten Änderungen UND
  // konfiguriertem Cloud-Speicher (reine Lokal-Nutzer nicht nerven)
  window.addEventListener('beforeunload', (e: BeforeUnloadEvent) => {
    if (isDirty() && loadCloudConfig()) {
      e.preventDefault()
      e.returnValue = '' // Chrome/Edge verlangen returnValue
    }
  })
}
