'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
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
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Partial<UserSettings>>({
    timezone: 'Europe/Berlin',
    work_day_start: '08:00',
    work_day_end: '18:00'
  })

  const supabase = createClientComponentClient()

  useEffect(() => {
    const getSession = async () => {
      const cookieStore = cookies()
      const session = await auth({ cookieStore })
      if (session?.user) {
        setUserId(session.user.id)
        loadSettings(session.user.id)
      }
    }
    getSession()
  }, [])

  const loadSettings = async (uid: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', uid)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (data) {
        setSettings({
          timezone: data.timezone,
          work_day_start: data.work_day_start,
          work_day_end: data.work_day_end
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!userId) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          timezone: settings.timezone,
          work_day_start: settings.work_day_start,
          work_day_end: settings.work_day_end
        }, { onConflict: 'user_id' })

      if (error) throw error
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