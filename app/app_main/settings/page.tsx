'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { type UserSettings } from '@/lib/types'

const TIMEZONES = [
  'Europe/Berlin',
  'Europe/London',
  'Europe/Paris',
  'Europe/Zurich',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Shanghai'
]

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Partial<UserSettings>>({
    timezone: 'Europe/Berlin',
    work_day_start: '08:00',
    work_day_end: '18:00'
  })

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      return data.user ?? null
    } catch {
      return null
    }
  }, [])

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) return
      const data = await res.json()
      if (data.settings) {
        setSettings({
          timezone: data.settings.timezone,
          work_day_start: data.settings.work_day_start,
          work_day_end: data.settings.work_day_end
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const u = await loadSession()
      setUser(u)
      if (u) await loadSettings()
      else setLoading(false)
    }
    init()
  }, [loadSession, loadSettings])

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (!res.ok) throw new Error('Save failed')
      toast.success('Einstellungen gespeichert')
    } catch (err) {
      toast.error('Fehler beim Speichern')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="container py-8">Wird geladen...</div>
  }

  if (!user) {
    return (
      <div className="container py-8 text-center">
        <p className="text-muted-foreground mb-4">Bitte zuerst anmelden.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-xl py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Einstellungen</h1>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="timezone">Zeitzone</Label>
          <Select
            value={settings.timezone}
            onValueChange={value => setSettings(prev => ({ ...prev, timezone: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map(tz => (
                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="work_start">Arbeitszeit Start</Label>
            <Input
              id="work_start"
              type="time"
              value={settings.work_day_start}
              onChange={e => setSettings(prev => ({ ...prev, work_day_start: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="work_end">Arbeitszeit Ende</Label>
            <Input
              id="work_end"
              type="time"
              value={settings.work_day_end}
              onChange={e => setSettings(prev => ({ ...prev, work_day_end: e.target.value }))}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Wird gespeichert...' : 'Speichern'}
        </Button>
      </div>
    </div>
  )
}
