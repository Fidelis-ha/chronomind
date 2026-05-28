'use client'

import { useState } from 'react'
import { EntryForm } from '@/components/entries/EntryForm'
import { TimeEntryCard } from '@/components/entries/TimeEntryCard'
import { type TimeEntry } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { nanoid } from '@/lib/utils'

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

export function EntriesClient() {
  const [allEntries] = useState<TimeEntry[]>(loadEntries)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [showForm, setShowForm] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const filteredEntries = allEntries.filter(entry => {
    const entryDate = new Date(entry.started_at).toISOString().split('T')[0]
    return entryDate === date
  })

  const handleDelete = (id: string) => {
    if (!confirm('Eintrag wirklich löschen?')) return
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

  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/entries/export?format=csv')
      if (!response.ok) throw new Error('Export failed')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chronomind-export-${date}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export error:', err)
      alert('Export fehlgeschlagen')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Zeiteinträge</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={isExporting}>
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exportiere...' : 'CSV Export'}
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
          Keine Einträge für dieses Datum
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