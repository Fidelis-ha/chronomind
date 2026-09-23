'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { type TimeEntry } from '@/lib/types'
import { nanoid } from '@/lib/utils'

interface QuickTapProps {
  onCreate: (entry: TimeEntry) => void
  recentTitles?: string[]
}

interface RunningEntry {
  title: string
  category: string | null
  started_at: string
}

const STORAGE_KEY = 'chronomind-running-entry'

const DEFAULT_ACTIVITIES: { title: string; icon: string }[] = [
  { title: 'Arbeit', icon: '💼' },
  { title: 'Meeting', icon: '👥' },
  { title: 'Pause', icon: '☕' },
  { title: 'Projekt', icon: '📋' },
  { title: 'Sonstiges', icon: '📌' },
  { title: 'Fahren', icon: '🚗' }
]

const ACTIVITY_ICONS: Record<string, string> = {
  Arbeit: '💼', Meeting: '👥', Pause: '☕', Projekt: '📋',
  Sonstiges: '📌', Fahren: '🚗', Büro: '🏢', Telefon: '📞',
  Einkaufshilfe: '🛒', Freizeit: '🌳', Sport: '🏃', Hausarbeit: '🏠'
}

function iconFor(title: string): string {
  const t = title.toLowerCase()
  for (const [k, v] of Object.entries(ACTIVITY_ICONS)) {
    if (t.includes(k.toLowerCase())) return v
  }
  return '⏱️'
}

function fmtElapsed(startIso: string, now: number): string {
  const sec = Math.max(0, Math.floor((now - new Date(startIso).getTime()) / 1000))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function fmtSaved(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function QuickTap({ onCreate, recentTitles = [] }: QuickTapProps) {
  const [running, setRunning] = useState<RunningEntry | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const onCreateRef = useRef(onCreate)
  onCreateRef.current = onCreate

  // Laufenden Eintrag beim Start laden (überlebt Reload)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setRunning(JSON.parse(raw))
    } catch { /* ignorieren */ }
  }, [])

  // Timer ticken
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [running])

  const finishRunning = (endIso: string): RunningEntry | null => {
    if (!running) return null
    const start = new Date(running.started_at)
    const end = new Date(endIso)
    const duration = Math.max(60, Math.round((end.getTime() - start.getTime()) / 1000))
    const entry: TimeEntry = {
      id: nanoid(),
      user_id: 'local-user',
      title: running.title,
      description: null,
      category: running.category,
      tags: null,
      started_at: running.started_at,
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
    onCreateRef.current(entry)
    toast.success(`${running.title} · ${fmtSaved(duration)}`)
    localStorage.removeItem(STORAGE_KEY)
    return running
  }

  const handleTap = (title: string) => {
    const nowIso = new Date().toISOString()
    const wasRunning = finishRunning(nowIso)

    // Gleiche Aktivität nochmal getippt → nur stoppen
    if (wasRunning && wasRunning.title === title) {
      setRunning(null)
      return
    }

    // Neue Aktivität starten
    const isDefault = DEFAULT_ACTIVITIES.some(a => a.title === title)
    const next: RunningEntry = {
      title,
      category: isDefault ? title : null,
      started_at: nowIso
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setRunning(next)
    setNow(Date.now())
    if (wasRunning) toast(`Jetzt: ${title}`, { icon: '▶️' })
  }

  const handleStop = () => {
    finishRunning(new Date().toISOString())
    setRunning(null)
  }

  // Kacheln: häufige Titel zuerst, dann Defaults (ohne Duplikate)
  const activityTitles = [
    ...recentTitles.slice(0, 4),
    ...DEFAULT_ACTIVITIES.map(a => a.title)
  ]
  const tiles = Array.from(new Set(activityTitles)).slice(0, 10)

  return (
    <div className="mb-6">
      {/* Laufender Timer */}
      {running && (
        <div className="mb-4 p-4 rounded-xl border-2 border-primary bg-primary/5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground mb-0.5">Läuft gerade</div>
              <div className="font-semibold text-lg truncate">{running.title}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-bold tabular-nums">
                {fmtElapsed(running.started_at, now)}
              </div>
              <button
                onClick={handleStop}
                className="mt-1 w-full px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold active:scale-95 transition-transform"
              >
                ■ Fertig
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aktivitäts-Kacheln */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {tiles.map(title => {
          const active = running?.title === title
          return (
            <button
              key={title}
              onClick={() => handleTap(title)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-4 transition-transform active:scale-95 ${
                active
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border bg-card hover:bg-accent'
              }`}
            >
              <span className="text-2xl leading-none">{iconFor(title)}</span>
              <span className="text-sm font-medium text-center leading-tight">{title}</span>
              {active && <span className="text-[10px] text-primary font-semibold">● läuft</span>}
            </button>
          )
        })}
      </div>

      <p className="mt-2 text-xs text-muted-foreground px-1">
        Antippen = Start · Nochmal tippen = Ende & nächster Start · Fertig-Button = nur Ende
      </p>
    </div>
  )
}
