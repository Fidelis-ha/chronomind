'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
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
  const [userId, setUserId] = useState<string | null>(null)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [showForm, setShowForm] = useState(false)

  const supabase = createClientComponentClient()

  useEffect(() => {
    const getSession = async () => {
      const cookieStore = cookies()
      const session = await auth({ cookieStore })
      if (session?.user) {
        setUserId(session.user.id)
        loadEntries(session.user.id)
      }
    }
    getSession()
  }, [])

  const loadEntries = async (uid: string) => {
    setLoading(true)
    try {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', uid)
        .gte('started_at', startOfDay.toISOString())
        .lte('started_at', endOfDay.toISOString())
        .order('started_at', { ascending: false })

      if (error) throw error
      setEntries(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      loadEntries(userId)
    }
  }, [date, userId])

  const handleDelete = async (id: string) => {
    if (!confirm('Eintrag wirklich löschen?')) return

    const { error } = await supabase.from('time_entries').delete().eq('id', id)
    if (!error) {
      setEntries(prev => prev.filter(e => e.id !== id))
    }
  }

  const handleSuccess = () => {
    if (userId) loadEntries(userId)
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Zeiteinträge</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Abbrechen' : '+ Neuer Eintrag'}
        </Button>
      </div>

      {showForm && userId && (
        <div className="mb-6 p-4 border rounded-lg bg-card">
          <EntryForm userId={userId} onSuccess={handleSuccess} />
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