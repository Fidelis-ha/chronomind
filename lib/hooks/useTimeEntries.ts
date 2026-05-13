'use client'

import { useState, useCallback } from 'react'
import { type TimeEntry } from '@/lib/types'

interface EntryInput {
  title: string
  description: string | null
  category: string | null
  tags: string[] | null
  started_at: string
  ended_at: string | null
  source: 'ai_chat' | 'manual' | 'voice' | 'calendar'
  calendar_event_id: string | null
  metadata: Record<string, unknown> | null
}

export function useTimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async (userId: string, date?: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/entries?userId=${userId}${date ? `&date=${date}` : ''}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEntries(data.entries || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }, [])

  const createEntry = useCallback(async (
    userId: string,
    entry: Omit<TimeEntry, 'id' | 'user_id' | 'created_at' | 'duration_seconds'>
  ) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, entry })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEntries(prev => [data.entry, ...prev])
      return data.entry
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateEntry = useCallback(async (id: string, updates: Partial<TimeEntry>) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEntries(prev => prev.map(e => e.id === id ? data.entry : e))
      return data.entry
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteEntry = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    entries,
    loading,
    error,
    fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry
  }
}
