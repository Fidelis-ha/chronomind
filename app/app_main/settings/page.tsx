'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

const TIMEZONES = [
  'Europe/Berlin', 'Europe/London', 'Europe/Paris', 'Europe/Zurich',
  'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Shanghai'
]

const BACKUP_PROVIDERS = [
  { id: '', label: 'Keine Sicherung' },
  { id: 's3', label: 'Amazon S3' },
  { id: 'webdav', label: 'WebDAV' }
]

const STORAGE_KEY = 'chronomind_settings'

function loadSettings() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSettings(settings: any) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

const DEFAULT_SETTINGS = {
  timezone: 'Europe/Berlin',
  theme: 'system',
  work_day_start: '08:00',
  work_day_end: '18:00',
  backup_provider: '',
  backup_s3_bucket: '',
  backup_s3_region: 'eu-central-1',
  backup_webdav_url: '',
  aws_access_key_id: '',
  aws_secret_access_key: ''
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const saved = loadSettings()
  const [settings, setSettings] = useState<any>({
    ...DEFAULT_SETTINGS,
    ...(saved || {})
  })
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    try {
      saveSettings(settings)
      toast.success('Einstellungen gespeichert')
    } catch {
      toast.error('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = () => {
    const entries = localStorage.getItem('chronomind_entries') || '[]'
    const data = JSON.stringify({ entries: JSON.parse(entries), settings }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chronomind-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export erstellt')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (data.entries) {
          localStorage.setItem('chronomind_entries', JSON.stringify(data.entries))
          toast.success(`Importiert: ${Array.isArray(data.entries) ? data.entries.length : 0} Einträge`)
        }
      } catch {
        toast.error('Import fehlgeschlagen')
      }
    }
    input.click()
  }

  return (
    <div className="container mx-auto max-w-xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImport}>Import</Button>
          <Button variant="outline" size="sm" onClick={handleExport}>Export</Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="timezone">Zeitzone</Label>
          <Select
            value={settings.timezone}
            onValueChange={value => setSettings((prev: any) => ({ ...prev, timezone: value }))}
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

        <div className="space-y-2">
          <Label htmlFor="theme">Design</Label>
          <Select
            value={settings.theme || 'system'}
            onValueChange={value => {
              setSettings((prev: any) => ({ ...prev, theme: value }))
              setTheme(value)
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Hell</SelectItem>
              <SelectItem value="dark">Dunkel</SelectItem>
              <SelectItem value="system">System</SelectItem>
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
              onChange={e => setSettings((prev: any) => ({ ...prev, work_day_start: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="work_end">Arbeitszeit Ende</Label>
            <Input
              id="work_end"
              type="time"
              value={settings.work_day_end}
              onChange={e => setSettings((prev: any) => ({ ...prev, work_day_end: e.target.value }))}
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Cloud Backup</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backup_provider">Backup Anbieter</Label>
              <Select
                value={settings.backup_provider}
                onValueChange={value => setSettings((prev: any) => ({ ...prev, backup_provider: value }))}
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
                    value={settings.backup_s3_bucket}
                    onChange={e => setSettings((prev: any) => ({ ...prev, backup_s3_bucket: e.target.value }))}
                    placeholder="mein-backup-bucket"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s3_region">AWS Region</Label>
                  <Input
                    id="s3_region"
                    value={settings.backup_s3_region}
                    onChange={e => setSettings((prev: any) => ({ ...prev, backup_s3_region: e.target.value }))}
                    placeholder="eu-central-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aws_access_key">AWS Access Key ID</Label>
                  <Input
                    id="aws_access_key"
                    type="password"
                    value={settings.aws_access_key_id}
                    onChange={e => setSettings((prev: any) => ({ ...prev, aws_access_key_id: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aws_secret_key">AWS Secret Access Key</Label>
                  <Input
                    id="aws_secret_key"
                    type="password"
                    value={settings.aws_secret_access_key}
                    onChange={e => setSettings((prev: any) => ({ ...prev, aws_secret_access_key: e.target.value }))}
                  />
                </div>
              </>
            )}

            {settings.backup_provider === 'webdav' && (
              <div className="space-y-2">
                <Label htmlFor="webdav_url">WebDAV URL</Label>
                <Input
                  id="webdav_url"
                  value={settings.backup_webdav_url}
                  onChange={e => setSettings((prev: any) => ({ ...prev, backup_webdav_url: e.target.value }))}
                  placeholder="https://dav.example.com/backup/"
                />
              </div>
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