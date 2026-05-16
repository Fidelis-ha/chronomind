'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { type TimeEntry } from '@/lib/types'
import { nanoid } from '@/lib/utils'

interface EntryFormProps {
  onCreate: (entry: TimeEntry) => void
}

const CATEGORIES = ['Arbeit', 'Meeting', 'Pause', 'Projekt', 'Sonstiges']

const fieldStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid hsl(215.4 16.3% 46.9%)',
  borderRadius: '0.375rem',
  background: 'hsl(0 0% 100%)',
  color: 'hsl(215.4 16.3% 17.1%)',
  fontSize: '0.875rem',
  boxSizing: 'border-box' as const
}

const labelStyle = {
  fontSize: '0.875rem',
  fontWeight: 500,
  marginBottom: '0.25rem',
  display: 'block' as const
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
    <div style={{ padding: '1rem', border: '1px solid hsl(214.3 31.8% 91.4%)', borderRadius: '0.5rem', background: 'hsl(0 0% 100%)' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        <div>
          <label htmlFor="ef-title" style={labelStyle}>Titel *</label>
          <input
            id="ef-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="z.B. Projektarbeit"
            required
            style={fieldStyle}
          />
        </div>

        <div>
          <label htmlFor="ef-category" style={labelStyle}>Kategorie</label>
          <select
            id="ef-category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ ...fieldStyle, cursor: 'pointer' }}
          >
            <option value="">Kategorie wählen</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label htmlFor="ef-sdate" style={labelStyle}>Startdatum *</label>
            <input
              id="ef-sdate"
              type="date"
              value={startedDate}
              onChange={e => setStartedDate(e.target.value)}
              required
              style={fieldStyle}
            />
          </div>
          <div>
            <label htmlFor="ef-stime" style={labelStyle}>Startzeit *</label>
            <input
              id="ef-stime"
              type="time"
              value={startedTime}
              onChange={e => setStartedTime(e.target.value)}
              required
              style={fieldStyle}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label htmlFor="ef-edate" style={labelStyle}>Enddatum</label>
            <input
              id="ef-edate"
              type="date"
              value={endedDate}
              onChange={e => setEndedDate(e.target.value)}
              style={fieldStyle}
            />
          </div>
          <div>
            <label htmlFor="ef-etime" style={labelStyle}>Endzeit</label>
            <input
              id="ef-etime"
              type="time"
              value={endedTime}
              onChange={e => setEndedTime(e.target.value)}
              style={fieldStyle}
            />
          </div>
        </div>

        <div>
          <label htmlFor="ef-desc" style={labelStyle}>Beschreibung</label>
          <textarea
            id="ef-desc"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optionale Notizen..."
            rows={3}
            style={{ ...fieldStyle, resize: 'vertical', minHeight: '80px' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: loading ? 'hsl(214.3 31.8% 91.4%)' : 'hsl(221.2 83.2% 53.3%)',
            color: 'hsl(0 0% 100%)',
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
    </div>
  )
}