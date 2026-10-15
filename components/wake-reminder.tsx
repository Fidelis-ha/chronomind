'use client'

// Wake-Reminder: Läuft eine Zeiterfassung und die App war >= 5 min nicht
// sichtbar (Sperre/Hintergrund), meldet sie sich beim Wiederaufwachen:
// System-Push + direkter Dialog mit Auswahl der häufigsten Aktivitäten
// der letzten 7 Tage und allen Aktivitäten von heute.
// Auswahl = laufende Erfassung stoppt bis jetzt, neue startet ab jetzt.

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
  /** Treffer in den letzten 7 Tagen; null = nur heute gesehen */
  count: number | null
  isToday: boolean
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
  const nowMs = Date.now()
  const cutoff = nowMs - 7 * 24 * 60 * 60 * 1000
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfTodayMs = startOfToday.getTime()

  interface Stat { count: number; category: string | null; lastStart: number }
  const stats = new Map<string, Stat>()
  const todayLastStart = new Map<string, number>()

  for (const e of loadEntries()) {
    if (!e.title) continue
    const t = e.started_at ? new Date(e.started_at).getTime() : 0
    if (t <= 0) continue
    if (t >= startOfTodayMs) {
      const prev = todayLastStart.get(e.title) ?? 0
      if (t > prev) todayLastStart.set(e.title, t)
    }
    if (t < cutoff) continue
    const prev = stats.get(e.title)
    const count = (prev?.count ?? 0) + 1
    const lastStart = Math.max(prev?.lastStart ?? 0, t)
    const category = !prev || t > prev.lastStart ? e.category : prev.category
    stats.set(e.title, { count, category, lastStart })
  }

  const top = Array.from(stats.entries())
    .map(([title, s]) => ({ title, category: s.category, count: s.count, lastStart: s.lastStart }))
    .sort((a, b) => b.count - a.count || b.lastStart - a.lastStart)
    .slice(0, 10)
    .map<Suggestion>(s => ({ title: s.title, category: s.category, count: s.count, isToday: todayLastStart.has(s.title) }))

  const topTitles = new Set(top.map(s => s.title))
  const extras = Array.from(todayLastStart.entries())
    .filter(([title]) => !topTitles.has(title))
    .sort((a, b) => b[1] - a[1])
    .map<Suggestion>(([title]) => {
      const stat = stats.get(title)
      return { title, category: stat?.category ?? null, count: null, isToday: true }
    })

  return [...top, ...extras]
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

  useEffect(() => {
    if (typeof window === 'undefined') return

    const evaluate = () => {
      // Zeitstempel verbrauchen, damit er nicht doppelt feuert
      const raw = localStorage.getItem(LAST_HIDDEN_KEY)
      localStorage.removeItem(LAST_HIDDEN_KEY)
      const hiddenAt = raw ? Number(raw) : 0
      if (!hiddenAt) return
      if (Date.now() - hiddenAt < MIN_HIDDEN_MS) return
      const r = readRunning()
      if (!r) return
      setRunning(r)
      setSuggestions(buildSuggestions())
      setOpen(true)
      showPush(r)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        localStorage.setItem(LAST_HIDDEN_KEY, String(Date.now()))
      } else {
        evaluate()
      }
    }

    // App-Kill-Fall: beim nächsten Öffnen ist der Zeitstempel noch da
    if (document.visibilityState === 'visible') evaluate()
    document.addEventListener('visibilitychange', onVisibility)

    // Push-Berechtigung einmalig bei erster Nutzer-Interaktion anfragen
    // (Android braucht eine User-Geste; nach dem Aufwachen gibt es keine)
    let removeAsk: (() => void) | null = null
    if ('Notification' in window && Notification.permission === 'default') {
      const ask = () => {
        window.removeEventListener('pointerdown', ask)
        removeAsk = null
        Notification.requestPermission().catch(() => { /* ignorieren */ })
      }
      window.addEventListener('pointerdown', ask, { once: true })
      removeAsk = () => window.removeEventListener('pointerdown', ask)
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      removeAsk?.()
    }
  }, [])

  // Ticking des laufenden Timers, solange der Dialog offen ist
  useEffect(() => {
    if (!open || !running) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [open, running])

  const selectActivity = (s: Suggestion) => {
    const current = runningRef.current
    setOpen(false)
    if (!current) return
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
    const same =
      s.title === current.title && (s.category ?? null) === (current.category ?? null)
    if (!same) {
      const next: RunningEntry = { title: s.title, category: s.category, started_at: endIso }
      localStorage.setItem(RUNNING_ENTRY_KEY, JSON.stringify(next))
      markDirty() // laufender Timer wäre beim Schließen verloren -> Warnung nötig
      toast(`Jetzt: ${s.title}`, { icon: '▶️' })
    } else {
      // Nur stoppen: laufenden Timer beenden, keinen neuen starten
      localStorage.removeItem(RUNNING_ENTRY_KEY)
      toast.success(`${current.title} · ${fmtMin(duration)}`)
    }
    // QuickTap & Co. im selben Tab informieren (storage-Event feuert nicht lokal)
    window.dispatchEvent(new Event(RUNNING_CHANGED_EVENT))
  }

  if (!open || !running) return null

  const same = (s: Suggestion) =>
    s.title === running.title && (s.category ?? null) === (running.category ?? null)

  const row = (s: Suggestion) => (
    <button
      key={`${s.title}|${s.category ?? ''}`}
      onClick={() => selectActivity(s)}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 min-h-[48px] text-left transition-colors duration-200 ${
        same(s)
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
      {same(s) ? (
        <span className="shrink-0 text-[11px] font-semibold text-primary">läuft · nur stoppen</span>
      ) : s.count !== null ? (
        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">×{s.count}</span>
      ) : (
        <span className="shrink-0 text-[11px] font-semibold text-primary">heute</span>
      )}
    </button>
  )

  const frequent = suggestions.filter(s => s.count !== null)
  const todayOnly = suggestions.filter(s => s.count === null)

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/[0.32] animate-m3-fade-in"
        onClick={() => setOpen(false)}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[28px] bg-surface-container-low p-5 pb-8 shadow-lg animate-m3-fade-in">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-outline-variant" />
        <h2 className="text-base font-semibold leading-snug">
          Zeiterfassung für „{running.title}“ läuft noch
          <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
            seit {fmtElapsed(running.started_at, now)}
          </span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Machst du jetzt etwas anderes?
        </p>

        {frequent.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Häufig · letzte 7 Tage
            </div>
            <div className="flex flex-col gap-1.5">{frequent.map(row)}</div>
          </div>
        )}

        {todayOnly.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Heute
            </div>
            <div className="flex flex-col gap-1.5">{todayOnly.map(row)}</div>
          </div>
        )}

        <button
          onClick={() => setOpen(false)}
          className="mt-5 min-h-[48px] w-full rounded-full border border-outline-variant px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-on-surface/[0.08] active:bg-on-surface/[0.12]"
        >
          Nein, läuft weiter
        </button>
      </div>
    </div>
  )
}
