'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Calendar, type CalendarEvent, type TimeEntry } from '@/lib/types'
import { loadEntries, ENTRIES_CHANGED_EVENT } from '@/lib/entries-store'
import { loadPlans, PLANS_CHANGED_EVENT, type TimePlan } from '@/lib/plans'
import { buildICS } from '@/lib/calendar/ics'
import { type CloudConfig } from '@/lib/cloud-sync'
import {
  type ConflictStrategy,
  type RemoteCalendar,
  createNextcloudCalendar,
  fetchRemoteEvents,
  listNextcloudCalendars,
  putRemoteEvent,
  icsUtcToIso
} from '@/lib/calendar/nextcloud'
import { loadCloudConfig } from '@/lib/cloud-sync'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { AppLayout } from '@/components/app-layout'
import { CalendarIcon, DownloadIcon, RefreshCwIcon, TrashIcon } from 'lucide-react'

const STORAGE_KEY = 'chronomind_calendars'
const EVENTS_KEY = 'chronomind_calendar_events'

function loadCalendars(): Calendar[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCalendars(calendars: Calendar[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(calendars))
}

function loadCalendarEvents(): CalendarEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCalendarEvents(events: CalendarEvent[]) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
}

const CONFLICT_LABELS: Record<ConflictStrategy, string> = {
  'app-wins': 'Überschreiben (App gewinnt)',
  'push-only': 'Aus App übernehmen (nur pushen)',
  'remote-wins': 'Aus Online-Kalender übernehmen'
}

export default function CalendarPage() {
  // Export-Karte: aktuelle ICS als Blob-URL, automatisch aktuell gehalten
  const [icsUrl, setIcsUrl] = useState<string | null>(null)
  const [entryCount, setEntryCount] = useState(0)
  const blobUrlRef = useRef<string | null>(null)

  const buildBlob = useCallback(() => {
    const entries = loadEntries()
    const plans = loadPlans()
    const ics = buildICS(entries, plans)
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
    blobUrlRef.current = url
    setIcsUrl(url)
    setEntryCount(entries.length + plans.length)
  }, [])

  useEffect(() => {
    buildBlob()
    const onChange = () => buildBlob()
    window.addEventListener(ENTRIES_CHANGED_EVENT, onChange)
    window.addEventListener(PLANS_CHANGED_EVENT, onChange)
    return () => {
      window.removeEventListener(ENTRIES_CHANGED_EVENT, onChange)
      window.removeEventListener(PLANS_CHANGED_EVENT, onChange)
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [buildBlob])

  const handleDownload = () => {
    if (!icsUrl) return
    const a = document.createElement('a')
    a.href = icsUrl
    a.download = `chronomind-calendar-${new Date().toISOString().split('T')[0]}.ics`
    a.click()
    toast.success('Kalender-Datei exportiert')
  }

  // Webcal-Kalender (bestehende Funktionalität)
  const [calendars, setCalendars] = useState<Calendar[]>(loadCalendars)
  const [events, setEvents] = useState<CalendarEvent[]>(loadCalendarEvents)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [syncing, setSyncing] = useState(false)

  const handleAddCalendar = () => {
    if (!newName.trim() || !newUrl.trim()) {
      toast.error('Name und URL sind erforderlich')
      return
    }

    const calendar: Calendar = {
      id: `cal_${Date.now()}`,
      user_id: 'local-user',
      name: newName.trim(),
      webcal_url: newUrl.trim(),
      color: '#3b82f6',
      auto_suggest: true,
      last_synced_at: null,
      created_at: new Date().toISOString()
    }

    const updated = [...calendars, calendar]
    setCalendars(updated)
    saveCalendars(updated)
    setNewName('')
    setNewUrl('')
    setShowForm(false)
    toast.success('Kalender hinzugefügt')
  }

  const handleDeleteCalendar = (id: string) => {
    if (!confirm('Kalender wirklich löschen?')) return
    const updated = calendars.filter(c => c.id !== id)
    setCalendars(updated)
    saveCalendars(updated)
    const updatedEvents = events.filter(e => e.calendar_id !== id)
    setEvents(updatedEvents)
    saveCalendarEvents(updatedEvents)
    toast.success('Kalender gelöscht')
  }

  const handleSync = () => {
    setSyncing(true)
    setTimeout(() => {
      const updated = calendars.map(c => ({
        ...c,
        last_synced_at: new Date().toISOString()
      }))
      setCalendars(updated)
      saveCalendars(updated)
      setSyncing(false)
      toast.success('Sync erfolgreich (Demo)')
    }, 1000)
  }

  // Optionale Nextcloud-Verknuepfung
  const [cloudConfig, setCloudConfig] = useState<CloudConfig | null>(null)
  const [ncCalendars, setNcCalendars] = useState<RemoteCalendar[]>([])
  const [selectedCal, setSelectedCal] = useState<string>('')
  const [newCalName, setNewCalName] = useState('Chronomind')
  const [strategy, setStrategy] = useState<ConflictStrategy>('app-wins')
  const [ncBusy, setNcBusy] = useState(false)
  const [ncStatus, setNcStatus] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const cfg = await loadCloudConfig()
      if (cfg?.provider === 'nextcloud') setCloudConfig(cfg)
    })()
  }, [])

  const refreshNcCalendars = useCallback(async (cfg: CloudConfig) => {
    try {
      const list = await listNextcloudCalendars(cfg)
      setNcCalendars(list)
      if (list.length && !list.some(c => c.url === selectedCal)) {
        const preferred = list.find(c => /chronomind/i.test(c.displayName)) || list[0]
        setSelectedCal(preferred.url)
      }
    } catch (err) {
      // Fehler auch dauerhaft in der Seite anzeigen, nicht nur als kurzlebigen Toast
      const msg = err instanceof Error ? err.message : 'Kalender konnten nicht geladen werden'
      setNcStatus(`Kalender konnten nicht geladen werden: ${msg}`)
      toast.error(msg)
    }
  }, [selectedCal])

  useEffect(() => {
    if (cloudConfig) void refreshNcCalendars(cloudConfig)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudConfig])

  const handleCreateNcCalendar = async () => {
    if (!cloudConfig || !newCalName.trim()) return
    setNcBusy(true)
    try {
      await createNextcloudCalendar(cloudConfig, newCalName.trim())
      toast.success(`Kalender "${newCalName.trim()}" angelegt`)
      await refreshNcCalendars(cloudConfig)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Anlegen fehlgeschlagen')
    } finally {
      setNcBusy(false)
    }
  }

  const handleNcSync = async () => {
    if (!cloudConfig || !selectedCal) return
    setNcBusy(true)
    setNcStatus(null)
    try {
      if (strategy === 'remote-wins') {
        const remote = await fetchRemoteEvents(cloudConfig, selectedCal)
        const existing = loadEntries()
        const byId = new Map(existing.map(e => [e.id, e]))
        let imported = 0
        for (const ev of remote) {
          const m = ev.uid.match(/^(.+)(@chronomind(?:-plan)?)$/)
          const localId = m ? m[1] : `nc_${ev.uid}`
          if (byId.has(localId)) continue // kein Doppel-Eintrag via UID-Vergleich
          const startIso = icsUtcToIso(ev.dtstart) || ev.dtstart
          const endIso = (ev.dtend ? icsUtcToIso(ev.dtend) : '') || startIso
          const durMs = Date.parse(endIso) - Date.parse(startIso)
          const durationSeconds = Number.isFinite(durMs) && durMs > 0 ? Math.round(durMs / 1000) : null
          const entry: TimeEntry = {
            id: localId,
            user_id: 'local-user',
            title: ev.summary || 'Importiert',
            description: null,
            category: null,
            tags: null,
            started_at: startIso,
            ended_at: endIso,
            duration_seconds: durationSeconds,
            source: 'calendar',
            calendar_event_id: null,
            metadata: null,
            created_at: new Date().toISOString(),
            is_recurring: null,
            recurrence_rule: null,
            recurrence_parent_id: null,
            recurrence_index: null
          }
          byId.set(localId, entry)
          imported++
        }
        localStorage.setItem('chronomind_entries', JSON.stringify(Array.from(byId.values())))
        window.dispatchEvent(new CustomEvent(ENTRIES_CHANGED_EVENT))
        setNcStatus(`${imported} Ereignisse übernommen (${remote.length} remote, Duplikate übersprungen)`)
      } else {
        // app-wins / push-only: App-Daten als VEVENTs pushen (stabile UIDs)
        const ics = buildICS(loadEntries(), loadPlans())
        const blocks = ics.split('BEGIN:VEVENT').slice(1).map(b => 'BEGIN:VEVENT' + b)
        let pushed = 0
        for (const block of blocks) {
          const uid = block.match(/UID:(.+)/)?.[1]?.trim()
          if (!uid) continue
          await putRemoteEvent(
            cloudConfig,
            selectedCal,
            uid,
            `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//ChronoMind//Kalender-Abgleich//DE\r\nCALSCALE:GREGORIAN\r\n${block}\r\nEND:VCALENDAR\r\n`
          )
          pushed++
        }
        setNcStatus(`${pushed} Ereignisse gepusht (${strategy === 'app-wins' ? 'überschrieben' : 'nur App-Daten'})`)
      }
      toast.success('Abgleich abgeschlossen')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Abgleich fehlgeschlagen')
    } finally {
      setNcBusy(false)
    }
  }

  const formatEventTime = (isoString: string) => {
    const d = new Date(isoString)
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) +
      ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  const ncAvailable = useMemo(() => cloudConfig?.provider === 'nextcloud', [cloudConfig])

  return (
    <AppLayout>
      <div className="container mx-auto max-w-4xl py-6 px-4 sm:py-8">

        {/* Export-Karte – sofort beim Oeffnen erzeugt, automatisch aktuell gehalten */}
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-6 mb-8">
          <h2 className="text-lg font-semibold mb-1">Kalender-Datei</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Wird automatisch aktuell gehalten ({entryCount} Einträge &amp; Pläne als VEVENT).
          </p>
          <Button onClick={handleDownload} disabled={!icsUrl} className="w-full sm:w-auto">
            <DownloadIcon className="h-4 w-4 mr-1" />
            Kalender-Datei exportieren (.ics)
          </Button>
        </div>

        {/* Optionale Nextcloud-Verknuepfung */}
        {ncAvailable && (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-6 mb-8">
            <h2 className="text-lg font-semibold mb-1">Nextcloud-Verknüpfung</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Optional: Kalender in der Nextcloud anlegen, wählen und abgleichen.
            </p>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="nc-new-cal">Neuen Kalender anlegen</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="nc-new-cal"
                    value={newCalName}
                    onChange={e => setNewCalName(e.target.value)}
                    placeholder="Chronomind"
                  />
                  <Button variant="outline" onClick={handleCreateNcCalendar} disabled={ncBusy}>
                    Anlegen
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="nc-cal-select">Bestehender Kalender</Label>
                <Select value={selectedCal} onValueChange={setSelectedCal}>
                  <SelectTrigger id="nc-cal-select" className="mt-1">
                    <SelectValue placeholder="Kalender wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {ncCalendars.map(c => (
                      <SelectItem key={c.url} value={c.url}>{c.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="nc-strategy">Konfliktverhalten</Label>
                <Select value={strategy} onValueChange={v => setStrategy(v as ConflictStrategy)}>
                  <SelectTrigger id="nc-strategy" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CONFLICT_LABELS) as ConflictStrategy[]).map(k => (
                      <SelectItem key={k} value={k}>{CONFLICT_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleNcSync} disabled={ncBusy || !selectedCal} className="w-full sm:w-auto">
                <RefreshCwIcon className="h-4 w-4 mr-1" />
                {ncBusy ? 'Abgleich...' : 'Jetzt abgleichen'}
              </Button>

              {ncStatus && <p className="text-sm text-muted-foreground">{ncStatus}</p>}
            </div>
          </div>
        )}

        {/* Webcal-Kalender (bestehende Verwaltung) */}
        <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold">Webcal-Kalender</h2>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Abbrechen' : '+ Kalender'}
            </Button>
            {calendars.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                <RefreshCwIcon className="h-4 w-4 mr-1" />
                {syncing ? 'Sync...' : 'Sync'}
              </Button>
            )}
          </div>
        </div>

        {showForm && (
          <div className="mb-6 p-4 rounded-2xl border border-outline-variant bg-surface-container-low">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="cal-name">Name</Label>
                <Input
                  id="cal-name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="z.B. Arbeit, Privat"
                />
              </div>
              <div>
                <Label htmlFor="cal-url">WebCal URL</Label>
                <Input
                  id="cal-url"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="webcal://example.com/calendar.ics"
                />
              </div>
              <Button onClick={handleAddCalendar}>Kalender hinzufügen</Button>
            </div>
          </div>
        )}

        {calendars.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Keine Webcal-Kalender verbunden</p>
            <p className="text-sm">Füge einen WebCal-Kalender hinzu, um Ereignisse zu synchronisieren.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {calendars.map(cal => (
              <div key={cal.id} className="p-4 rounded-2xl border border-outline-variant bg-surface-container-low">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: cal.color || '#3b82f6' }} />
                    <div>
                      <div className="font-medium">{cal.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {cal.last_synced_at
                          ? `Zuletzt sync: ${new Date(cal.last_synced_at).toLocaleString('de-DE')}`
                          : 'Noch nie synchronisiert'}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCalendar(cal.id)}
                    className="h-10 w-10 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {events.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Anstehende Ereignisse</h2>
            <div className="space-y-2">
              {events
                .filter(e => {
                  const start = new Date(e.started_at)
                  const now = new Date()
                  return start >= now && start <= new Date(now.getTime() + 7 * 86400000)
                })
                .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
                .slice(0, 10)
                .map(event => (
                  <div key={event.id} className="flex items-center justify-between p-3 rounded-xl border border-outline-variant bg-surface-container-low">
                    <div>
                      <div className="font-medium">{event.title}</div>
                      {event.description && (
                        <div className="text-sm text-muted-foreground">{event.description}</div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatEventTime(event.started_at)}
                      {event.ended_at && ` - ${new Date(event.ended_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
