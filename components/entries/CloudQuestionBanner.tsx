'use client'

import { Button } from '@/components/ui/button'

interface CloudQuestionBannerProps {
  cloudTs: string
  onKeepLocal: () => void
  onUseCloud: () => void
  onDismiss?: () => void
}

/**
 * Banner, der beim Laden der Seite erscheint, wenn die Cloud einen neueren
 * Stand enthält als lokal. Nutzer entscheidet: Cloud übernehmen oder lokal behalten.
 */
export function CloudQuestionBanner({ cloudTs, onKeepLocal, onUseCloud, onDismiss }: CloudQuestionBannerProps) {
  const ts = new Date(cloudTs)
  const label = ts.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="mb-6 p-4 rounded-xl border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <div className="font-semibold text-sm mb-1">
        ☁️ In der Cloud gibt es einen neueren Stand ({label})
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Sollen die Daten aus der Cloud geladen werden? Deine lokalen Änderungen würden dabei ersetzt.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onUseCloud}>
          Cloud-Stand übernehmen
        </Button>
        <Button size="sm" variant="outline" onClick={onKeepLocal}>
          Lokale Daten behalten (in Cloud hochladen)
        </Button>
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Später
          </Button>
        )}
      </div>
    </div>
  )
}
