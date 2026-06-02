'use client'

import { useState, useEffect, useCallback } from 'react'
import { EntryForm } from '@/components/entries/EntryForm'
import { TimeEntryCard } from '@/components/entries/TimeEntryCard'
import { type TimeEntry } from '@/lib/types'
import { Button } from '@/components/ui/button'

function formatTotalDuration(entries: TimeEntry[]): string {
  const totalSeconds = entries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
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

function entriesToCSV(entries: TimeEntry[]): string {
  const headers = [
    'id',
    'title',
    'description',
    'category',
    'tags',
    'started_at',
    'ended_at',
    'duration_seconds',
    'source',
    'created_at'
  ]

  const rows = entries.map(entry => [
    entry.id,
    `"${(entry.title || '').replace(/"/g, '""')}"`,
    `"${(entry.description || '').replace(/"/g, '""')}"`,
    `"${(entry.category || '').replace(/"/g, '""')}"`,
    `"${(entry.tags || []).join(', ')}"`,
    entry.started_at,
    entry.ended_at || '',
    entry.duration_seconds?.toString() || '',
    entry.source,
    entry.created_at
  ])

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function entriesToJSON(entries: TimeEntry[]): string {
  return JSON.stringify(entries, null, 2)
}

function downloadJSON(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function EntriesPageClient() {
  const [allEntries] = useState<TimeEntry[]>(loadEntries)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [showForm, setShowForm] = useState(false)

  const filteredEntries = allEntries.filter(entry => {
    const entryDate = new Date(entry.started_at).toISOString().split('T')[0]
    return entryDate === date
  })

  const handleDelete = (id: string) => {
    if (!confirm('Eintrag wirklich loeschen?')) return
    const updated = allEntries.filter(e => e.id !== id)
    saveEntries(updated)
    window.location.reload()
  }

  const handleCreate = (entry: TimeEntry) => {
    const updated = [entry, ...loadEntries()]
    saveEntries(updated)
    setShowForm(false)
    window.location.reload()
  }

  const handleExportCSV = useCallback(() => {
    const csv = entriesToCSV(allEntries)
    const dateStr = new Date().toISOString().split('T')[0]
    downloadCSV(csv, `chronomind-entries-${dateStr}.csv`)
  }, [allEntries])

  const handleExportFilteredCSV = useCallback(() => {
    const csv = entriesToCSV(filteredEntries)
    downloadCSV(csv, `chronomind-entries-${date}.csv`)
  }, [filteredEntries, date])

  const handleExportJSON = useCallback(() => {
    const json = entriesToJSON(allEntries)
    const dateStr = new Date().toISOString().split('T')[0]
    downloadJSON(json, `chronomind-entries-${dateStr}.json`)
  }, [allEntries])

  const handleExportFilteredJSON = useCallback(() => {
    const json = entriesToJSON(filteredEntries)
    downloadJSON(json, `chronomind-entries-${date}.json`)
  }, [filteredEntries, date])

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Zeiteintraege</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExportCSV} title="Alle Eintraege exportieren">
            CSV (Alle)
          </Button>
          <Button variant="outline" onClick={handleExportFilteredCSV} title="Gefilterte Eintraege exportieren">
            CSV (Gefiltert)
          </Button>
          <Button variant="outline" onClick={handleExportJSON} title="Alle Eintraege als JSON exportieren">
            JSON (Alle)
          </Button>
          <Button variant="outline" onClick={handleExportFilteredJSON} title="Gefilterte Eintraege als JSON exportieren">
            JSON (Gefiltert)
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Abbrechen' : '+ Neuer Eintrag'}
          </Button>
        </div>
      </div>
      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-card">
          <EntryForm onCreate={handleCreate} />
        </div>
      )}
      <div className="flex items-center gap-4 mb-6">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border rounded px-3 py-1"
        />
        <span className="text-muted-foreground">
          Gesamt: {formatTotalDuration(filteredEntries)}
        </span>
      </div>
      {filteredEntries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Keine Eintraege fuer dieses Datum
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