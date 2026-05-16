'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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

export function EntryForm({ onCreate }: EntryFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    started_date: '',
    started_time: '09:00',
    ended_date: '',
    ended_time: ''
  })

  const set = (key: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

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

      if (endedAt && endedAt <= startedAt) {
        toast.error('Endzeit muss nach Startzeit liegen')
        setLoading(false)
        return
      }

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
        started_time: '09:00',
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
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={e => set('title', e.target.value)}
          placeholder="z.B. Projektarbeit"
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Kategorie</Label>
        <Select value={formData.category} onValueChange={v => set('category', v)}>
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
          <input
            id="started_date"
            type="date"
            value={formData.started_date}
            onChange={e => set('started_date', e.target.value)}
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="started_time">Startzeit *</Label>
          <input
            id="started_time"
            type="time"
            value={formData.started_time}
            onChange={e => set('started_time', e.target.value)}
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ended_date">Enddatum</Label>
          <input
            id="ended_date"
            type="date"
            value={formData.ended_date}
            onChange={e => set('ended_date', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ended_time">Endzeit</Label>
          <input
            id="ended_time"
            type="time"
            value={formData.ended_time}
            onChange={e => set('ended_time', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Optionale Notizen..."
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Wird erstellt...' : 'Eintrag erstellen'}
      </Button>
    </form>
  )
}