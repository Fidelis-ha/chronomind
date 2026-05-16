'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { type TimeEntry } from '@/lib/types'
import { nanoid } from '@/lib/utils'

interface EntryFormProps {
  onCreate: (entry: TimeEntry) => void
}

const CATEGORIES = ['Arbeit', 'Meeting', 'Pause', 'Projekt', 'Sonstiges']

function combineDateTime(dateStr: string, timeStr: string): string {
  if (!dateStr || !timeStr) return ''
  return new Date(`${dateStr}T${timeStr}`).toISOString()
}

export function EntryForm({ onCreate }: EntryFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    started_date: '',
    started_time: '',
    ended_date: '',
    ended_time: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.started_date || !formData.started_time) {
      toast.error('Titel und Startzeit sind erforderlich')
      return
    }

    setLoading(true)
    try {
      const now = new Date()
      const startedAt = new Date(`${formData.started_date}T${formData.started_time}`)
      const endedAt = (formData.ended_date && formData.ended_time)
        ? new Date(`${formData.ended_date}T${formData.ended_time}`)
        : null

      const duration_seconds = endedAt
        ? Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
        : null

      const entry: TimeEntry = {
        id: nanoid(),
        user_id: 'local-user',
        title: formData.title,
        description: formData.description || null,
        category: formData.category || null,
        tags: null,
        started_at: startedAt.toISOString(),
        ended_at: endedAt ? endedAt.toISOString() : null,
        duration_seconds,
        source: 'manual',
        calendar_event_id: null,
        metadata: null,
        created_at: now.toISOString()
      }

      onCreate(entry)
      toast.success('Eintrag erstellt')

      setFormData({
        title: '',
        description: '',
        category: '',
        started_date: '',
        started_time: '',
        ended_date: '',
        ended_time: ''
      })
    } catch (err) {
      toast.error('Fehler beim Erstellen')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Titel *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="z.B. Projektarbeit"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Kategorie</Label>
        <Select
          value={formData.category}
          onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Kategorie wählen" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="started_date">Startdatum *</Label>
          <Input
            id="started_date"
            type="date"
            value={formData.started_date}
            onChange={e => setFormData(prev => ({ ...prev, started_date: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="started_time">Startzeit *</Label>
          <Input
            id="started_time"
            type="time"
            value={formData.started_time}
            onChange={e => setFormData(prev => ({ ...prev, started_time: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ended_date">Enddatum</Label>
          <Input
            id="ended_date"
            type="date"
            value={formData.ended_date}
            onChange={e => setFormData(prev => ({ ...prev, ended_date: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ended_time">Endzeit</Label>
          <Input
            id="ended_time"
            type="time"
            value={formData.ended_time}
            onChange={e => setFormData(prev => ({ ...prev, ended_time: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Optionale Notizen..."
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Wird erstellt...' : 'Eintrag erstellen'}
      </Button>
    </form>
  )
}