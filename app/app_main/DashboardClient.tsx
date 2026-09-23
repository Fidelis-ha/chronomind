'use client'

import { useState, useEffect } from 'react'
import { QuickTap } from '@/components/entries/QuickTap'
import { QuickEntry } from '@/components/entries/QuickEntry'
import { EntryForm } from '@/components/entries/EntryForm'
import { TimeEntryCard } from '@/components/entries/TimeEntryCard'
import { type TimeEntry } from '@/lib/types'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function formatTotalDuration(entries: TimeEntry[]): string {
  const totalSeconds = entries.reduce(
    (sum, e) => sum + (e.duration_seconds || 0),
    0
  )
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

import { loadEntries, saveEntries } from '@/lib/entries-store'
import { isDirty, DIRTY_CHANGED_EVENT } from '@/lib/dirty-state'
import { useCloudSync } from '@/lib/hooks/useCloudSync'
import { isTimerRunning } from '@/lib/cloud-sync-payload'
import { CloudQuestionBanner } from '@/components/entries/CloudQuestionBanner'

export default function DashboardClient() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const cloud = useCloudSync()

  useEffect(() => {
    setEntries(loadEntries())
    setDirty(isDirty())
    setTimerRunning(isTimerRunning())
    setLoading(false)
    const onDirtyChanged = () => {
      setDirty(isDirty())
      setTimerRunning(isTimerRunning())
    }
    window.addEventListener(DIRTY_CHANGED_EVENT, onDirtyChanged)
    return () => window.removeEventListener(DIRTY_CHANGED_EVENT, onDirtyChanged)
  }, [])

  const handleDelete = (id: string) => {
    if (!confirm('Eintrag wirklich löschen?')) return
    const updated = entries.filter(e => e.id !== id)
    setEntries(updated)
    saveEntries(updated)
  }

  const handleCreate = (entry: TimeEntry) => {
    const updated = [entry, ...entries]
    setEntries(updated)
    saveEntries(updated)
    setShowDetails(false)
  }

  const recentTitles = Array.from(
    new Set(entries.slice(0, 30).map(e => e.title))
  ).filter(Boolean)

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      {cloud.cloudQuestion && (
        <CloudQuestionBanner
          cloudTs={cloud.cloudQuestion.cloudTs}
          onKeepLocal={cloud.cloudQuestion.onKeepLocal}
          onUseCloud={cloud.cloudQuestion.onUseCloud}
          onDismiss={cloud.dismissCloudQuestion}
        />
      )}
      {cloud.lastResult === 'error' && cloud.lastError && (
        <div className="mb-6 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-sm">
          ⚠️ Cloud-Sync-Fehler: {cloud.lastError}
          <button onClick={() => cloud.pushNow()} className="ml-2 underline underline-offset-2">
            Erneut versuchen
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Heute</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {cloud.syncing && <span className="text-xs text-muted-foreground animate-pulse">☁️ synchronisiere…</span>}
          {cloud.config && !cloud.syncing && cloud.lastResult === 'ok' && (
            <span className="text-xs text-muted-foreground" title="Cloud-Sync aktiv">☁️ synchron</span>
          )}
          {dirty && timerRunning && (
            <span
              role="status"
              aria-live="polite"
              className="text-xs text-muted-foreground"
              title="Der laufende Timer wird beim Beenden als Eintrag gesichert und in die Cloud hochgeladen."
            >
              ⏱️ Timer läuft – wird beim Beenden gesichert
            </span>
          )}
          {dirty && !timerRunning && (
            <span
              role="status"
              aria-live="polite"
              className="text-xs text-amber-600 dark:text-amber-400"
              title="Änderungen sind lokal gespeichert, aber noch nicht in die Cloud hochgeladen."
            >
              ⚠️ Noch nicht in der Cloud gesichert
            </span>
          )}
          <Button variant="outline" asChild>
            <Link href="/app_main/entries">Alle Einträge</Link>
          </Button>
          <Button variant="outline" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Details ausblenden' : 'Detailliert…'}
          </Button>
        </div>
      </div>

      <QuickTap onCreate={handleCreate} recentTitles={recentTitles} />

      <QuickEntry onCreate={handleCreate} recentTitles={recentTitles} />

      {showDetails && (
        <div className="mb-6 p-4 border rounded-lg bg-card">
          <EntryForm onCreate={handleCreate} />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <span className="text-muted-foreground">
          {entries.length} Einträge · {formatTotalDuration(entries)}
        </span>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Wird geladen...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Noch keine Einträge heute
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <TimeEntryCard
              key={entry.id}
              entry={entry}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}