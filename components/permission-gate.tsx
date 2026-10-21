'use client'

import { useEffect, useState } from 'react'
import { loadVibrationPattern, vibratePattern } from '@/lib/vibration'

const DISMISS_KEY = 'chronomind-permission-hint-dismissed'

type NotifPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export function PermissionGate() {
  const [notif, setNotif] = useState<NotifPermission>('granted')
  const [vibrate, setVibrate] = useState(true)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if ('Notification' in window) {
      setNotif(Notification.permission)
    } else {
      setNotif('unsupported')
    }
    setVibrate(typeof navigator !== 'undefined' && 'vibrate' in navigator)
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  if (dismissed) return null
  // 'unsupported' + Vibration vorhanden -> nichts anzeigen
  if (notif === 'unsupported' && vibrate) return null
  // 'granted' + Vibration verfuegbar -> nichts anzeigen; ohne Vibration: Hinweis
  if (notif === 'granted' && vibrate) return null
  // 'unsupported' ohne Vibration: kurzer Hinweis
  const unsupportedHint = notif === 'unsupported'

  const requestNotifications = async () => {
    if (!('Notification' in window)) return
    try {
      const result = await Notification.requestPermission()
      setNotif(result)
    } catch {
      /* ignorieren */
    }
  }

  const testVibration = () => {
    try {
      vibratePattern(loadVibrationPattern())
    } catch {
      /* ignorieren */
    }
  }

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignorieren */
    }
    setDismissed(true)
  }

  return (
    <div role="status" className="fixed inset-x-2 top-[calc(0.5rem+env(safe-area-inset-top))] z-40 flex flex-wrap items-center gap-1.5 rounded-2xl border border-outline-variant bg-surface-container px-2.5 py-1.5 text-[13px] shadow-lg md:top-[calc(4rem+env(safe-area-inset-top))]">
      {unsupportedHint ? (
        <span className="min-w-0 flex-1 text-on-surface-variant">
          Keine Erinnerungen auf diesem Geraet
        </span>
      ) : notif === 'denied' ? (
        <span className="min-w-0 flex-1 text-on-surface-variant">
          Benachrichtigungen blockiert - im Browser erlauben
        </span>
      ) : notif === 'granted' ? (
        <span className="min-w-0 flex-1 text-on-surface-variant">
          Keine Vibration auf diesem Gerät
        </span>
      ) : (
        <span className="min-w-0 flex-1 text-on-surface-variant">
          Erinnerungen erlauben{!vibrate && ' (Keine Vibration auf diesem Gerät)'}
        </span>
      )}
      {!unsupportedHint && notif === 'default' && (
        <button
          onClick={requestNotifications}
          className="min-h-[40px] rounded-full bg-primary px-4 text-sm font-medium text-on-primary transition-colors duration-200 hover:opacity-90 active:opacity-80"
        >
          Erlauben
        </button>
      )}
      {vibrate && (
        <button
          onClick={testVibration}
          className="min-h-[40px] rounded-full border border-outline-variant px-4 text-sm font-medium text-on-surface transition-colors duration-200 hover:bg-on-surface/[0.08] active:bg-on-surface/[0.12]"
        >
          Test
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Hinweis schliessen"
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-on-surface/[0.08] active:bg-on-surface/[0.12]"
      >
        ✕
      </button>
    </div>
  )
}
