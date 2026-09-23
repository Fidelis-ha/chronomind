'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { type TimeEntry } from '@/lib/types'
import { nanoid } from '@/lib/utils'

interface QuickEntryProps {
  onCreate: (entry: TimeEntry) => void
  recentTitles?: string[]
}

// ── Parser: Eine Zeile → Zeiteintrag ─────────────────────────────────────────
// Beispiele:
//   14:30-15:45 Projektarbeit @Arbeit        → heute, Start-Ende
//   9-11:30 Kaffee mit Anna                  → heute 09:00-11:30
//   08:30+1:45 Mails                         → heute 08:30 bis 10:15
//   +45m Pause                               → letzte 45 Minuten (bis jetzt)
//   gestern 10-12 Büro @Projekt              → gestern
//   #tag1 #tag2 trefft dich? Tags via #wort
// Datum-Präfixe: heute (Standard), gestern, vorgestern, TT.MM. oder TT.MM.JJJJ

interface ParsedEntry {
  title: string
  category: string | null
  tags: string[]
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  dateLabel: string
}

function parseTimeToken(t: string): { h: number; m: number } | null {
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?$/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  if (h > 23 || min > 59) return null
  return { h, m: min }
}

function parseDurationToken(t: string): number | null {
  // 45m, 1h, 1:30, 90min, 2h30
  let m = t.match(/^(\d{1,2}):(\d{2})$/)
  if (m) return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60
  m = t.match(/^(\d+(?:[.,]\d+)?)\s*(h|std|stunden?|m|min|minuten?)$/i)
  if (m) {
    const n = parseFloat(m[1].replace(',', '.'))
    return /^h|std|stunden?$/i.test(m[2]) ? Math.round(n * 3600) : Math.round(n * 60)
  }
  m = t.match(/^(\d+)h(\d{1,2})$/i)
  if (m) return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60
  return null
}

function applyDate(base: Date, dateToken: string | null): Date {
  const d = new Date(base)
  if (!dateToken) return d
  const now = new Date()
  const t = dateToken.toLowerCase()
  if (t === 'gestern') d.setDate(now.getDate() - 1)
  else if (t === 'vorgestern') d.setDate(now.getDate() - 2)
  else {
    const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})?$/)
    if (m) {
      const year = m[3]
        ? (m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10))
        : now.getFullYear()
      d.setFullYear(year, parseInt(m[2], 10) - 1, parseInt(m[1], 10))
    }
  }
  return d
}

export function parseQuickEntry(input: string): ParsedEntry | { error: string } {
  const now = new Date()
  let text = input.trim()
  if (!text) return { error: 'Leer' }

  // Datum-Präfix extrahieren
  let dateToken: string | null = null
  const dateMatch = text.match(/^(gestern|vorgestern|\d{1,2}\.\d{1,2}\.(?:\d{2,4})?)\s+/i)
  if (dateMatch) {
    dateToken = dateMatch[1]
    text = text.slice(dateMatch[0].length)
  }

  // Tags @Kategorie #tag
  const tags: string[] = []
  let category: string | null = null
  const tagRegex = /(?:^|\s)([@#])([\wäöüÄÖÜß-]+)/g
  let tagMatch: RegExpExecArray | null
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    if (tagMatch[1] === '@') category = tagMatch[2]
    else tags.push(tagMatch[2])
  }
  text = text.replace(tagRegex, '').replace(/\s+/g, ' ').trim()

  // Zeitmuster extrahieren
  // Muster A: 14:30-15:45 | 9-11:30 | 22:00-01:00 | 9 bis 17
  const rangeMatch = text.match(/^(\d{1,2}(?::\d{2})?)\s*(?:-|–|bis\s+)\s*(\d{1,2}(?::\d{2})?|\d{1,2}h\d{1,2}|\d+(?:[.,]\d+)?\s*(?:h|std|m|min)?)\s+(.+)$/i)
  // Muster A2: 08:30+1:45 → Start + Dauer
  const startDurMatch = text.match(/^(\d{1,2}(?::\d{2})?)\s*\+\s*(\d{1,2}(?::\d{2})|\d{1,2}h\d{1,2}|\d+(?:[.,]\d+)?\s*(?:h|std|m|min))\s+(.+)$/i)
  // Muster B: +45m Titel | 45m Titel | 1:30 Titel
  const durMatch = text.match(/^(?:\+)?(\d{1,2}(?::\d{2})?|\d+(?:[.,]\d+)?\s*(?:h|std|m|min)|\d+h\d{1,2})\s+(.+)$/i)

  let startH: number, startM: number, endH: number | null = null, endM: number | null = null, duration: number | null = null, title = ''

  if (startDurMatch) {
    const s = parseTimeToken(startDurMatch[1])
    if (!s) return { error: `Ungültige Startzeit: ${startDurMatch[1]}` }
    const d = parseDurationToken(startDurMatch[2])
    if (d === null || d <= 0) return { error: `Ungültige Dauer: ${startDurMatch[2]}` }
    startH = s.h; startM = s.m
    duration = d
    title = startDurMatch[3].trim()
  } else if (rangeMatch) {
    const s = parseTimeToken(rangeMatch[1])
    if (!s) return { error: `Ungültige Startzeit: ${rangeMatch[1]}` }
    startH = s.h; startM = s.m
    const dTok = parseDurationToken(rangeMatch[2])
    if (dTok !== null && !rangeMatch[2].includes(':')) {
      duration = dTok
    } else {
      const e = parseTimeToken(rangeMatch[2])
      if (!e) return { error: `Ungültige Endzeit: ${rangeMatch[2]}` }
      endH = e.h; endM = e.m
    }
    title = rangeMatch[3].trim()
  } else if (durMatch) {
    const d = parseDurationToken(durMatch[1])
    if (d === null || d <= 0) return { error: `Ungültige Dauer: ${durMatch[1]}` }
    duration = d
    title = durMatch[2].trim()
    // Ende = jetzt, Start = jetzt - Dauer
    const endD = applyDate(now, dateToken)
    if (dateToken) {
      // Bei Datum-Präfix: Ende 18:00 annehmen? Nein - aktueller Zeitpunkt des Tages 23:59 unmöglich;
      // besser: Dauer rückwärts ab jetzt am gewählten Tag
      startH = endD.getHours(); startM = endD.getMinutes()
    } else {
      startH = endD.getHours(); startM = endD.getMinutes()
    }
    const startDate = new Date(endD.getTime() - d * 1000)
    const dateLabel = dateToken || 'heute'
    const started_at = new Date(startDate)
    started_at.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0)
    return {
      title,
      category,
      tags,
      started_at: started_at.toISOString(),
      ended_at: endD.toISOString(),
      duration_seconds: d,
      dateLabel
    }
  } else {
    return { error: 'Zeit fehlt. Beispiel: 14:30-15:45 Titel oder +45m Titel' }
  }

  if (!title) return { error: 'Titel fehlt' }

  const startDate = applyDate(now, dateToken)
  startDate.setHours(startH, startM, 0, 0)
  let endDate: Date | null = null
  let duration_seconds: number | null = null
  if (endH !== null && endM !== null) {
    endDate = applyDate(now, dateToken)
    endDate.setHours(endH, endM, 0, 0)
    if (endDate <= startDate) {
      // Über Mitternacht: z.B. 22-01 → Ende nächster Tag
      endDate.setDate(endDate.getDate() + 1)
    }
    duration_seconds = Math.round((endDate.getTime() - startDate.getTime()) / 1000)
  } else if (duration !== null) {
    endDate = new Date(startDate.getTime() + duration * 1000)
    duration_seconds = duration
  }

  return {
    title,
    category,
    tags,
    started_at: startDate.toISOString(),
    ended_at: endDate ? endDate.toISOString() : null,
    duration_seconds,
    dateLabel: dateToken || 'heute'
  }
}

function formatDuration(sec: number | null): string {
  if (sec === null) return 'läuft'
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function QuickEntry({ onCreate, recentTitles = [] }: QuickEntryProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Taste "n" fokussiert die Schnelleingabe (wenn kein Feld fokussiert)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const active = document.activeElement
        const isTyping = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement
        if (!isTyping) {
          e.preventDefault()
          inputRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const parsed = input.trim() ? parseQuickEntry(input) : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!parsed || 'error' in parsed) {
      toast.error(parsed && 'error' in parsed ? parsed.error : 'Eingabe unvollständig')
      return
    }
    const now = new Date()
    const entry: TimeEntry = {
      id: nanoid(),
      user_id: 'local-user',
      title: parsed.title,
      description: null,
      category: parsed.category,
      tags: parsed.tags.length ? parsed.tags : null,
      started_at: parsed.started_at,
      ended_at: parsed.ended_at,
      duration_seconds: parsed.duration_seconds,
      source: 'manual',
      calendar_event_id: null,
      metadata: null,
      created_at: now.toISOString(),
      is_recurring: null,
      recurrence_rule: null,
      recurrence_parent_id: null,
      recurrence_index: null
    }
    onCreate(entry)
    toast.success(`${parsed.title} (${formatDuration(parsed.duration_seconds)}) gespeichert`)
    setInput('')
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Schnelleingabe: 14:30-15:45 Projektarbeit @Arbeit   oder   +45m Pause   (Taste n zum Fokussieren)"
          className="flex-1 border rounded-md px-3 py-2 text-sm bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          autoComplete="off"
          autoFocus
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          Hinzufügen
        </button>
      </div>
      {parsed && !('error' in parsed) && (
        <div className="mt-2 text-xs text-muted-foreground px-1">
          ✓ {parsed.dateLabel}: {parsed.title}
          {parsed.category ? ` @${parsed.category}` : ''}
          {parsed.tags.length ? ` #${parsed.tags.join(' #')}` : ''}
          {' '}· {formatDuration(parsed.duration_seconds)}
        </div>
      )}
      {parsed && 'error' in parsed && (
        <div className="mt-2 text-xs text-destructive px-1">{parsed.error}</div>
      )}
      {recentTitles.length > 0 && !input && (
        <div className="mt-2 flex flex-wrap gap-1.5 px-1">
          {recentTitles.slice(0, 6).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setInput(`+30m ${t}`)}
              className="text-xs border rounded-full px-2.5 py-0.5 text-muted-foreground hover:bg-accent"
              title="Als +30m-Eintrag übernehmen"
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </form>
  )
}
