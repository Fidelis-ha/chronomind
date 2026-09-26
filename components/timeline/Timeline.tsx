'use client'

import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { type TimeEntry } from '@/lib/types'
import { nanoid } from '@/lib/utils'
import {
  loadCategories,
  lastSegment,
  CATEGORIES_CHANGED_EVENT,
  type MainCategory
} from '@/lib/categories'
import { loadEntries, saveEntries, ENTRIES_CHANGED_EVENT } from '@/lib/entries-store'
import {
  loadPlans,
  savePlans,
  addPlan,
  updatePlan,
  removePlan,
  PLANS_CHANGED_EVENT,
  type TimePlan
} from '@/lib/plans'
import { markDirty } from '@/lib/dirty-state'
import { RUNNING_ENTRY_KEY } from '@/lib/cloud-sync-payload'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { CategoryPickerDialog } from '@/components/categories/CategoryPickerDialog'
import {
  type TlItem,
  type Range,
  type Collision,
  dayStartMs,
  fmtHM,
  toDateInputValue,
  textColorFor,
  computeCollisions,
  layoutLanes,
  computeFrequentChips
} from './timeline-utils'

const DAY_WIDTH = 240
const HEADER_H = 32
const PAST_DAYS_INIT = 3650
const FUTURE_DAYS_INIT = 800
const EXTEND_DAYS = 365
const ZOOM_LEVELS = [30, 15, 5] as const
type CellMin = (typeof ZOOM_LEVELS)[number]
const PX_PER_MIN: Record<CellMin, number> = { 30: 1.2, 15: 2.4, 5: 7.2 }
const MIN_MS = 60000
const DAY_MS = 24 * 60 * MIN_MS

interface DragState {
  kind: 'entry' | 'plan'
  id: string
  edge: 'start' | 'end'
  day0: number
  startY: number
  origStartMs: number
  origEndMs: number
  curStartMs: number
  curEndMs: number
}

interface PopoverState {
  item: TlItem
  hover: boolean
  x: number
  y: number
}

interface PendingParts {
  past: Range | null
  future: Range | null
  colls: Collision[]
}

const WEEKDAY_FMT = new Intl.DateTimeFormat('de-DE', { weekday: 'short' })
const DAY_NUM_FMT = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' })

/** Clippt Items auf einen Tag und legt Überlappungen in Spuren */
function clipAndLayout(items: TlItem[], day0: number, day1: number) {
  const clipped = items
    .map(it => ({ ...it, startMs: Math.max(it.startMs, day0), endMs: Math.min(it.endMs, day1) }))
    .filter(it => it.endMs - it.startMs > 30000)
  return layoutLanes(clipped)
}

export function Timeline() {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [cellMin, setCellMin] = useState<CellMin>(30)
  const [pastDays, setPastDays] = useState(PAST_DAYS_INIT)
  const [futureDays, setFutureDays] = useState(FUTURE_DAYS_INIT)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [viewportW, setViewportW] = useState(0)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [plans, setPlans] = useState<TimePlan[]>([])
  const [categories, setCategories] = useState<MainCategory[]>([])
  const [running, setRunning] = useState<{ title: string; category: string | null; started_at: string } | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const [selStart, setSelStart] = useState<{ dayIdx: number; minute: number } | null>(null)
  const [pending, setPending] = useState<PendingParts | null>(null)
  const [selected, setSelected] = useState<{ kind: 'entry' | 'plan'; id: string } | null>(null)
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

  const [adoptState, setAdoptState] = useState<{ past: Range; future: Range } | null>(null)
  const [collisionState, setCollisionState] = useState<PendingParts | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerSource, setPickerSource] = useState<'create' | 'retitle' | null>(null)
  const [retitleTarget, setRetitleTarget] = useState<{ kind: 'entry' | 'plan'; id: string } | null>(null)
  const [deleteArmId, setDeleteArmId] = useState<string | null>(null)
  const [showTapHint, setShowTapHint] = useState(false)
  const [showCreateHint, setShowCreateHint] = useState(false)

  const rafRef = useRef(0)
  const extendRef = useRef<{ past?: number; future?: number } | null>(null)
  const didInit = useRef(false)
  const pendingScrollTop = useRef<number | null>(null)
  const pinchRef = useRef<{ dist: number } | null>(null)
  const pinchUntil = useRef(0)
  const dragUntil = useRef(0)
  const deleteArmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  const pxPerMin = PX_PER_MIN[cellMin]
  const dayHeight = 24 * 60 * pxPerMin
  const totalDays = pastDays + futureDays

  /* ---------- Daten laden ---------- */

  const refreshAll = useCallback(() => {
    setEntries(loadEntries())
    setPlans(loadPlans())
    setCategories(loadCategories())
    try {
      const raw = localStorage.getItem(RUNNING_ENTRY_KEY)
      setRunning(raw ? JSON.parse(raw) : null)
    } catch {
      setRunning(null)
    }
  }, [])

  useEffect(() => {
    refreshAll()
    const handler = () => refreshAll()
    window.addEventListener(ENTRIES_CHANGED_EVENT, handler)
    window.addEventListener(PLANS_CHANGED_EVENT, handler)
    window.addEventListener(CATEGORIES_CHANGED_EVENT, handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener(ENTRIES_CHANGED_EVENT, handler)
      window.removeEventListener(PLANS_CHANGED_EVENT, handler)
      window.removeEventListener(CATEGORIES_CHANGED_EVENT, handler)
      window.removeEventListener('storage', handler)
    }
  }, [refreshAll])

  // Uhr ticken: 1s mit laufendem Timer, sonst 30s (Jetzt-Linie)
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), running ? 1000 : 30000)
    return () => clearInterval(t)
  }, [running])

  // Tap-Hinweis: nur bis zur ersten erfolgreichen Markierung zeigen (localStorage-Flag)
  useEffect(() => {
    try {
      setShowTapHint(!localStorage.getItem('chronomind-timeline-tap-hint-done'))
      setShowCreateHint(!localStorage.getItem('chronomind_timeline_hint_seen'))
    } catch {
      setShowTapHint(true)
      setShowCreateHint(true)
    }
  }, [])

  // Löschen-Bestätigung zurücksetzen, wenn ein anderes Item geöffnet / Popover zu ist
  useEffect(() => {
    setDeleteArmId(null)
    if (deleteArmTimer.current) {
      clearTimeout(deleteArmTimer.current)
      deleteArmTimer.current = null
    }
  }, [popover?.item.id, popover?.hover])
  useEffect(() => () => {
    if (deleteArmTimer.current) clearTimeout(deleteArmTimer.current)
  }, [])

  /* ---------- Farben ---------- */

  const colorByMain = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categories) map.set(c.name.trim().toLowerCase(), c.color)
    return map
  }, [categories])
  const colorFor = useCallback(
    (cat: string | null) =>
      (cat && colorByMain.get(cat.split('/')[0]?.trim().toLowerCase() || '')) || '#6b7280',
    [colorByMain]
  )

  /* ---------- Items ---------- */

  const allItems = useMemo<TlItem[]>(() => {
    const list: TlItem[] = []
    for (const e of entries) {
      if (!e.started_at) continue
      const s = Date.parse(e.started_at)
      if (isNaN(s)) continue
      const end = e.ended_at ? Date.parse(e.ended_at) : NaN
      list.push({
        id: e.id,
        kind: 'entry',
        title: e.title,
        category: e.category,
        startMs: s,
        endMs: isNaN(end) ? s + 60 * MIN_MS : end
      })
    }
    for (const p of plans) {
      const s = Date.parse(p.started_at)
      const end = Date.parse(p.ended_at)
      if (isNaN(s) || isNaN(end)) continue
      list.push({ id: p.id, kind: 'plan', title: p.title, category: p.category, startMs: s, endMs: end })
    }
    if (running) {
      const s = Date.parse(running.started_at)
      if (!isNaN(s)) {
        list.push({ id: '__timer__', kind: 'timer', title: running.title, category: running.category, startMs: s, endMs: Math.max(s + MIN_MS, nowMs) })
      }
    }
    // Drag-Entwurf live übernehmen
    if (drag) {
      return list.map(it =>
        it.kind === drag.kind && it.id === drag.id
          ? { ...it, startMs: drag.curStartMs, endMs: drag.curEndMs }
          : it
      )
    }
    return list
  }, [entries, plans, running, nowMs, drag])

  const chips = useMemo(
    () => computeFrequentChips(entries, categories.map(c => c.name)),
    [entries, categories]
  )
  const chipColor = useCallback(
    (path: string) => colorFor(path),
    [colorFor]
  )

  /* ---------- Geometrie / Windowing ---------- */

  const today0 = dayStartMs(nowMs)
  const dayIdxToDateMs = useCallback(
    (idx: number) => today0 + (idx - pastDays) * DAY_MS,
    [today0, pastDays]
  )
  const dayIdxOfMs = useCallback(
    (ms: number) => Math.floor((dayStartMs(ms) - today0) / DAY_MS) + pastDays,
    [today0, pastDays]
  )

  const firstVisible = Math.max(0, Math.floor(scrollLeft / DAY_WIDTH) - 1)
  const visibleCount = Math.ceil(Math.max(1, viewportW) / DAY_WIDTH) + 3
  const lastVisible = Math.min(totalDays - 1, firstVisible + visibleCount)
  const visibleIdx = useMemo(() => {
    const arr: number[] = []
    for (let i = firstVisible; i <= lastVisible; i++) arr.push(i)
    return arr
  }, [firstVisible, lastVisible])

  const centerIdx = Math.min(
    totalDays - 1,
    Math.max(0, Math.floor((scrollLeft + Math.max(1, viewportW) / 2) / DAY_WIDTH))
  )

  const goToDayIdx = useCallback(
    (idx: number) => {
      const sc = scrollerRef.current
      if (!sc) return
      const clamped = Math.min(Math.max(0, idx), totalDays - 1)
      sc.scrollTo({ left: clamped * DAY_WIDTH - Math.max(0, (sc.clientWidth - DAY_WIDTH) / 2) })
    },
    [totalDays]
  )

  /* ---------- Scrollen (Windowing + unendliche Vergangenheit) ---------- */

  const handleScroll = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      const sc = scrollerRef.current
      if (!sc) return
      setScrollLeft(sc.scrollLeft)
      const total = (pastDays + futureDays) * DAY_WIDTH
      if (sc.scrollLeft < DAY_WIDTH * 2 && pastDays > 0) {
        extendRef.current = { past: EXTEND_DAYS }
        setPastDays(p => p + EXTEND_DAYS)
        // Offene 2-Tap-Markierung mitverschieben: alle Tages-Indizes verschieben sich um EXTEND_DAYS
        // (Zukunft wird rechts angehängt – dort verschieben sich die Indizes nicht)
        setSelStart(s => (s ? { ...s, dayIdx: s.dayIdx + EXTEND_DAYS } : s))
      } else if (total - sc.scrollLeft - sc.clientWidth < DAY_WIDTH * 2) {
        extendRef.current = { future: EXTEND_DAYS }
        setFutureDays(f => f + EXTEND_DAYS)
      }
    })
  }, [pastDays, futureDays])

  // Nach Erweiterung der Vergangenheit: Scrollposition korrigieren, damit der Inhalt „stillsteht"
  // (Zukunft wird rechts angehängt – dort verschieben sich bestehende Tage nicht)
  useLayoutEffect(() => {
    const ext = extendRef.current
    if (!ext) return
    extendRef.current = null
    const sc = scrollerRef.current
    if (!sc) return
    if (ext.past) sc.scrollLeft += ext.past * DAY_WIDTH
    setScrollLeft(sc.scrollLeft)
  }, [pastDays, futureDays])

  useEffect(() => {
    const sc = scrollerRef.current
    if (!sc) return
    const update = () => setViewportW(sc.clientWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Anfangsposition: heute (zentriert), Zeit um „jetzt"
  useLayoutEffect(() => {
    if (didInit.current) return
    const sc = scrollerRef.current
    if (!sc) return
    didInit.current = true
    const nowMin = (nowMs - today0) / MIN_MS
    sc.scrollLeft = Math.max(0, pastDays * DAY_WIDTH - Math.max(0, (sc.clientWidth - DAY_WIDTH) / 2))
    sc.scrollTop = Math.max(0, (nowMin - 120) * PX_PER_MIN[30])
    setScrollLeft(sc.scrollLeft)
  }, [])

  /* ---------- Zoom ---------- */

  const zoomBy = useCallback(
    (dir: 1 | -1) => {
      const idx = ZOOM_LEVELS.indexOf(cellMin)
      const nextIdx = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, idx + dir))
      if (nextIdx === idx) return
      const next = ZOOM_LEVELS[nextIdx]
      const sc = scrollerRef.current
      if (!sc) {
        setCellMin(next)
        return
      }
      // Zoom um die Bildschirmmitte: Uhrzeit am Ankerpunkt bleibt stehen
      const rect = sc.getBoundingClientRect()
      const anchorOffset = sc.clientHeight / 2
      const contentY = sc.scrollTop + anchorOffset
      const timeMin = (contentY - HEADER_H) / pxPerMin
      pendingScrollTop.current = Math.max(0, timeMin * PX_PER_MIN[next] + HEADER_H - anchorOffset)
      setCellMin(next)
    },
    [cellMin, pxPerMin]
  )

  useLayoutEffect(() => {
    if (pendingScrollTop.current == null) return
    const sc = scrollerRef.current
    if (sc) sc.scrollTop = pendingScrollTop.current
    pendingScrollTop.current = null
  }, [cellMin])

  // Mausrad mit Strg/Cmd = Zoom (nativ, passive:false wegen preventDefault)
  useEffect(() => {
    const sc = scrollerRef.current
    if (!sc) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        zoomBy(e.deltaY < 0 ? 1 : -1)
      }
    }
    sc.addEventListener('wheel', onWheel, { passive: false })
    return () => sc.removeEventListener('wheel', onWheel)
  }, [zoomBy])

  // Pinch mit 2 Fingern = Zoom
  useEffect(() => {
    const sc = scrollerRef.current
    if (!sc) return
    const dist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = { dist: dist(e.touches) }
        pinchUntil.current = Date.now() + 600
      }
    }
    const onMove = (e: TouchEvent) => {
      if (!pinchRef.current || e.touches.length !== 2) return
      e.preventDefault()
      const d = dist(e.touches)
      const ratio = d / pinchRef.current.dist
      if (ratio > 1.25) {
        zoomBy(1)
        pinchRef.current = { dist: d }
      } else if (ratio < 0.8) {
        zoomBy(-1)
        pinchRef.current = { dist: d }
      }
    }
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current = null
    }
    sc.addEventListener('touchstart', onStart, { passive: true })
    sc.addEventListener('touchmove', onMove, { passive: false })
    sc.addEventListener('touchend', onEnd)
    sc.addEventListener('touchcancel', onEnd)
    return () => {
      sc.removeEventListener('touchstart', onStart)
      sc.removeEventListener('touchmove', onMove)
      sc.removeEventListener('touchend', onEnd)
      sc.removeEventListener('touchcancel', onEnd)
    }
  }, [zoomBy])

  /* ---------- Markieren (2-Tap) ---------- */

  const onColumnClick = (e: React.MouseEvent<HTMLDivElement>, dayIdx: number) => {
    if (Date.now() < pinchUntil.current || Date.now() < dragUntil.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const minute = Math.min(24 * 60 - cellMin, Math.max(0, Math.floor(y / pxPerMin / cellMin) * cellMin))
    setPopover(null)
    setSelected(null)
    if (!selStart) {
      setSelStart({ dayIdx, minute })
      return
    }
    const aMs = dayIdxToDateMs(selStart.dayIdx) + selStart.minute * MIN_MS
    const bMs = dayIdxToDateMs(dayIdx) + minute * MIN_MS
    if (Number.isNaN(aMs) || Number.isNaN(bMs)) {
      setSelStart(null)
      return
    }
    setSelStart(null)
    if (aMs === bMs) return // gleiche Zelle: Auswahl abbrechen
    startCommit(Math.min(aMs, bMs), Math.max(aMs, bMs))
  }

  const startCommit = (startMs: number, endMs: number) => {
    // Erste erfolgreiche Markierung: Tap-Hinweis dauerhaft ausblenden
    if (showTapHint) {
      setShowTapHint(false)
      try {
        localStorage.setItem('chronomind-timeline-tap-hint-done', '1')
      } catch {
        /* ignore */
      }
    }
    const nowFloor = Math.floor(nowMs / (5 * MIN_MS)) * (5 * MIN_MS)
    if (startMs >= nowFloor) {
      prepareCommit({ past: null, future: { start: startMs, end: endMs } })
    } else if (endMs <= nowFloor) {
      prepareCommit({ past: { start: startMs, end: endMs }, future: null })
    } else {
      setAdoptState({ past: { start: startMs, end: nowFloor }, future: { start: nowFloor, end: endMs } })
    }
  }

  const prepareCommit = (parts: { past: Range | null; future: Range | null }) => {
    const colls = [
      ...(parts.past ? computeCollisions(parts.past.start, parts.past.end, entries, plans) : []),
      ...(parts.future ? computeCollisions(parts.future.start, parts.future.end, entries, plans) : [])
    ]
    const full = { past: parts.past, future: parts.future, colls }
    if (colls.length > 0) {
      setCollisionState(full)
    } else {
      setPending(full)
    }
  }

  /* ---------- Anlegen / Kollisionen anwenden ---------- */

  const toIso = (ms: number) => new Date(ms).toISOString()

  // duration_seconds konsequent aus (end - start)/1000 berechnen – kein 60s-Floor mehr,
  // damit duration und ended_at/started_at nie widersprüchlich sind.
  const applyCollisionEffects = (colls: Collision[]) => {
    if (!colls.length) return
    let nextEntries = loadEntries()
    let nextPlans = loadPlans()
    const nowIso = new Date().toISOString()
    for (const c of colls) {
      if (c.kind === 'entry') {
        nextEntries = nextEntries.flatMap(e => {
          if (e.id !== c.id) return [e]
          const s = Date.parse(e.started_at)
          // Konsistent mit Rendering/Kollisionsermittlung: ohne ended_at gilt 60-Minuten-Block
          const en = e.ended_at ? Date.parse(e.ended_at) : s + 60 * MIN_MS
          if (isNaN(s) || isNaN(en)) return [e] // ungültige Daten: unangetastet lassen
          if (c.mode === 'delete') return []
          if (c.mode === 'trim-end') {
            return [{ ...e, ended_at: toIso(c.newEndMs ?? s), duration_seconds: Math.round(((c.newEndMs ?? s) - s) / 1000) }]
          }
          if (c.mode === 'trim-start') {
            const ns = c.newStartMs ?? en
            return [{ ...e, started_at: toIso(ns), duration_seconds: Math.round((en - ns) / 1000) }]
          }
          const leftEnd = c.newEndMs ?? s
          const rightStart = c.newStartMs ?? en
          const left: TimeEntry = {
            ...e,
            ended_at: toIso(leftEnd),
            duration_seconds: Math.round((leftEnd - s) / 1000)
          }
          const right: TimeEntry = {
            ...e,
            id: nanoid(),
            started_at: toIso(rightStart),
            ended_at: e.ended_at,
            duration_seconds: Math.round((en - rightStart) / 1000),
            created_at: nowIso
          }
          return [left, right]
        })
      } else {
        nextPlans = nextPlans.flatMap(p => {
          if (p.id !== c.id) return [p]
          const s = Date.parse(p.started_at)
          const en = Date.parse(p.ended_at)
          if (isNaN(s) || isNaN(en)) return [p] // ungültige Daten: unangetastet lassen
          if (c.mode === 'delete') return []
          if (c.mode === 'trim-end') return [{ ...p, ended_at: toIso(c.newEndMs ?? s) }]
          if (c.mode === 'trim-start') return [{ ...p, started_at: toIso(c.newStartMs ?? en) }]
          const leftEnd = c.newEndMs ?? s
          const rightStart = c.newStartMs ?? en
          const left: TimePlan = { ...p, ended_at: toIso(leftEnd) }
          const right: TimePlan = { ...p, id: nanoid(), started_at: toIso(rightStart), ended_at: p.ended_at, created_at: nowIso }
          return [left, right]
        })
      }
    }
    saveEntries(nextEntries)
    savePlans(nextPlans)
    markDirty()
  }

  const createEntry = (range: Range, path: string[], title: string) => {
    const nowIso = new Date().toISOString()
    const entry: TimeEntry = {
      id: nanoid(),
      user_id: 'local-user',
      title,
      description: null,
      category: path.length ? path.join('/') : null,
      tags: null,
      started_at: toIso(range.start),
      ended_at: toIso(range.end),
      duration_seconds: Math.round((range.end - range.start) / 1000),
      source: 'manual',
      calendar_event_id: null,
      metadata: null,
      created_at: nowIso,
      is_recurring: null,
      recurrence_rule: null,
      recurrence_parent_id: null,
      recurrence_index: null
    }
    saveEntries([entry, ...loadEntries()])
    markDirty()
    toast.success(`Eintrag: ${title} · ${fmtHM(range.start)}–${fmtHM(range.end)}`)
  }

  const createPlan = (range: Range, path: string[], title: string) => {
    const plan: TimePlan = {
      id: nanoid(),
      title,
      category: path.length ? path.join('/') : null,
      started_at: toIso(range.start),
      ended_at: toIso(range.end),
      created_at: new Date().toISOString()
    }
    addPlan(plan)
    toast.success(`Plan: ${title} · ${fmtHM(range.start)}–${fmtHM(range.end)}`, { icon: '🗓️' })
  }

  const finishCreate = (path: string[], title: string) => {
    if (!pending) return
    if ((pending.past && (Number.isNaN(pending.past.start) || Number.isNaN(pending.past.end))) ||
      (pending.future && (Number.isNaN(pending.future.start) || Number.isNaN(pending.future.end)))) {
      setPending(null)
      return
    }
    // Erste erfolgreiche Eintrag-Anlage: Header-Hinweis dauerhaft ausblenden
    if (showCreateHint) {
      setShowCreateHint(false)
      try {
        localStorage.setItem('chronomind_timeline_hint_seen', '1')
      } catch {
        /* ignore */
      }
    }
    applyCollisionEffects(pending.colls)
    if (pending.past) createEntry(pending.past, path, title)
    if (pending.future) createPlan(pending.future, path, title)
    setPending(null)
  }

  /* ---------- Bearbeiten ---------- */

  const onItemTap = (e: React.MouseEvent<HTMLDivElement>, item: TlItem) => {
    e.stopPropagation()
    if (Date.now() < pinchUntil.current || Date.now() < dragUntil.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    setSelected(item.kind === 'timer' ? null : { kind: item.kind, id: item.id })
    setSelStart(null)
    setPopover({ item, hover: false, x: rect.left, y: rect.bottom })
  }

  const onItemEnter = (e: React.PointerEvent<HTMLDivElement>, item: TlItem) => {
    if (e.pointerType !== 'mouse') return
    setPopover(p => {
      if (p && !p.hover) return p
      const rect = e.currentTarget.getBoundingClientRect()
      return { item, hover: true, x: rect.left, y: rect.bottom }
    })
  }

  const onItemLeave = () => {
    setPopover(p => (p?.hover ? null : p))
  }

  const deleteItem = (kind: 'entry' | 'plan', id: string) => {
    if (kind === 'entry') {
      saveEntries(loadEntries().filter(e => e.id !== id))
      markDirty()
      toast('Eintrag gelöscht')
    } else {
      removePlan(id)
      toast('Plan gelöscht')
    }
    setSelected(null)
    setPopover(null)
  }

  const backToPlanning = (id: string) => {
    const e = loadEntries().find(x => x.id === id)
    if (!e) return
    const s = Date.parse(e.started_at)
    if (Number.isNaN(s)) return // ungültige Daten: silently skip
    saveEntries(loadEntries().filter(x => x.id !== id))
    markDirty()
    addPlan({
      id: nanoid(),
      title: e.title,
      category: e.category,
      started_at: e.started_at,
      ended_at: e.ended_at || toIso(s + 60 * MIN_MS),
      created_at: new Date().toISOString()
    })
    toast.success('Zurück in die Planung')
    setSelected(null)
    setPopover(null)
  }

  const confirmPlan = (id: string) => {
    const p = loadPlans().find(x => x.id === id)
    if (!p) return
    const ps = Date.parse(p.started_at)
    const pe = Date.parse(p.ended_at)
    if (Number.isNaN(ps) || Number.isNaN(pe)) return // ungültige Daten: silently skip
    removePlan(id)
    const nowIso = new Date().toISOString()
    const entry: TimeEntry = {
      id: nanoid(),
      user_id: 'local-user',
      title: p.title,
      description: null,
      category: p.category,
      tags: null,
      started_at: p.started_at,
      ended_at: p.ended_at,
      duration_seconds: Math.round((pe - ps) / 1000),
      source: 'manual',
      calendar_event_id: null,
      metadata: null,
      created_at: nowIso,
      is_recurring: null,
      recurrence_rule: null,
      recurrence_parent_id: null,
      recurrence_index: null
    }
    saveEntries([entry, ...loadEntries()])
    markDirty()
    toast.success(`${p.title} als Eintrag übernommen`)
    setSelected(null)
    setPopover(null)
  }

  const applyRetitle = (path: string[], title: string) => {
    if (!retitleTarget) return
    const category = path.length ? path.join('/') : null
    if (retitleTarget.kind === 'entry') {
      saveEntries(loadEntries().map(e => (e.id === retitleTarget.id ? { ...e, category, title } : e)))
      markDirty()
    } else {
      updatePlan(retitleTarget.id, { category, title })
    }
    setRetitleTarget(null)
  }

  /* ---------- Ränder ziehen (Pointer Events) ---------- */

  const startDrag = (e: React.PointerEvent<HTMLDivElement>, item: TlItem, edge: 'start' | 'end', day0: number) => {
    e.stopPropagation()
    e.preventDefault()
    // UNGECLIPPTEN Original-Zeiten aus dem Store lesen: das sichtbare Layout ist auf den
    // Tagesrand geclippt – Drag-Referenz muss das echte (ggf. mehrtägige) Original sein.
    let origStartMs = NaN
    let origEndMs = NaN
    if (item.kind === 'plan') {
      const p = loadPlans().find(x => x.id === item.id)
      if (p) {
        origStartMs = Date.parse(p.started_at)
        origEndMs = Date.parse(p.ended_at)
      }
    } else {
      const en = loadEntries().find(x => x.id === item.id)
      if (en?.started_at) {
        origStartMs = Date.parse(en.started_at)
        // Konsistent mit dem Rendering: ohne ended_at gilt ein 60-Minuten-Block
        origEndMs = en.ended_at ? Date.parse(en.ended_at) : origStartMs + 60 * MIN_MS
      }
    }
    if (isNaN(origStartMs) || isNaN(origEndMs)) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setSelected({ kind: item.kind === 'plan' ? 'plan' : 'entry', id: item.id })
    setPopover(null)
    setDrag({
      kind: item.kind === 'plan' ? 'plan' : 'entry',
      id: item.id,
      edge,
      day0,
      startY: e.clientY,
      origStartMs,
      origEndMs,
      curStartMs: origStartMs,
      curEndMs: origEndMs
    })
  }

  const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return
    e.preventDefault()
    if (Number.isNaN(drag.origStartMs) || Number.isNaN(drag.origEndMs) ||
      Number.isNaN(drag.curStartMs) || Number.isNaN(drag.curEndMs)) return
    const dMinutes = (e.clientY - drag.startY) / pxPerMin
    const day0 = drag.day0
    const raw = drag.edge === 'start' ? drag.origStartMs + dMinutes * MIN_MS : drag.origEndMs + dMinutes * MIN_MS
    // 5-Minuten-Raster; Mitternacht erlaubt – Kante darf über 00:00 hinaus
    // (nur grob auf ±1 Tag um den sichtbaren Tag begrenzt, kein Zuschneiden mehr)
    let m = Math.round((raw - day0) / MIN_MS / 5) * 5
    m = Math.min(48 * 60, Math.max(-24 * 60, m))
    const origStartMin = (drag.origStartMs - day0) / MIN_MS
    const origEndMin = (drag.origEndMs - day0) / MIN_MS
    let ns = drag.curStartMs
    let ne = drag.curEndMs
    if (drag.edge === 'start') {
      const startMin = Math.min(m, origEndMin - 5)
      ns = day0 + startMin * MIN_MS
    } else {
      const endMin = Math.max(m, origStartMin + 5)
      ne = day0 + endMin * MIN_MS
    }
    setDrag({ ...drag, curStartMs: ns, curEndMs: ne })
  }

  const endDrag = () => {
    if (!drag) return
    const d = drag
    dragUntil.current = Date.now() + 250
    if (!Number.isNaN(d.curStartMs) && !Number.isNaN(d.curEndMs) &&
      (d.curStartMs !== d.origStartMs || d.curEndMs !== d.origEndMs)) {
      if (d.kind === 'entry') {
        saveEntries(
          loadEntries().map(e =>
            e.id === d.id
              ? {
                  ...e,
                  started_at: toIso(d.curStartMs),
                  ended_at: toIso(d.curEndMs),
                  duration_seconds: Math.round((d.curEndMs - d.curStartMs) / 1000)
                }
              : e
          )
        )
        markDirty()
      } else {
        updatePlan(d.id, { started_at: toIso(d.curStartMs), ended_at: toIso(d.curEndMs) })
      }
      toast(`${fmtHM(d.curStartMs)}–${fmtHM(d.curEndMs)} gespeichert`)
    }
    setDrag(null)
  }

  /* ---------- Ableitungen für Dialoge ---------- */

  const pendingLabel = pending
    ? [
        pending.past ? `${fmtHM(pending.past.start)}–${fmtHM(pending.past.end)} als Eintrag` : null,
        pending.future ? `${fmtHM(pending.future.start)}–${fmtHM(pending.future.end)} als Plan` : null
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  const retitleItem = useMemo<TlItem | null>(() => {
    if (!retitleTarget) return null
    return allItems.find(it => it.id === retitleTarget.id && (it.kind === retitleTarget.kind)) || null
  }, [retitleTarget, allItems])

  /* ---------- Render ---------- */

  const nowMinOfDay = (nowMs - today0) / MIN_MS

  const renderDay = (idx: number) => {
    const day0 = dayIdxToDateMs(idx)
    const day1 = day0 + DAY_MS
    const isToday = day0 === today0
    const lanes = clipAndLayout(allItems, day0, day1)
    const selCellTop = selStart?.dayIdx === idx ? selStart.minute * pxPerMin : null
    const pendingRanges: { top: number; height: number }[] = []
    if (pending) {
      for (const r of [pending.past, pending.future]) {
        if (!r) continue
        const s = Math.max(r.start, day0)
        const e2 = Math.min(r.end, day1)
        if (e2 <= s) continue
        pendingRanges.push({ top: ((s - day0) / MIN_MS) * pxPerMin, height: Math.max(4, ((e2 - s) / MIN_MS) * pxPerMin) })
      }
    }
    const dateMs = day0
    return (
      <div
        key={idx}
        role="gridcell"
        aria-label={WEEKDAY_FMT.format(dateMs) + ' ' + DAY_NUM_FMT.format(dateMs)}
        className="absolute border-r border-border"
        style={{ left: idx * DAY_WIDTH, top: HEADER_H, width: DAY_WIDTH, height: dayHeight }}
        onClick={e => onColumnClick(e, idx)}
      >
        {/* Stundenraster */}
        {Array.from({ length: 24 }, (_, h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-border/60"
            style={{ top: h * 60 * pxPerMin, height: 60 * pxPerMin }}
          >
            <span className="absolute left-1 -top-1.5 text-[10px] leading-none text-muted-foreground bg-background/90 px-0.5 rounded pointer-events-none">
              {String(h).padStart(2, '0')}:00
            </span>
          </div>
        ))}

        {/* Startzelle der Markierung */}
        {selCellTop != null && (
          <div
            className="absolute left-0.5 right-0.5 bg-primary/25 border border-primary rounded pointer-events-none"
            style={{ top: selCellTop, height: cellMin * pxPerMin }}
          />
        )}

        {/* Wartende Markierung (vor Kategorieauswahl) */}
        {pendingRanges.map((r, i) => (
          <div
            key={i}
            className="absolute left-0.5 right-0.5 bg-primary/15 border border-dashed border-primary rounded pointer-events-none"
            style={{ top: r.top, height: r.height }}
          />
        ))}

        {/* Jetzt-Linie */}
        {isToday && nowMinOfDay >= 0 && nowMinOfDay <= 24 * 60 && (
          <div
            className="absolute left-0 right-0 z-20 pointer-events-none"
            style={{ top: nowMinOfDay * pxPerMin }}
          >
            <div className="relative border-t-2 border-foreground/60">
              <span className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-foreground/60" />
              <span className="absolute right-1 -top-2.5 text-[10px] font-semibold text-foreground/80 bg-background/90 px-1 rounded">
                {fmtHM(nowMs)}
              </span>
            </div>
          </div>
        )}

        {/* Blöcke */}
        {lanes.map(it => {
          const top = ((it.startMs - day0) / MIN_MS) * pxPerMin
          const h = Math.max(10, ((it.endMs - it.startMs) / MIN_MS) * pxPerMin)
          const w = DAY_WIDTH / it.laneCount
          const color = colorFor(it.category)
          const isSel = !!selected && selected.id === it.id && selected.kind === it.kind
          const isPlan = it.kind === 'plan'
          const editable = it.kind !== 'timer'
          return (
            <div
              key={`${it.kind}-${it.id}`}
              onClick={e => onItemTap(e, it)}
              onPointerEnter={e => onItemEnter(e, it)}
              onPointerLeave={onItemLeave}
              className={`absolute rounded-md overflow-hidden cursor-pointer ${
                isSel ? 'ring-2 ring-primary ring-offset-1 ring-offset-background z-10' : 'z-[1]'
              } ${it.kind === 'timer' ? 'animate-pulse z-[5]' : ''}`}
              style={{
                top,
                height: h,
                left: it.lane * w + 1,
                width: Math.max(8, w - 2),
                backgroundColor: color,
                opacity: isPlan ? 0.4 : 1
              }}
            >
              <div
                className={`absolute inset-0 ${isPlan ? 'border border-dashed rounded-md' : ''} pointer-events-none`}
                style={isPlan ? { borderColor: textColorFor(color) } : undefined}
              />
              {(h >= 18 || isSel) && (
                <div
                  className="px-1 pt-0.5 text-[10px] leading-tight font-medium pointer-events-none"
                  style={{ color: textColorFor(color) }}
                >
                  {h >= 34 ? `${it.title || lastSegment(it.category || '')} · ${fmtHM(it.startMs)}–${fmtHM(it.endMs)}` : it.title || lastSegment(it.category || '')}
                </div>
              )}
              {/* Ziehgriffe: erst nach Auswahl (isSel) */}
              {isSel && editable && (
                <>
                  <div
                    className="absolute left-0 right-0 top-0 h-6 cursor-ns-resize flex items-center justify-center"
                    style={{ touchAction: 'none' }}
                    onPointerDown={e => startDrag(e, it, 'start', day0)}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  >
                    <div className="w-5 h-1 rounded-full bg-black/40 dark:bg-white/50" />
                  </div>
                  <div
                    className="absolute left-0 right-0 bottom-0 h-6 cursor-ns-resize flex items-center justify-center"
                    style={{ touchAction: 'none' }}
                    onPointerDown={e => startDrag(e, it, 'end', day0)}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  >
                    <div className="w-5 h-1 rounded-full bg-black/40 dark:bg-white/50" />
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const centerDateMs = dayIdxToDateMs(centerIdx)

  return (
    <div className="mb-6">
      {/* Kopfzeile: Navigation */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <Button variant="outline" size="sm" className="h-8 w-8 px-0" aria-label="Tag zurück" onClick={() => goToDayIdx(centerIdx - 1)}>
          ‹
        </Button>
        <Button variant="outline" size="sm" className="h-8 w-8 px-0" aria-label="Tag vor" onClick={() => goToDayIdx(centerIdx + 1)}>
          ›
        </Button>
        <input
          type="date"
          value={toDateInputValue(centerDateMs)}
          onChange={e => {
            const [y, m, d] = (e.target.value || '').split('-').map(Number)
            if (!y || !m || !d) return
            goToDayIdx(dayIdxOfMs(new Date(y, m - 1, d).getTime()))
          }}
          className="h-8 rounded-md border border-input bg-card px-2 text-xs"
          aria-label="Datum wählen"
        />
        <Button variant="outline" size="sm" className="h-8" onClick={() => goToDayIdx(pastDays)}>
          Heute
        </Button>
        {showCreateHint && (
          <span className="text-[10px] text-muted-foreground">
            Zum Markieren zweimal antippen (Start + Ende)
          </span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground text-right">
          {selStart ? 'Zielzelle antippen…' : 'Zoom: Pinch / Strg+Rad'}
          <br />
          Raster: {cellMin} min
        </span>
      </div>

      {/* Zeitstrahl-Fläche */}
      <div
        ref={scrollerRef}
        className="relative overflow-auto rounded-lg border bg-card select-none h-[420px] sm:h-[520px]"
        style={{ touchAction: 'pan-x pan-y' }}
        onScroll={handleScroll}
      >
        <div className="relative" style={{ width: totalDays * DAY_WIDTH, height: HEADER_H + dayHeight }}>
          {/* Kopfzeile mit Tages-Labels */}
          <div
            className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border"
            style={{ height: HEADER_H }}
          >
            {visibleIdx.map(idx => {
              const day0 = dayIdxToDateMs(idx)
              const isToday = day0 === today0
              return (
                <div
                  key={idx}
                  className={`absolute top-0 flex h-full items-center justify-center border-r border-border text-xs ${
                    isToday ? 'text-primary font-bold' : 'text-muted-foreground'
                  }`}
                  style={{ left: idx * DAY_WIDTH, width: DAY_WIDTH }}
                >
                  {isToday ? 'Heute' : `${WEEKDAY_FMT.format(day0)} ${DAY_NUM_FMT.format(day0)}`}
                </div>
              )
            })}
          </div>

          {/* Tag-Spalten (nur sichtbarer Bereich) */}
          {visibleIdx.map(idx => renderDay(idx))}
        </div>
      </div>

      {/* Popover: Details / Bearbeiten */}
      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} />
          <div
            className="fixed z-50 w-60 rounded-lg border border-border bg-card p-3 shadow-lg"
            style={{
              left: `clamp(8px, ${popover.x}px, calc(100vw - 248px))`,
              top: Math.max(8, Math.min(popover.y + 6, window.innerHeight - 210))
            }}
          >
            <div className="flex items-start gap-2">
              <span
                className="mt-1 w-2.5 h-2.5 rounded-full shrink-0 border border-black/10 dark:border-white/20"
                style={{ backgroundColor: colorFor(popover.item.category) }}
              />
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">
                  {popover.item.title || lastSegment(popover.item.category || '')}
                </div>
                {popover.item.category && (
                  <div className="text-xs text-muted-foreground truncate">{popover.item.category}</div>
                )}
                <div className="text-xs mt-1">
                  {popover.item.kind === 'entry' ? 'Eintrag' : popover.item.kind === 'plan' ? 'Plan' : 'Timer'}
                  {' · '}
                  {fmtHM(popover.item.startMs)}–{fmtHM(popover.item.endMs)}
                </div>
              </div>
            </div>
            {!popover.hover && popover.item.kind !== 'timer' && (
              <div className="mt-2 space-y-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8"
                  onClick={() => {
                    setRetitleTarget({ kind: popover.item.kind === 'plan' ? 'plan' : 'entry', id: popover.item.id })
                    setPickerSource('retitle')
                    setPopover(null)
                    setPickerOpen(true)
                  }}
                >
                  Kategorie ändern
                </Button>
                {popover.item.kind === 'entry' && (
                  <Button size="sm" variant="outline" className="w-full h-8" onClick={() => backToPlanning(popover.item.id)}>
                    Zurück in Planung
                  </Button>
                )}
                {popover.item.kind === 'plan' && popover.item.endMs <= nowMs && (
                  <Button size="sm" variant="outline" className="w-full h-8" onClick={() => confirmPlan(popover.item.id)}>
                    Als Eintrag übernehmen
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full h-8"
                  onClick={() => {
                    if (deleteArmId !== popover.item.id) {
                      if (deleteArmTimer.current) clearTimeout(deleteArmTimer.current)
                      setDeleteArmId(popover.item.id)
                      deleteArmTimer.current = setTimeout(() => {
                        deleteArmTimer.current = null
                        setDeleteArmId(null)
                      }, 3000)
                      return
                    }
                    if (deleteArmTimer.current) {
                      clearTimeout(deleteArmTimer.current)
                      deleteArmTimer.current = null
                    }
                    deleteItem(popover.item.kind === 'plan' ? 'plan' : 'entry', popover.item.id)
                  }}
                >
                  {deleteArmId === popover.item.id ? 'Wirklich löschen?' : 'Löschen'}
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Dialog: Markierung reicht über „jetzt" hinaus */}
      <Dialog open={!!adoptState} onOpenChange={o => !o && setAdoptState(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Als Eintrag übernehmen?</DialogTitle>
            <DialogDescription>
              Die Markierung reicht über jetzt hinaus.{' '}
              {adoptState && (
                <>
                  Der Vergangenheits-Teil {fmtHM(adoptState.past.start)}–{fmtHM(adoptState.past.end)} wird als
                  Eintrag übernommen; der Zukunfts-Teil {fmtHM(adoptState.future.start)}–
                  {fmtHM(adoptState.future.end)} wird als Plan angelegt.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const a = adoptState
                setAdoptState(null)
                if (a) prepareCommit({ past: null, future: a.future })
              }}
            >
              Nur Plan
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const a = adoptState
                setAdoptState(null)
                if (a) prepareCommit({ past: a.past, future: a.future })
              }}
            >
              Übernehmen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Kollisionen */}
      <Dialog open={!!collisionState} onOpenChange={o => !o && setCollisionState(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Überschreiben?</DialogTitle>
            <DialogDescription>Die Markierung überschneidet sich mit Bestehendem:</DialogDescription>
          </DialogHeader>
          <ul className="text-sm space-y-1 list-disc pl-5">
            {(collisionState?.colls || []).map((c, i) => (
              <li key={i}>{c.message}</li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCollisionState(null)}>
              Abbrechen
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const c = collisionState
                setCollisionState(null)
                if (c) setPending(c)
              }}
            >
              Überschreiben
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Kategorieauswahl für die Markierung (häufige Chips + Kategorien-Dialog) */}
      <Dialog
        open={!!pending && !pickerOpen}
        onOpenChange={o => {
          if (!o) setPending(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eintrag anlegen</DialogTitle>
            <DialogDescription>{pendingLabel} – Kategorie wählen</DialogDescription>
          </DialogHeader>
          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {chips.map(chip => {
                const parts = chip.path.split('/')
                const ambiguous = chips.filter(c2 => lastSegment(c2.path) === lastSegment(chip.path)).length > 1
                const label = ambiguous ? `${parts[0]} / ${lastSegment(chip.path)}` : lastSegment(chip.path)
                return (
                  <button
                    key={chip.path}
                    title={chip.path}
                    onClick={() => finishCreate(parts, lastSegment(chip.path))}
                    className="flex items-center gap-1.5 min-h-[36px] py-2 px-3 rounded-full border border-border bg-card hover:bg-accent text-sm transition-transform active:scale-95"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0 border border-black/10 dark:border-white/20"
                      style={{ backgroundColor: chipColor(chip.path) }}
                    />
                    <span className="truncate max-w-[10rem]">{label}</span>
                    <span className="text-[10px] text-muted-foreground">{chip.count}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Keine häufigen Kategorien in den letzten 7 Tagen.</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPending(null)}>
              Abbrechen
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              setPickerSource('create')
              setPickerOpen(true)
            }}>
              Andere Kategorie…
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gemeinsamer Kategorien-Dialog (auch für „Kategorie ändern") */}
      <CategoryPickerDialog
        open={pickerOpen}
        onOpenChange={open => {
          setPickerOpen(open)
          if (!open) {
            // Aus dem Anlege-Dialog geöffnet: pending aufbewahren (Abbruch ohne Auswahl)
            if (pickerSource !== 'create') setPending(null)
            // Retitle-Auftrag verwerfen, sonst würde der nächste onPick fälschlich umtiteln
            setRetitleTarget(null)
            setPickerSource(null)
          }
        }}
        onPick={(path, title) => {
          if (retitleTarget) {
            applyRetitle(path, title)
          } else {
            finishCreate(path, title)
          }
        }}
        activeCategory={retitleItem?.category ?? null}
      />
    </div>
  )
}
