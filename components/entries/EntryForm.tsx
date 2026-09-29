'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { type TimeEntry } from '@/lib/types'
import { nanoid } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface EntryFormProps {
  onCreate: (entry: TimeEntry) => void
}

const CATEGORIES = ['Arbeit', 'Meeting', 'Pause', 'Projekt', 'Sonstiges']

const fieldClass =
  'w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors duration-200'

const labelClass =
  'mb-1 block text-sm font-medium text-on-surface'

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
        created_at: now.toISOString(),
        is_recurring: null,
        recurrence_rule: null,
        recurrence_parent_id: null,
        recurrence_index: null
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="ef-title" className={labelClass}>Titel *</label>
        <input
          id="ef-title"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="z.B. Projektarbeit"
          required
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="ef-category" className={labelClass}>Kategorie</label>
        <select
          id="ef-category"
          value={category}
          onChange={e => setCategory(e.target.value)}
          className={`${fieldClass} cursor-pointer`}
        >
          <option value="">Kategorie wählen</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="ef-sdate" className={labelClass}>Startdatum *</label>
          <input
            id="ef-sdate"
            type="date"
            value={startedDate}
            onChange={e => setStartedDate(e.target.value)}
            required
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="ef-stime" className={labelClass}>Startzeit *</label>
          <input
            id="ef-stime"
            type="time"
            value={startedTime}
            onChange={e => setStartedTime(e.target.value)}
            required
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="ef-edate" className={labelClass}>Enddatum</label>
          <input
            id="ef-edate"
            type="date"
            value={endedDate}
            onChange={e => setEndedDate(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="ef-etime" className={labelClass}>Endzeit</label>
          <input
            id="ef-etime"
            type="time"
            value={endedTime}
            onChange={e => setEndedTime(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="ef-desc" className={labelClass}>Beschreibung</label>
        <textarea
          id="ef-desc"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optionale Notizen..."
          rows={3}
          className={`${fieldClass} min-h-[80px] resize-y`}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? 'Wird erstellt...' : 'Eintrag erstellen'}
      </Button>
    </form>
  )
}
