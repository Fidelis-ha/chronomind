'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { type TimeEntry, type RecurrenceRule, type RecurrenceFrequency } from '@/lib/types'
import { nanoid } from '@/lib/utils'
import { formatRecurrenceRule } from '@/lib/recurrence'

interface EntryFormProps {
  onCreate: (entry: TimeEntry) => void
  initialData?: Partial<TimeEntry>
  onEdit?: (entry: TimeEntry) => void
  editMode?: boolean
}

const CATEGORIES = ['Arbeit', 'Meeting', 'Pause', 'Projekt', 'Sonstiges']

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' }
]

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

export function EntryForm({ onCreate, initialData, onEdit, editMode }: EntryFormProps) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState(initialData?.title || '')
  const [category, setCategory] = useState(initialData?.category || '')
  const [startedDate, setStartedDate] = useState(initialData?.started_at ? initialData.started_at.split('T')[0] : '')
  const [startedTime, setStartedTime] = useState(initialData?.started_at ? initialData.started_at.split('T')[1]?.slice(0, 5) || '09:00' : '09:00')
  const [endedDate, setEndedDate] = useState(initialData?.ended_at ? initialData.ended_at.split('T')[0] : '')
  const [endedTime, setEndedTime] = useState(initialData?.ended_at ? initialData.ended_at.split('T')[1]?.slice(0, 5) || '' : '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [isRecurring, setIsRecurring] = useState(initialData?.is_recurring || false)
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>(initialData?.recurrence_rule?.frequency || 'daily')
  const [recurrenceInterval, setRecurrenceInterval] = useState(initialData?.recurrence_rule?.interval || 1)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(initialData?.recurrence_rule?.endDate || '')

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

      let recurrenceRule: RecurrenceRule | null = null
      if (isRecurring && !editMode) {
        recurrenceRule = {
          frequency: recurrenceFrequency,
          interval: recurrenceInterval,
          endDate: recurrenceEndDate || null,
          count: null
        }
      }

      const entry: TimeEntry = {
        id: initialData?.id || nanoid(),
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
        is_recurring: isRecurring || null,
        recurrence_rule: recurrenceRule,
        recurrence_parent_id: null,
        recurrence_index: 0
      }

      if (editMode && onEdit) {
        onEdit(entry)
        toast.success('Eintrag aktualisiert')
      } else {
        onCreate(entry)
        toast.success(entry.is_recurring ? 'Serie erstellt' : 'Eintrag erstellt')
      }

      setTitle('')
      setCategory('')
      setStartedDate('')
      setStartedTime('09:00')
      setEndedDate('')
      setEndedTime('')
      setDescription('')
      setIsRecurring(false)
      setRecurrenceFrequency('daily')
      setRecurrenceInterval(1)
      setRecurrenceEndDate('')
    } catch (err) {
      toast.error('Fehler beim Erstellen')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const recurrenceRule: RecurrenceRule | null = isRecurring ? {
    frequency: recurrenceFrequency,
    interval: recurrenceInterval,
    endDate: recurrenceEndDate || null,
    count: null
  } : null

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

        {/* Recurrence Section */}
        {!editMode && (
          <div style={{ borderTop: '1px solid hsl(214.3 31.8% 91.4%)', paddingTop: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                id="ef-recurring"
                type="checkbox"
                checked={isRecurring}
                onChange={e => setIsRecurring(e.target.checked)}
                style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
              />
              <label htmlFor="ef-recurring" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>
                Wiederkehrend
              </label>
            </div>

            {isRecurring && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label htmlFor="ef-rec-frequency" style={labelStyle}>Wiederholung</label>
                    <select
                      id="ef-rec-frequency"
                      value={recurrenceFrequency}
                      onChange={e => setRecurrenceFrequency(e.target.value as RecurrenceFrequency)}
                      style={{ ...fieldStyle, cursor: 'pointer' }}
                    >
                      {RECURRENCE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ef-rec-interval" style={labelStyle}>Alle</label>
                    <input
                      id="ef-rec-interval"
                      type="number"
                      min="1"
                      max="30"
                      value={recurrenceInterval}
                      onChange={e => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                      style={fieldStyle}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="ef-rec-end" style={labelStyle}>Enddatum (optional)</label>
                  <input
                    id="ef-rec-end"
                    type="date"
                    value={recurrenceEndDate}
                    onChange={e => setRecurrenceEndDate(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                {recurrenceRule && (
                  <div style={{ fontSize: '0.75rem', color: 'hsl(215.4 16.3% 46.9%)' }}>
                    Vorschau: {formatRecurrenceRule(recurrenceRule)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
          {loading ? 'Wird erstellt...' : editMode ? 'Eintrag aktualisieren' : 'Eintrag erstellen'}
        </button>
      </form>
    </div>
  )
}