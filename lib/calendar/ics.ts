// ICS-Erzeugung aus Zeiteintraegen + Plaenen (clientseitig, localStorage-Daten).
// Zeitformat: UTC ('Z') – konsistent fuer alle VEVENTs, stabile UIDs.

import { type TimeEntry } from '@/lib/types'
import { type TimePlan } from '@/lib/plans'

export const ENTRY_UID_SUFFIX = '@chronomind'
export const PLAN_UID_SUFFIX = '@chronomind-plan'

/** Escaping laut RFC 5545 (Backslash zuerst, dann Komma/Semikolon/Newline) */
export function escIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Date -> ICS UTC-Zeitstempel (YYYYMMDDTHHMMSSZ) */
export function icsUtc(date: Date): string {
  return (
    date.getUTCFullYear().toString().padStart(4, '0') +
    String(date.getUTCMonth() + 1).padStart(2, '0') +
    String(date.getUTCDate()).padStart(2, '0') +
    'T' +
    String(date.getUTCHours()).padStart(2, '0') +
    String(date.getUTCMinutes()).padStart(2, '0') +
    String(date.getUTCSeconds()).padStart(2, '0') +
    'Z'
  )
}

/** Zeilen auf max. 75 Oktets falten (RFC 5545 3.1) */
function foldLine(line: string): string[] {
  if (line.length <= 73) return [line]
  const parts: string[] = []
  let rest = line
  while (rest.length > 73) {
    parts.push(rest.slice(0, 73))
    rest = ' ' + rest.slice(73)
  }
  parts.push(rest)
  return parts
}

function eventLines(uid: string, summary: string, description: string, start: Date, end: Date): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsUtc(new Date(start.getTime()))}`,
    `DTSTART:${icsUtc(start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${escIcs(summary)}`,
    ...(description ? [`DESCRIPTION:${escIcs(description)}`] : []),
    'END:VEVENT'
  ]
}

function entryEvent(e: TimeEntry): string[] | null {
  if (!e.started_at) return null
  const start = new Date(e.started_at)
  if (Number.isNaN(start.getTime())) return null
  let end: Date
  if (e.ended_at) {
    end = new Date(e.ended_at)
    if (Number.isNaN(end.getTime())) end = start
  } else {
    end = new Date(start.getTime() + (e.duration_seconds ?? 0) * 1000)
  }
  if (end.getTime() < start.getTime()) end = start
  return eventLines(
    `${e.id}${ENTRY_UID_SUFFIX}`,
    e.title || 'Zeiteintrag',
    e.category || '',
    start,
    end
  )
}

function planEvent(p: TimePlan): string[] | null {
  const start = new Date(p.started_at)
  const end = new Date(p.ended_at)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  return eventLines(
    `${p.id}${PLAN_UID_SUFFIX}`,
    p.title || 'Plan',
    p.category || '',
    start,
    end
  )
}

/** VCALENDAR-Text aus Eintraegen + Plaenen (Plaene ebenfalls als VEVENT) */
export function buildICS(entries: TimeEntry[], plans: TimePlan[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ChronoMind//Kalender-Export//DE',
    'CALSCALE:GREGORIAN'
  ]
  for (const e of entries) {
    const ev = entryEvent(e)
    if (ev) lines.push(...ev)
  }
  for (const p of plans) {
    const ev = planEvent(p)
    if (ev) lines.push(...ev)
  }
  lines.push('END:VCALENDAR')
  return lines.flatMap(foldLine).join('\r\n') + '\r\n'
}
