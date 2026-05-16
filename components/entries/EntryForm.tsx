'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { type TimeEntry } from '@/lib/types'
import { nanoid } from '@/lib/utils'

interface EntryFormProps {
  onCreate: (entry: TimeEntry) => void
}

const CATEGORIES = ['Arbeit', 'Meeting', 'Pause', 'Projekt', 'Sonstiges']

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid hsl(var(--input))',
  borderRadius: '0.375rem',
  background: 'transparent',
  fontSize: '0.875rem',
  outline: 'none'
}

export function EntryForm({ onCreate }: EntryFormProps) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [startedDate, setStartedDate] = useState('')
  const [startedTime, setStartedTime] = useState('09:00')
  const [endedDate, setEndedDate] = useState('')
  const [endedTime, setEndedTime] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !startedDate || !startedTime) {
      toast.error('Titel und Startzeit sind erforderlich')
      return
    }

    setLoading(true)
    try {
      const now = new Date()
      const start = new Date(`${startedDate}T${startedTime}`)
      const end = (endedDate && endedTime) ? new Date(`${endedDate}T${endedTime}`) : null

      if (end && end <= start) {
        toast.error('Endzeit muss nach Startzeit liegen')
        setLoading(false)
        return
      }

      const duration_seconds = end
        ? Math.round((end.getTime() - start.getTime()) / 1000)
        : null

      const entry: TimeEntry = {
        id: nanoid(),
        user_id: 'local-user',
        title: title.trim(),
        description: description.trim() || null,
        category: category || null,
        tags: null,
        started_at: start.toISOString(),
        ended_at: end ? end.toISOString() : null,
        duration_seconds,
        source: 'manual',
        calendar_event_id: null,
        metadata: null,
        created_at: now.toISOString()
      }

      onCreate(entry)
      toast.success('Eintrag erstellt')

      setTitle('')
      setCategory('')
      setStartedDate('')
      setStartedTime('09:00')
      setEndedDate('')
      setEndedTime('')
      setDescription('')
    } catch (err) {
      toast.error('Fehler beim Erstellen')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label htmlFor="title" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Titel *</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="z.B. Projektarbeit"
          required
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label htmlFor="category" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Kategorie</label>
        <select
          id="category"
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">Kategorie wählen</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label htmlFor="startedDate" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Startdatum *</label>
          <input
            id="startedDate"
            type="date"
            value={startedDate}
            onChange={e => setStartedDate(e.target.value)}
            required
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label htmlFor="startedTime" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Startzeit *</label>
          <input
            id="startedTime"
            type="time"
            value={startedTime}
            onChange={e => setStartedTime(e.target.value)}
            required
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label htmlFor="endedDate" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Enddatum</label>
          <input
            id="endedDate"
            type="date"
            value={endedDate}
            onChange={e => setEndedDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label htmlFor="endedTime" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Endzeit</label>
          <input
            id="endedTime"
            type="time"
            value={endedTime}
            onChange={e => setEndedTime(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label htmlFor="description" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Beschreibung</label>
        <textarea
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optionale Notizen..."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: loading ? 'hsl(var(--muted))' : 'hsl(var(--primary))',
          color: loading ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary-foreground))',
          border: 'none',
          borderRadius: '0.375rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500
        }}
      >
        {loading ? 'Wird erstellt...' : 'Eintrag erstellen'}
      </button>
    </form>
  )
}