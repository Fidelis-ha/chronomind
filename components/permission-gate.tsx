'use client'

import { useEffect, useState } from 'react'

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
  // Alles erteilt/verfügbar -> Leiste nicht anzeigen
  if (notif === 'granted') return null
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
      navigator.vibrate([0, 120, 80, 120])
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
    <div className="fixed inset-x-2 top-[calc(4rem+env(safe-area-inset-top))] z-40 flex flex-wrap items-center gap-2 rounded-2xl border border-outline-variant bg-surface-container px-3 py-2 text-sm shadow-lg">
      {unsupportedHint ? (
        <span className="min-w-0 flex-1 text-on-surface-variant">
          Dieses Geraet unterstuetzt keine Erinnerungs-Benachrichtigungen
        </span>
      ) : notif === 'denied' ? (
        <span className="min-w-0 flex-1 text-on-surface-variant">
          Benachrichtigungen sind im Browser blockiert - in den Website-Einstellungen erlauben
        </span>
      ) : (
        <span className="min-w-0 flex-1 text-on-surface-variant">
          Benachrichtigungen für Wake-Reminder aktivieren{!vibrate && ' (Vibration auf diesem Gerät nicht verfügbar)'}
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
          Vibration testen
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Hinweis schliessen"
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-on-surface/[0.08] active:bg-on-surface/[0.12]"
      >
        ✕
      </button>
    </div>
  )
}
