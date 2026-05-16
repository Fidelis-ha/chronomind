'use client'

import { useState, useEffect } from 'react'
import { EntryForm } from '@/components/entries/EntryForm'
import { TimeEntryCard } from '@/components/entries/TimeEntryCard'
import { type TimeEntry } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function formatTotalDuration(entries: TimeEntry[]): string {
  const totalSeconds = entries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function EntriesClient() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadEntries()
  }, [date])

  const loadEntries = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/entries?date=${date}`)
      const data = await res.json()
      if (res.ok) setEntries(data.entries || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eintrag wirklich löschen?')) return
    const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
    if (res.ok) setEntries(prev => prev.filter(e => e.id !== id))
  }

  const handleSuccess = () => {
    setShowForm(false)
    loadEntries()
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Zeiteinträge</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Abbrechen' : '+ Neuer Eintrag'}
        </Button>
      </div>
      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-card">
          <EntryForm userId="dummy" onSuccess={handleSuccess} />
        </div>
      )}
      <div className="flex items-center gap-4 mb-6">
        <Input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-auto"
        />
        <span className="text-muted-foreground">
          Gesamt: {formatTotalDuration(entries)}
        </span>
      </div>
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Wird geladen...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Keine Einträge für dieses Datum
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <TimeEntryCard key={entry.id} entry={entry} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}