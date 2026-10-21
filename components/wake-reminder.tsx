'use client'

// Wake-Reminder: Läuft eine Zeiterfassung und die App war >= 5 min nicht
// sichtbar (Sperre/Hintergrund), meldet sie sich beim Wiederaufwachen:
// System-Push + bildschirmfüllender Dialog mit allen bisherigen Titeln
// (sortiert nach letzter Aktivierung). Ziel der App ist durchgehende
// Zeiterfassung – Beenden ist bewusst nicht prominent: Klick auf den
// laufenden Eintrag lässt den Timer einfach weiterlaufen; Klick auf einen
// anderen Eintrag stoppt die laufende Erfassung bis jetzt und startet
// die neue ab jetzt.

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { type TimeEntry } from '@/lib/types'
import { nanoid } from '@/lib/utils'
import { colorForPath, lastSegment } from '@/lib/categories'
import { loadEntries, saveEntries } from '@/lib/entries-store'
import { markDirty } from '@/lib/dirty-state'
import { RUNNING_ENTRY_KEY, RUNNING_CHANGED_EVENT } from '@/lib/cloud-sync-payload'

const LAST_HIDDEN_KEY = 'chronomind-wake-last-hidden'
const MIN_HIDDEN_MS = 5 * 60 * 1000

interface RunningEntry {
  title: string
  category: string | null
  started_at: string
}

interface Suggestion {
  title: string
  category: string | null
}

function readRunning(): RunningEntry | null {
  try {
    const raw = localStorage.getItem(RUNNING_ENTRY_KEY)
    return raw ? (JSON.parse(raw) as RunningEntry) : null
  } catch {
    return null
  }
}

function fmtMin(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtElapsed(startIso: string, now: number): string {
  return fmtMin(Math.max(0, Math.floor((now - new Date(startIso).getTime()) / 1000)))
}

function buildSuggestions(): Suggestion[] {
  interface Stat { category: string | null; lastStart: number }
  const stats = new Map<string, Stat>()

  for (const e of loadEntries()) {
    if (!e.title) continue
    const t = e.started_at ? new Date(e.started_at).getTime() : 0
    if (t <= 0) continue
    const prev = stats.get(e.title)
    const category = !prev || t > prev.lastStart ? e.category : prev.category
    stats.set(e.title, { category, lastStart: Math.max(prev?.lastStart ?? 0, t) })
  }

  return Array.from(stats.entries())
    .map(([title, s]) => ({ title, category: s.category, lastStart: s.lastStart }))
    .sort((a, b) => b.lastStart - a.lastStart)
    .map<Suggestion>(({ title, category }) => ({ title, category }))
}

function showPush(running: RunningEntry): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  const body = `Zeiterfassung für „${running.title}“ läuft noch. Machst du jetzt etwas anderes?`
  const options: NotificationOptions & { badge?: string } = {
    body,
    tag: 'chronomind-wake',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // Damit der Tap die App öffnet, auch wenn sie ganz zu war
    data: { url: '/app_main' }
  }
  if (navigator.serviceWorker) {
    navigator.serviceWorker.ready
      .then(reg => reg.showNotification('Chronomind', options))
      .catch(() => {
        try { new Notification('Chronomind', options) } catch { /* ignorieren */ }
      })
  } else {
    try { new Notification('Chronomind', options) } catch { /* ignorieren */ }
  }
}

export function WakeReminder() {
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState<RunningEntry | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [now, setNow] = useState(() => Date.now())
  const runningRef = useRef<RunningEntry | null>(null)
  runningRef.current = running
  const openRef = useRef(false)
  openRef.current = open
  const pushedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const evaluate = () => {
      // Zeitstempel verbrauchen, damit er nicht doppelt feuert
      const raw = localStorage.getItem(LAST_HIDDEN_KEY)
      localStorage.removeItem(LAST_HIDDEN_KEY)
      const hiddenAt = raw ? Number(raw) : 0
      if (!hiddenAt) return
      if (Date.now() - hiddenAt < MIN_HIDDEN_MS) return
      // Bereits offen: kein zweiter history-Eintrag (sonst verlässt die
      // Zurücktaste nach dem Schliessen die App statt nur das Fenster zu schliessen)
      if (openRef.current) return
      const r = readRunning()
      if (!r) return
      setRunning(r)
      setSuggestions(buildSuggestions())
      setOpen(true)
      // Android-Zurücktaste soll das Fenster schliessen
      if (!pushedRef.current) {
        history.pushState({ chronomindWake: true }, '')
        pushedRef.current = true
      }
      showPush(r)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        localStorage.setItem(LAST_HIDDEN_KEY, String(Date.now()))
      } else {
        evaluate()
      }
    }

    // Zurücktaste: History-Eintrag konsumieren und Fenster schliessen
    const onPopState = () => {
      if (!openRef.current) return
      pushedRef.current = false
      setOpen(false)
    }

    // App-Kill-Fall: beim nächsten Öffnen ist der Zeitstempel noch da
    if (document.visibilityState === 'visible') evaluate()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('popstate', onPopState)
    // Hinweis: Berechtigungs-Anfrage (Notifications/Vibration) zentral in
    // components/permission-gate.tsx – hier keine doppelte Anfrage mehr.

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  // Ticking des laufenden Timers, solange der Dialog offen ist
  useEffect(() => {
    if (!open || !running) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [open, running])

  const close = () => {
    setOpen(false)
    if (pushedRef.current) {
      pushedRef.current = false
      history.back()
    }
  }

  const selectActivity = (s: Suggestion) => {
    const current = runningRef.current
    close()
    if (!current) return
    const same =
      s.title === current.title && (s.category ?? null) === (current.category ?? null)
    if (same) {
      // Laufende Erfassung läuft einfach weiter – nichts tun
      return
    }
    const endIso = new Date().toISOString()
    const end = new Date(endIso)
    const start = new Date(current.started_at)
    const duration = Math.max(60, Math.round((end.getTime() - start.getTime()) / 1000))
    const entry: TimeEntry = {
      id: nanoid(),
      user_id: 'local-user',
      title: current.title,
      description: null,
      category: current.category,
      tags: null,
      started_at: current.started_at,
      ended_at: end.toISOString(),
      duration_seconds: duration,
      source: 'manual',
      calendar_event_id: null,
      metadata: null,
      created_at: end.toISOString(),
      is_recurring: null,
      recurrence_rule: null,
      recurrence_parent_id: null,
      recurrence_index: null
    }
    saveEntries([entry, ...loadEntries()])
    const next: RunningEntry = { title: s.title, category: s.category, started_at: endIso }
    localStorage.setItem(RUNNING_ENTRY_KEY, JSON.stringify(next))
    markDirty() // laufender Timer wäre beim Schließen verloren -> Warnung nötig
    toast(`Jetzt: ${s.title}`, { icon: '▶️' })
    // QuickTap & Co. im selben Tab informieren (storage-Event feuert nicht lokal)
    window.dispatchEvent(new Event(RUNNING_CHANGED_EVENT))
  }

  if (!open || !running) return null

  const same = (s: Suggestion) =>
    s.title === running.title && (s.category ?? null) === (running.category ?? null)

  const row = (s: Suggestion, isRunning: boolean) => (
    <button
      key={`${s.title}|${s.category ?? ''}`}
      onClick={() => selectActivity(s)}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 min-h-[48px] text-left transition-colors duration-200 ${
        isRunning
          ? 'bg-primary/10 ring-1 ring-primary'
          : 'bg-surface-container-lowest hover:bg-on-surface/[0.08] active:bg-on-surface/[0.12]'
      }`}
    >
      <span
        className="w-3 h-3 rounded-full shrink-0 border border-black/10 dark:border-white/20"
        style={{ backgroundColor: (s.category && colorForPath(s.category)) || '#6b7280' }}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium truncate">{s.title}</span>
        {s.category && (
          <span className="block text-xs text-muted-foreground truncate">
            {lastSegment(s.category)}
          </span>
        )}
      </span>
      {isRunning && (
        <span className="shrink-0 text-[11px] font-medium text-muted-foreground">läuft</span>
      )}
    </button>
  )

  // Laufender Eintrag immer oben, auch wenn er noch kein gespeicherter Entry ist
  const rows: Array<{ s: Suggestion; isRunning: boolean }> = [
    { s: { title: running.title, category: running.category }, isRunning: true },
    ...suggestions
      .filter(s => !same(s))
      .map(s => ({ s, isRunning: false }))
  ]

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/[0.32] animate-m3-fade-in"
        onClick={close}
      />
      <div className="absolute inset-0 flex flex-col bg-surface-container-low p-5 pb-8 shadow-lg animate-m3-fade-in">
        <button
          onClick={close}
          aria-label="Schliessen"
          className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-on-surface/[0.08] active:bg-on-surface/[0.12]"
        >
          ✕
        </button>
        <h2 className="text-base font-semibold leading-snug">
          Zeiterfassung für „{running.title}“ läuft noch
          <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
            seit {fmtElapsed(running.started_at, now)}
          </span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Machst du jetzt etwas anderes?
        </p>

        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <div className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Letzte Zeiteinträge
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
            {rows.map(({ s, isRunning }) => row(s, isRunning))}
          </div>
        </div>
      </div>
    </div>
  )
}
