'use client'

import { useState } from 'react'
import { type Calendar, type CalendarEvent } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'react-hot-toast'
import { CalendarIcon, TrashIcon, RefreshCwIcon } from 'lucide-react'

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

export default function CalendarPage() {
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

  const getUpcomingEvents = () => {
    const now = new Date()
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return events
      .filter(e => {
        const start = new Date(e.started_at)
        return start >= now && start <= weekLater
      })
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
      .slice(0, 10)
  }

  const formatEventTime = (isoString: string) => {
    const d = new Date(isoString)
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) +
      ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kalender</h1>
        <div className="flex gap-2">
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
        <div className="mb-6 p-4 border rounded-lg bg-card">
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
          <p>Keine Kalender verbunden</p>
          <p className="text-sm">Füge einen WebCal-Kalender hinzu, um Ereignisse zu synchronisieren.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {calendars.map(cal => (
            <div key={cal.id} className="p-4 border rounded-lg">
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
                  className="text-destructive"
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
            {getUpcomingEvents().map(event => (
              <div key={event.id} className="flex items-center justify-between p-3 border rounded">
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
  )
}