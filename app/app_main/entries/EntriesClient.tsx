'use client'

import { useState } from 'react'
import { TimeEntryCard } from '@/components/entries/TimeEntryCard'
import { type TimeEntry } from '@/lib/types'

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

export function EntriesClient() {
  const [allEntries, setAllEntries] = useState<TimeEntry[]>(loadEntries)
  const [date, setDate] = useState('')

  const filteredEntries = date
    ? allEntries
        .filter(entry => {
          const entryDate = new Date(entry.started_at).toISOString().split('T')[0]
          return entryDate === date
        })
        .sort(
          (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        )
    : [...allEntries].sort(
        (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      )

  const handleDelete = (id: string) => {
    if (!confirm('Eintrag wirklich loeschen?')) return
    const updated = allEntries.filter(e => e.id !== id)
    setAllEntries(updated)
    saveEntries(updated)
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-4">
      <div className="mb-4 flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          placeholder="Alle"
          aria-label="Nach Datum filtern"
          className="min-h-[40px] rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-1.5 text-sm text-on-surface transition-colors duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {date && (
          <button
            type="button"
            onClick={() => setDate('')}
            title="Filter zurücksetzen"
            aria-label="Filter zurücksetzen"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            ✕
          </button>
        )}
      </div>
      {filteredEntries.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          {date ? 'Keine Eintraege fuer dieses Datum' : 'Noch keine Eintraege'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map(entry => (
            <TimeEntryCard key={entry.id} entry={entry} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
