import { type TimeEntry } from '@/lib/types'
import { type TimePlan } from '@/lib/plans'

/** Gemeinsames Block-Item für den Zeitstrahl (Einträge, Pläne, laufender Timer) */
export interface TlItem {
  id: string
  kind: 'entry' | 'plan' | 'timer'
  title: string
  category: string | null
  startMs: number
  endMs: number
}

export interface Range {
  start: number
  end: number
}

export interface Collision {
  kind: 'entry' | 'plan'
  id: string
  mode: 'delete' | 'trim-start' | 'trim-end' | 'split'
  newStartMs?: number
  newEndMs?: number
  message: string
}

const MIN = 60000

/** Start des lokalen Tages in ms */
export function dayStartMs(ms: number): number {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** '07:20' aus ms (lokale Zeit) */
export function fmtHM(ms: number): string {
  return new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

/** '2026-09-25' für input type=date */
export function toDateInputValue(ms: number): string {
  const d = new Date(ms)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Textfarbe mit genug Kontrast zur Kategorie-Farbe */
export function textColorFor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#ffffff'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1f2937' : '#ffffff'
}

/** Auf Zellgrenze abrunden (minuten-genau) */
export function snapDownMin(min: number, cell: number): number {
  return Math.max(0, Math.floor(min / cell) * cell)
}

/** Auf 5 Minuten runden */
export function snap5Min(min: number): number {
  return Math.round(min / 5) * 5
}

/**
 * Kollisionen einer neuen Markierung [startMs, endMs) mit bestehenden Einträgen und Plänen.
 * Liefert pro Kollision einen konkreten Zuschnitt-Text und die nötige Operation (5-min-genau).
 */
export function computeCollisions(
  startMs: number,
  endMs: number,
  entries: TimeEntry[],
  plans: TimePlan[]
): Collision[] {
  const out: Collision[] = []
  const consider = (kind: 'entry' | 'plan', id: string, os: number, oe: number) => {
    if (!isFinite(os) || !isFinite(oe) || oe <= startMs || os >= endMs) return
    const label = kind === 'entry' ? 'Der bestehende Eintrag' : 'Der Plan'
    const oldRange = `${fmtHM(os)}–${fmtHM(oe)}`
    if (startMs <= os && endMs >= oe) {
      out.push({ kind, id, mode: 'delete', message: `${label} ${oldRange} wird gelöscht.` })
    } else if (startMs > os && endMs >= oe) {
      out.push({
        kind,
        id,
        mode: 'trim-end',
        newEndMs: startMs,
        message: `${label} ${oldRange} wird auf ${fmtHM(os)}–${fmtHM(startMs)} zugeschnitten.`
      })
    } else if (startMs <= os && endMs < oe) {
      out.push({
        kind,
        id,
        mode: 'trim-start',
        newStartMs: endMs,
        message: `${label} ${oldRange} wird auf ${fmtHM(endMs)}–${fmtHM(oe)} zugeschnitten.`
      })
    } else {
      out.push({
        kind,
        id,
        mode: 'split',
        newStartMs: endMs,
        newEndMs: startMs,
        message: `${label} ${oldRange} wird in zwei Teile gespalten: ${fmtHM(os)}–${fmtHM(startMs)} und ${fmtHM(endMs)}–${fmtHM(oe)}.`
      })
    }
  }
  for (const e of entries) {
    if (!e.started_at) continue
    const os = Date.parse(e.started_at)
    // Konsistent mit dem Rendering (allItems): Einträge ohne ended_at als 60-Minuten-Block ab Start
    const oe = e.ended_at ? Date.parse(e.ended_at) : os + 60 * MIN
    consider('entry', e.id, os, oe)
  }
  for (const p of plans) {
    consider('plan', p.id, Date.parse(p.started_at), Date.parse(p.ended_at))
  }
  return out
}

/** Überlappende Items per Greedy in Spuren legen; laneCount = Spurenzahl der Überlappungs-Gruppe */
export function layoutLanes<T extends { startMs: number; endMs: number }>(
  items: T[]
): (T & { lane: number; laneCount: number })[] {
  const sorted = [...items].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)
  const laneEnds: number[] = []
  const laneOf = new Map<T, number>()
  for (const it of sorted) {
    let lane = laneEnds.findIndex(end => end <= it.startMs)
    if (lane === -1) {
      laneEnds.push(it.endMs)
      lane = laneEnds.length - 1
    } else {
      laneEnds[lane] = it.endMs
    }
    laneOf.set(it, lane)
  }
  const out: (T & { lane: number; laneCount: number })[] = []
  let cluster: T[] = []
  let clusterMaxEnd = -Infinity
  const flush = () => {
    if (!cluster.length) return
    const count = cluster.reduce((max, it) => Math.max(max, (laneOf.get(it) ?? 0) + 1), 1)
    for (const it of cluster) out.push({ ...it, lane: laneOf.get(it) ?? 0, laneCount: count })
    cluster = []
    clusterMaxEnd = -Infinity
  }
  for (const it of sorted) {
    if (cluster.length && it.startMs >= clusterMaxEnd) flush()
    cluster.push(it)
    clusterMaxEnd = Math.max(clusterMaxEnd, it.endMs)
  }
  flush()
  return out
}

/** Häufigste Kategorien der letzten 7 Tage (gleiche Logik wie QuickTap-Chips) */
export function computeFrequentChips(
  entries: TimeEntry[],
  knownMainNames: string[]
): { path: string; count: number }[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  const counts = new Map<string, number>()
  const knownMains = new Set(knownMainNames.map(n => n.trim().toLowerCase()))
  for (const e of entries) {
    if (!e.category) continue
    const first = e.category.split('/')[0]?.trim().toLowerCase() || ''
    if (!e.category.includes('/') && !knownMains.has(first)) continue
    const t = e.started_at ? Date.parse(e.started_at) : 0
    if (t < cutoff) continue
    counts.set(e.category, (counts.get(e.category) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
}

export const MIN_DURATION_MS = 5 * MIN
