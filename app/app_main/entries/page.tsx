'use client'

import { useState, useEffect, useCallback } from 'react'
import { EntryForm } from '@/components/entries/EntryForm'
import { TimeEntryCard } from '@/components/entries/TimeEntryCard'
import { type TimeEntry } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function formatTotalDuration(entries: TimeEntry[]): string {
  const totalSeconds = entries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export default function EntriesPage() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [showForm, setShowForm] = useState(false)

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      return data.user ?? null
    } catch {
      return null
    }
  }, [])

  const loadEntries = useCallback(async (uid: string, d: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/entries?date=${d}`)
      if (!res.ok) return
      const data = await res.json()
      setEntries(data.entries || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const u = await loadSession()
      setUser(u)
      if (u) {
        await loadEntries(u.id, date)
      } else {
        setLoading(false)
      }
    }
    init()
  }, [loadSession])

  useEffect(() => {
    if (user) {
      loadEntries(user.id, date)
    }
  }, [date, user, loadEntries])

  const handleDelete = async (id: string) => {
    if (!confirm('Eintrag wirklich löschen?')) return

    const res = await fetch(`/api/entries?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setEntries(prev => prev.filter(e => e.id !== id))
    }
  }

  const handleSuccess = () => {
    if (user) loadEntries(user.id, date)
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Zeiteinträge</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Abbrechen' : '+ Neuer Eintrag'}
        </Button>
      </div>

      {showForm && user && (
        <div className="mb-6 p-4 border rounded-lg bg-card">
          <EntryForm userId={user.id} onSuccess={handleSuccess} />
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
