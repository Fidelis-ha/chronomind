'use client'

import { useState } from 'react'
import { QuickTap } from '@/components/entries/QuickTap'
import { Timeline } from '@/components/timeline/Timeline'
import { type TimeEntry } from '@/lib/types'
import { saveEntryMergingAdjacent } from '@/lib/entries-store'
import { useCloudSync } from '@/lib/hooks/useCloudSync'
import { CloudQuestionBanner } from '@/components/entries/CloudQuestionBanner'

type Panel = 'none' | 'date' | 'quick'

export default function DashboardClient() {
  const [panel, setPanel] = useState<Panel>('none')
  const cloud = useCloudSync()

  const handleCreate = (entry: TimeEntry) => {
    // Direkt angrenzende Einträge derselben Aktivität automatisch zusammenführen
    saveEntryMergingAdjacent(entry)
  }

  const togglePanel = (p: Panel) => setPanel(cur => (cur === p ? 'none' : p))

  return (
    <div className="flex h-[calc(100dvh-9rem)] md:h-[calc(100dvh-6rem)] min-h-0 flex-col px-2 sm:px-4">
      {cloud.cloudQuestion && (
        <CloudQuestionBanner
          cloudTs={cloud.cloudQuestion.cloudTs}
          onKeepLocal={cloud.cloudQuestion.onKeepLocal}
          onUseCloud={cloud.cloudQuestion.onUseCloud}
          onDismiss={cloud.dismissCloudQuestion}
        />
      )}

      {/* Zeitstrahl als Haupt-Element, füllt die Seite */}
      <Timeline
        collapsibleHeader
        headerOpen={panel === 'date'}
      />

      {/* Schwebende Bedienleiste über der Bottom-Nav */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 md:items-end md:pr-4"
        style={{ paddingBottom: 'calc(5.25rem + env(safe-area-inset-bottom))' }}
      >
        {panel === 'quick' && (
          <div className="pointer-events-auto w-[calc(100%-1.5rem)] max-w-md rounded-2xl bg-surface-container p-3 shadow-lg md:mr-0">
            <QuickTap onCreate={handleCreate} />
          </div>
        )}
        <div className="pointer-events-auto mb-0 flex gap-2 rounded-2xl bg-surface-container/95 p-1.5 shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={() => togglePanel('date')}
            aria-expanded={panel === 'date'}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              panel === 'date'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Datum
          </button>
          <button
            type="button"
            onClick={() => togglePanel('quick')}
            aria-expanded={panel === 'quick'}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              panel === 'quick'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Kategorien
          </button>
        </div>
      </div>
    </div>
  )
}
