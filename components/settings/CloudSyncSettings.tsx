'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  type CloudConfig,
  type CloudProvider,
  loadCloudConfig,
  saveCloudConfig,
  clearCloudConfig,
  testCloudConnection,
  pushToCloud,
  pullFromCloud
} from '@/lib/cloud-sync'
import { loadEntries } from '@/lib/entries-store'
import { loadActivities } from '@/lib/activities'

const PROVIDERS = [
  { id: 'nextcloud', label: 'Nextcloud (empfohlen)' },
  { id: 'webdav', label: 'WebDAV (generisch)' },
  { id: 's3', label: 'Amazon S3' }
]

export function CloudSyncSettings() {
  const [config, setConfig] = useState<CloudConfig>({ provider: 'nextcloud' })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string; detail?: string } | null>(null)
  const [pushing, setPushing] = useState(false)
  const [pulling, setPulling] = useState(false)

  useEffect(() => {
    const saved = loadCloudConfig()
    if (saved) setConfig(saved)
  }, [])

  const set = (patch: Partial<CloudConfig>) => setConfig(prev => ({ ...prev, ...patch }))

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testCloudConnection(config)
      setTestResult(result)
      if (result.ok) {
        saveCloudConfig(config)
        window.dispatchEvent(new CustomEvent('chronomind:cloud-config-changed'))
        toast.success(result.detail ? `Verbindung ok (${result.detail})` : 'Verbindung erfolgreich – Konfiguration gespeichert')
      } else {
        toast.error(result.error || 'Verbindung fehlgeschlagen')
      }
    } catch (err) {
      setTestResult({ ok: false, error: err instanceof Error ? err.message : String(err) })
    } finally {
      setTesting(false)
    }
  }

  const handlePush = async () => {
    setPushing(true)
    try {
      let settings: unknown = {}
      try { settings = JSON.parse(localStorage.getItem('chronomind_settings') || '{}') } catch { /* ignore */ }
      const result = await pushToCloud(config, {
        version: 1,
        entries: loadEntries(),
        settings,
        activities: loadActivities()
      })
      if (result.ok) {
        saveCloudConfig(config)
        window.dispatchEvent(new CustomEvent('chronomind:cloud-config-changed'))
        toast.success('Alle Daten in die Cloud hochgeladen')
      } else {
        toast.error(result.error || 'Upload fehlgeschlagen')
      }
    } finally {
      setPushing(false)
    }
  }

  const handlePull = async () => {
    setPulling(true)
    try {
      const result = await pullFromCloud(config)
      if (!result.ok) {
        toast.error(result.error || 'Download fehlgeschlagen')
        return
      }
      if (!result.data) {
        toast('Cloud ist noch leer – bitte zuerst hochladen', { icon: '☁️' })
        return
      }
      if (!confirm(`Cloud-Stand vom ${new Date(result.data.timestamp).toLocaleString('de-DE')} übernehmen? Lokale Daten werden ersetzt.`)) return
      // Übernehmen und neu laden
      saveCloudConfig(config)
      if (Array.isArray(result.data.entries)) localStorage.setItem('chronomind_entries', JSON.stringify(result.data.entries))
      if (result.data.settings && typeof result.data.settings === 'object') localStorage.setItem('chronomind_settings', JSON.stringify(result.data.settings))
      if (Array.isArray(result.data.activities)) localStorage.setItem('chronomind_activities', JSON.stringify(result.data.activities))
      toast.success('Cloud-Stand übernommen')
      setTimeout(() => window.location.reload(), 600)
    } finally {
      setPulling(false)
    }
  }

  const handleRemove = () => {
    if (!confirm('Cloud-Anbindung entfernen? Daten bleiben lokal erhalten.')) return
    clearCloudConfig()
    setConfig({ provider: 'nextcloud' })
    setTestResult(null)
    window.dispatchEvent(new CustomEvent('chronomind:cloud-config-changed'))
    toast.success('Cloud-Anbindung entfernt')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Cloud-Anbieter</Label>
        <Select value={config.provider} onValueChange={v => set({ provider: v as CloudProvider })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDERS.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Bei aktivierter Cloud werden neue Einträge automatisch hochgeladen und beim Laden der Seite auf neuere Cloud-Stände geprüft.
        </p>
      </div>

      {config.provider === 'nextcloud' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="nc_server">Nextcloud-Server</Label>
            <Input id="nc_server" value={config.nc_server || ''} onChange={e => set({ nc_server: e.target.value })} placeholder="https://wolke.example.de" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nc_user">Benutzer</Label>
              <Input id="nc_user" value={config.username || ''} onChange={e => set({ username: e.target.value })} placeholder="Benutzername" autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc_pass">App-Passwort</Label>
              <Input id="nc_pass" type="password" value={config.password || ''} onChange={e => set({ password: e.target.value })} placeholder="App-Passwort (nicht das Login)" autoComplete="new-password" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nc_path">Ablagepfad (optional)</Label>
            <Input id="nc_path" value={config.nc_path || ''} onChange={e => set({ nc_path: e.target.value })} placeholder="chronomind/chronomind-data.json" />
          </div>
        </>
      )}

      {config.provider === 'webdav' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="wd_url">WebDAV-Verzeichnis-URL</Label>
            <Input id="wd_url" value={config.webdav_url || ''} onChange={e => set({ webdav_url: e.target.value })} placeholder="https://server.de/dav/backup/" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wd_user">Benutzer</Label>
              <Input id="wd_user" value={config.username || ''} onChange={e => set({ username: e.target.value })} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wd_pass">Passwort</Label>
              <Input id="wd_pass" type="password" value={config.password || ''} onChange={e => set({ password: e.target.value })} autoComplete="new-password" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wd_file">Dateiname (optional)</Label>
            <Input id="wd_file" value={config.webdav_filename || ''} onChange={e => set({ webdav_filename: e.target.value })} placeholder="chronomind-data.json" />
          </div>
        </>
      )}

      {config.provider === 's3' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="s3_bucket">Bucket</Label>
              <Input id="s3_bucket" value={config.s3_bucket || ''} onChange={e => set({ s3_bucket: e.target.value })} placeholder="mein-bucket" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s3_region">Region</Label>
              <Input id="s3_region" value={config.s3_region || ''} onChange={e => set({ s3_region: e.target.value })} placeholder="eu-central-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="s3_key">Access Key ID</Label>
            <Input id="s3_key" value={config.aws_access_key_id || ''} onChange={e => set({ aws_access_key_id: e.target.value })} autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s3_secret">Secret Access Key</Label>
            <Input id="s3_secret" type="password" value={config.aws_secret_access_key || ''} onChange={e => set({ aws_secret_access_key: e.target.value })} autoComplete="new-password" />
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="outline" onClick={handleTest} disabled={testing}>
          {testing ? 'Teste…' : 'Verbindung testen & speichern'}
        </Button>
        <Button onClick={handlePush} disabled={pushing}>
          {pushing ? 'Lade hoch…' : 'Jetzt hochladen'}
        </Button>
        <Button variant="outline" onClick={handlePull} disabled={pulling}>
          {pulling ? 'Lade…' : 'Aus Cloud laden'}
        </Button>
        {loadCloudConfig() && (
          <Button variant="ghost" onClick={handleRemove} className="text-destructive hover:text-destructive">
            Cloud entfernen
          </Button>
        )}
      </div>

      {testResult && !testResult.ok && (
        <p className="text-sm text-destructive">✗ {testResult.error}</p>
      )}
    </div>
  )
}
