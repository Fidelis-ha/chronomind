'use client'

import { useState, useEffect } from 'react'
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

export default function DashboardClient({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadEntries()
  }, [userId])

  const loadEntries = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/entries')
      const data = await res.json()
      if (res.ok) {
        setEntries(data.entries || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eintrag wirklich löschen?')) return

    const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setEntries(prev => prev.filter(e => e.id !== id))
    }
  }

  const handleSuccess = () => {
    setShowForm(false)
    loadEntries()
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Heute</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/entries">Alle Einträge</Link>
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Abbrechen' : '+ Eintrag'}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-card">
          <EntryForm userId={userId} onSuccess={handleSuccess} />
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
