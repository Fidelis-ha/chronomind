'use client'

import { useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { type TimeEntry } from '@/lib/types'

export function useTimeEntries() {
  const supabase = createClientComponentClient()
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async (userId: string, date?: string) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })

      if (date) {
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)

        query = query
          .gte('started_at', startOfDay.toISOString())
          .lte('started_at', endOfDay.toISOString())
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setEntries(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const createEntry = useCallback(async (
    userId: string,
    entry: Omit<TimeEntry, 'id' | 'user_id' | 'created_at' | 'duration_seconds'>
  ) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: insertError } = await supabase
        .from('time_entries')
        .insert({
          user_id: userId,
          title: entry.title,
          description: entry.description,
          category: entry.category,
          tags: entry.tags,
          started_at: entry.started_at,
          ended_at: entry.ended_at,
          source: entry.source,
          calendar_event_id: entry.calendar_event_id,
          metadata: entry.metadata
        })
        .select()
        .single()

      if (insertError) throw insertError
      if (data) {
        setEntries(prev => [data, ...prev])
      }
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen')
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const updateEntry = useCallback(async (id: string, updates: Partial<TimeEntry>) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: updateError } = await supabase
        .from('time_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      if (data) {
        setEntries(prev => prev.map(e => e.id === id ? data : e))
      }
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren')
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const deleteEntry = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const { error: deleteError } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen')
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase])

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
