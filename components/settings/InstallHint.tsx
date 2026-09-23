'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

export function InstallHint() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (installEvent) {
    return (
      <Button
        onClick={() => {
          const e = installEvent as unknown as { prompt?: unknown; userChoice?: Promise<{ outcome: string }> }
          if (typeof e.prompt !== 'function') return
          e.prompt()
          e.userChoice?.then((choice) => {
            if (choice.outcome === 'accepted') {
              setInstallEvent(null)
            }
            // bei 'dismissed' Event behalten -> Button bleibt klickbar
          }).catch(() => { /* ignorieren */ })
        }}
      >
        App installieren
      </Button>
    )
  }

  return (
    <div className="text-sm text-muted-foreground space-y-2">
      <p>
        Chrome/Edge (Desktop &amp; Android): Install-Symbol in der Adressleiste bzw. Menü &gt; Zum
        Startbildschirm. Firefox (Desktop) unterstützt die Installation von Web-Apps derzeit nicht –
        die App läuft dort im Browser-Tab mit allen Funktionen.
      </p>
      <p>iPhone/iPad (Safari): Teilen-Symbol &gt; Zum Home-Bildschirm.</p>
      <p>Die App aktualisiert sich automatisch, sobald eine neue Version verfügbar ist.</p>
    </div>
  )
}
