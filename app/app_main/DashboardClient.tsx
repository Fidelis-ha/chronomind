'use client'

import { useState, useEffect } from 'react'
import { EntryForm } from '@/components/entries/EntryForm'
import { TimeEntryCard } from '@/components/entries/TimeEntryCard'
import { type TimeEntry } from '@/lib/types'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { nanoid } from '@/lib/utils'

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

const STORAGE_KEY = 'chronomind_entries'

function loadEntries(): TimeEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveEntries(entries: TimeEntry[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export default function DashboardClient() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    setEntries(loadEntries())
    setLoading(false)
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
    setShowForm(false)
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Heute</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/app_main/entries">Alle Einträge</Link>
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Abbrechen' : '+ Eintrag'}
          </Button>
        </div>
      </div>

      {showForm && (
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