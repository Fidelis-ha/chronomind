'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'

const TIMEZONES = [
  'Europe/Berlin', 'Europe/London', 'Europe/Paris', 'Europe/Zurich',
  'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Shanghai'
]

const BACKUP_PROVIDERS = [
  { id: '', label: 'Keine Sicherung' },
  { id: 's3', label: 'Amazon S3' },
  { id: 'webdav', label: 'WebDAV' }
]

const AI_PROVIDERS = [
  { id: 'mistral', label: 'Mistral AI' },
  { id: 'routerlab', label: 'RouterLab' }
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
  work_day_start: '08:00',
  work_day_end: '18:00',
  backup_provider: '',
  backup_s3_bucket: '',
  backup_s3_region: 'eu-central-1',
  backup_webdav_url: '',
  aws_access_key_id: '',
  aws_secret_access_key: '',
  ai_provider: 'mistral',
  ai_model: 'mistral-large-latest',
  ai_api_key_mistral: '',
  ai_api_key_routerlab: '',
  routerlab_base_url: 'https://routerlab.ch/v1'
}

export default function SettingsPage() {
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

  const handleExportJSON = () => {
    const entries = localStorage.getItem('chronomind_entries') || '[]'
    const data = JSON.stringify({ entries: JSON.parse(entries), settings }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chronomind-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('JSON Export erstellt')
  }

  const handleExportCSV = () => {
    const entriesRaw = localStorage.getItem('chronomind_entries') || '[]'
    const entries = JSON.parse(entriesRaw)

    const headers = ['id', 'title', 'category', 'started_at', 'ended_at', 'duration_seconds', 'description']
    const rows = entries.map((e: any) => [
      e.id,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      e.category || '',
      e.started_at || '',
      e.ended_at || '',
      e.duration_seconds || '',
      `"${(e.description || '').replace(/"/g, '""')}"`
    ])

    const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chronomind-entries-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV Export erstellt')
  }

  const handleExportICal = () => {
    const entriesRaw = localStorage.getItem('chronomind_entries') || '[]'
    const entries = JSON.parse(entriesRaw)

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ChronoMind//DE',
      'CALSCALE:GREGORIAN'
    ]

    entries.forEach((e: any) => {
      const start = new Date(e.started_at)
      const end = e.ended_at ? new Date(e.ended_at) : new Date(start.getTime() + (e.duration_seconds || 0) * 1000)
      const uid = `${e.id}@chronomind`
      const summary = (e.title || 'Zeit').replace(/,/g, '\\,')
      const description = (e.description || '').replace(/\n/g, '\\n').replace(/,/g, '\\,')

      lines.push('BEGIN:VEVENT')
      lines.push(`UID:${uid}`)
      lines.push(`DTSTAMP:${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`)
      lines.push(`DTSTART:${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`)
      lines.push(`DTEND:${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`)
      lines.push(`SUMMARY:${summary}`)
      if (description) lines.push(`DESCRIPTION:${description}`)
      if (e.category) lines.push(`CATEGORIES:${e.category}`)
      lines.push('END:VEVENT')
    })

    lines.push('END:VCALENDAR')

    const ical = lines.join('\r\n')
    const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chronomind-calendar-${new Date().toISOString().split('T')[0]}.ics`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('iCal Export erstellt')
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
          <Button variant="outline" size="sm" onClick={handleExportJSON}>JSON</Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportICal}>iCal</Button>
        </div>
      </div>

      <div className="space-y-8">

        {/* AI Settings */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">KI Einstellungen</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai_provider">KI Anbieter</Label>
              <Select
                value={settings.ai_provider}
                onValueChange={value => setSettings((prev: any) => ({ ...prev, ai_provider: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {settings.ai_provider === 'mistral' && (
              <div className="space-y-2">
                <Label htmlFor="mistral_key">Mistral API Key</Label>
                <Input
                  id="mistral_key"
                  type="password"
                  value={settings.ai_api_key_mistral}
                  onChange={e => setSettings((prev: any) => ({ ...prev, ai_api_key_mistral: e.target.value }))}
                  placeholder="sk-..."
                />
              </div>
            )}

            {settings.ai_provider === 'routerlab' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="routerlab_url">RouterLab URL</Label>
                  <Input
                    id="routerlab_url"
                    value={settings.routerlab_base_url}
                    onChange={e => setSettings((prev: any) => ({ ...prev, routerlab_base_url: e.target.value }))}
                    placeholder="https://routerlab.ch/v1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="routerlab_key">RouterLab API Key</Label>
                  <Input
                    id="routerlab_key"
                    type="password"
                    value={settings.ai_api_key_routerlab}
                    onChange={e => setSettings((prev: any) => ({ ...prev, ai_api_key_routerlab: e.target.value }))}
                    placeholder="sk-..."
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Time Settings */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Zeit-Einstellungen</h2>

          <div className="space-y-4">
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
          </div>
        </div>

        {/* Backup Settings */}
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

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Wird gespeichert...' : 'Speichern'}
        </Button>
      </div>
    </div>
  )
}