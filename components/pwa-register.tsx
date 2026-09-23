'use client'

import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { initCloudSyncWatcher } from '@/lib/cloud-sync-watcher'

/**
 * Registriert den Service Worker (PWA) und übernimmt Updates automatisch:
 * Neuer Worker installiert → SKIPWAITING → controllerchange → Reload.
 * Der Reload ist sicher, weil alle Daten laufend in localStorage/Cloud gesichert werden.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Dirty-State/Auto-Push global aktivieren (auf jeder Seite)
    initCloudSyncWatcher()

    if (!('serviceWorker' in navigator)) return

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Nach Updates suchen (auch bei jedem Load; Browser entscheidet über Byte-Vergleich)
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing
          if (!nw) return
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              // Update verfügbar → automatisch übernehmen
              toast('🔄 Update wird installiert…', { id: 'sw-update', duration: 3000 })
              nw.postMessage({ type: 'SKIPWAITING' })
            }
          })
        })
      })
      .catch(() => {
        /* SW nicht kritisch – App läuft auch ohne */
      })
  }, [])

  return null
}
