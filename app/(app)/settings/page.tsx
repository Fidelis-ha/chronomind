'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { Switch } from '@/components/ui/switch'
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

const BACKUP_PROVIDERS = [
  { id: '', label: 'Keine Sicherung' },
  { id: 's3', label: 'Amazon S3' },
  { id: 'webdav', label: 'WebDAV' }
]

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Partial<UserSettings & { backup_provider: string; backup_s3_bucket: string; backup_s3_region: string; backup_webdav_url: string }>>({
    timezone: 'Europe/Berlin',
    work_day_start: '08:00',
    work_day_end: '18:00',
    backup_provider: ''
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      if (res.ok && data.settings) {
        const s = data.settings
        setSettings({
          timezone: s.timezone || 'Europe/Berlin',
          work_day_start: s.work_day_start || '08:00',
          work_day_end: s.work_day_end || '18:00',
          ai_provider: s.ai_provider,
          ai_model: s.ai_model,
          ai_api_key_mistral: s.ai_api_key_mistral,
          ai_api_key_routerlab: s.ai_api_key_routerlab,
          routerlab_base_url: s.routerlab_base_url,
          backup_provider: s.backup_provider || '',
          backup_s3_bucket: s.backup_config?.s3_bucket || '',
          backup_s3_region: s.backup_config?.s3_region || 'eu-central-1',
          backup_webdav_url: s.backup_config?.webdav_url || ''
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (!res.ok) throw new Error('Speichern fehlgeschlagen')
      toast.success('Einstellungen gespeichert')
    } catch (err) {
      toast.error('Fehler beim Speichern')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleBackupNow = async () => {
    try {
      const res = await fetch('/api/backup', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Backup fehlgeschlagen')
      toast.success('Backup erstellt!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Backup fehlgeschlagen')
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
            value={settings.timezone || 'Europe/Berlin'}
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
              value={settings.work_day_start || '08:00'}
              onChange={e => setSettings(prev => ({ ...prev, work_day_start: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="work_end">Arbeitszeit Ende</Label>
            <Input
              id="work_end"
              type="time"
              value={settings.work_day_end || '18:00'}
              onChange={e => setSettings(prev => ({ ...prev, work_day_end: e.target.value }))}
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Cloud Backup</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backup_provider">Backup Anbieter</Label>
              <Select
                value={settings.backup_provider || ''}
                onValueChange={value => setSettings(prev => ({ ...prev, backup_provider: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Backup auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {BACKUP_PROVIDERS.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {settings.backup_provider === 's3' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="s3_bucket">S3 Bucket Name</Label>
                  <Input
                    id="s3_bucket"
                    value={settings.backup_s3_bucket || ''}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      backup_s3_bucket: e.target.value,
                      backup_config: {
                        ...prev.backup_config as any,
                        s3_bucket: e.target.value
                      }
                    }))}
                    placeholder="mein-backup-bucket"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s3_region">AWS Region</Label>
                  <Input
                    id="s3_region"
                    value={settings.backup_s3_region || 'eu-central-1'}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      backup_s3_region: e.target.value,
                      backup_config: {
                        ...prev.backup_config as any,
                        s3_region: e.target.value
                      }
                    }))}
                    placeholder="eu-central-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aws_access_key">AWS Access Key ID</Label>
                  <Input
                    id="aws_access_key"
                    type="password"
                    value={settings.backup_config?.aws_access_key_id || ''}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      backup_config: {
                        ...prev.backup_config as any,
                        aws_access_key_id: e.target.value
                      }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aws_secret_key">AWS Secret Access Key</Label>
                  <Input
                    id="aws_secret_key"
                    type="password"
                    value={settings.backup_config?.aws_secret_access_key || ''}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      backup_config: {
                        ...prev.backup_config as any,
                        aws_secret_access_key: e.target.value
                      }
                    }))}
                  />
                </div>
              </>
            )}

            {settings.backup_provider === 'webdav' && (
              <div className="space-y-2">
                <Label htmlFor="webdav_url">WebDAV URL</Label>
                <Input
                  id="webdav_url"
                  value={settings.backup_webdav_url || ''}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    backup_webdav_url: e.target.value,
                    backup_config: {
                      ...prev.backup_config as any,
                      webdav_url: e.target.value
                    }
                  }))}
                  placeholder="https://dav.example.com/backup/"
                />
              </div>
            )}

            {settings.backup_provider && (
              <Button onClick={handleBackupNow} variant="outline">
                Backup jetzt erstellen
              </Button>
            )}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Wird gespeichert...' : 'Speichern'}
        </Button>
      </div>
    </div>
  )
}
