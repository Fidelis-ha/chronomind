'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'

interface EntryFormProps {
  userId: string
  onSuccess?: () => void
}

const CATEGORIES = ['Arbeit', 'Meeting', 'Pause', 'Projekt', 'Sonstiges']

export function EntryForm({ userId, onSuccess }: EntryFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    started_at: '',
    ended_at: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.started_at) {
      toast.error('Titel und Startzeit sind erforderlich')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          category: formData.category || undefined,
          started_at: formData.started_at,
          ended_at: formData.ended_at || undefined,
          source: 'manual'
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler')
      }

      toast.success('Eintrag erstellt')
      setFormData({ title: '', description: '', category: '', started_at: '', ended_at: '' })
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Erstellen')
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
          <Label htmlFor="started_at">Startzeit *</Label>
          <Input
            id="started_at"
            type="datetime-local"
            value={formData.started_at}
            onChange={e => setFormData(prev => ({ ...prev, started_at: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ended_at">Endzeit</Label>
          <Input
            id="ended_at"
            type="datetime-local"
            value={formData.ended_at}
            onChange={e => setFormData(prev => ({ ...prev, ended_at: e.target.value }))}
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
