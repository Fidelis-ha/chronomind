'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { toast } from 'react-hot-toast'
import { type TimeEntry } from '@/lib/types'
import { nanoid } from '@/lib/utils'
import {
  loadCategories,
  addSub,
  categoryPathToString,
  lastSegment,
  sanitizeName,
  CATEGORIES_CHANGED_EVENT,
  type MainCategory,
  type SubCategory
} from '@/lib/categories'
import { loadEntries, ENTRIES_CHANGED_EVENT } from '@/lib/entries-store'
import { markDirty } from '@/lib/dirty-state'
import { RUNNING_ENTRY_KEY as STORAGE_KEY } from '@/lib/cloud-sync-payload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'

interface QuickTapProps {
  onCreate: (entry: TimeEntry) => void
  recentTitles?: string[]
}

interface RunningEntry {
  title: string
  category: string | null
  started_at: string
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

interface FrequentChip {
  path: string
  count: number
}

/** Inline-SVGs für Dialog-Items (Start-Aktion vs. Unterordner) */
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-3.5 w-3.5">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export function QuickTap({ onCreate }: QuickTapProps) {
  const [running, setRunning] = useState<RunningEntry | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [categories, setCategories] = useState<MainCategory[]>([])
  const [chips, setChips] = useState<FrequentChip[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMain, setDialogMain] = useState<MainCategory | null>(null)
  const [dialogSub, setDialogSub] = useState<SubCategory | null>(null)
  const [newSubName, setNewSubName] = useState('')
  const onCreateRef = useRef(onCreate)
  onCreateRef.current = onCreate

  const refreshCategories = useCallback(() => {
    setCategories(loadCategories())
  }, [])

  const refreshChips = useCallback(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    const counts = new Map<string, number>()
    // Erstes Segment jeder bekannten Hauptkategorie (case-insensitive, getrimmt)
    const knownMains = new Set(categories.map(c => c.name.trim().toLowerCase()))
    for (const e of loadEntries()) {
      // Chip-Kandidat: Pfad mit '/' ODER erstes Segment entspricht einer bekannten Hauptkategorie
      if (!e.category) continue
      const first = e.category.split('/')[0]?.trim().toLowerCase() || ''
      if (!e.category.includes('/') && !knownMains.has(first)) continue
      const t = e.started_at ? new Date(e.started_at).getTime() : 0
      if (t < cutoff) continue
      counts.set(e.category, (counts.get(e.category) || 0) + 1)
    }
    const sorted = Array.from(counts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
    setChips(sorted)
  }, [categories])
  // Event-Listener sollen immer die aktuelle refreshChips-Instanz nutzen, ohne den Mount-Effect neu zu triggern
  const refreshChipsRef = useRef(refreshChips)
  refreshChipsRef.current = refreshChips

  // Chips hängen am categories-State: bei Änderung baut sich refreshChips neu und läuft erneut
  useEffect(() => {
    refreshChips()
  }, [refreshChips])

  useEffect(() => {
    refreshCategories()
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setRunning(JSON.parse(raw))
    } catch { /* ignorieren */ }
    const handler = () => refreshCategories()
    const entriesHandler = () => refreshChipsRef.current()
    window.addEventListener(CATEGORIES_CHANGED_EVENT, handler)
    window.addEventListener(ENTRIES_CHANGED_EVENT, entriesHandler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener(CATEGORIES_CHANGED_EVENT, handler)
      window.removeEventListener(ENTRIES_CHANGED_EVENT, entriesHandler)
      window.removeEventListener('storage', handler)
    }
  }, [refreshCategories])

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

  const handleStart = (path: string[], title: string) => {
    const category = categoryPathToString(path)
    const nowIso = new Date().toISOString()
    const wasRunning = finishRunning(nowIso)

    // Gleicher Pfad nochmal getippt → nur stoppen
    if (wasRunning && wasRunning.category === category) {
      setRunning(null)
      return
    }

    // Neue Aktivität starten
    const next: RunningEntry = {
      title,
      category,
      started_at: nowIso
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    markDirty() // laufender Timer wäre beim Schließen verloren -> Warnung nötig
    setRunning(next)
    setNow(Date.now())
    if (wasRunning) toast(`Jetzt: ${title}`, { icon: '▶️' })
  }

  const handleStop = () => {
    finishRunning(new Date().toISOString())
    setRunning(null)
  }

  const openDialog = (main: MainCategory) => {
    setDialogMain(main)
    setDialogSub(null)
    setNewSubName('')
    setDialogOpen(true)
  }

  const selectPath = (path: string[], title: string) => {
    // UI-Eingaben säubern ('/' strippen, trimmen, kürzen) bevor der Pfad benutzt wird
    const clean = path.map(seg => sanitizeName(seg)).filter(Boolean)
    setDialogOpen(false)
    handleStart(clean, sanitizeName(title))
  }

  const handleCreateSub = () => {
    const name = sanitizeName(newSubName.trim())
    if (!dialogMain || !name) return
    // Duplikat-Prüfung: Name darf auf der aktuellen Ebene (1 oder 2) noch nicht existieren
    if (currentSubs.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Gibt es schon')
      return
    }
    if (dialogSub) {
      // Ebene 3: Kind der aktuellen Ebene-2-Sub
      const main = categories.find(c => c.id === dialogMain.id) || dialogMain
      const subIdx = main.subs.findIndex(s => s.name === dialogSub.name)
      if (subIdx === -1) {
        toast.error('Unterkategorie nicht gefunden')
        return
      }
      // childIdx undefined = ans Ende der Kinder anhängen
      addSub({ mainId: main.id, subIdx }, name)
      selectPath([main.name, dialogSub.name, name], name)
    } else {
      const main = categories.find(c => c.id === dialogMain.id) || dialogMain
      // subIdx undefined = neue Ebene-1-Unterkategorie ans Ende anhängen
      addSub({ mainId: main.id }, name)
      selectPath([main.name, name], name)
    }
    setNewSubName('')
  }

  const currentSubs = useMemo<SubCategory[]>(() => {
    if (!dialogMain) return []
    if (!dialogSub) return dialogMain.subs
    const fresh = categories.find(c => c.id === dialogMain.id)
    const sub = (fresh || dialogMain).subs.find(s => s.name === dialogSub.name)
    return sub?.children || []
  }, [dialogMain, dialogSub, categories])

  // colorForPath-Ergebnis cachen: Map nur bei categories-Änderung neu bauen, nicht pro Chip pro Render
  const colorByMain = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categories) map.set(c.name.trim().toLowerCase(), c.color)
    return map
  }, [categories])
  const colorFor = useCallback(
    (path: string) => colorByMain.get(path.split('/')[0]?.trim().toLowerCase() || '') || '#6b7280',
    [colorByMain]
  )

  return (
    <div className="mb-6">
      {/* Laufender Timer */}
      {running && (
        <div className="mb-4 p-4 rounded-xl border-2 border-primary bg-primary/5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground mb-0.5">Läuft gerade</div>
              <div className="font-semibold text-lg truncate">{running.title}</div>
              {running.category && (
                <div className="text-xs text-muted-foreground truncate">{running.category}</div>
              )}
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

      {/* Kopfzeile */}
      <div className="flex items-center mb-2 px-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Kategorien</span>
      </div>

      {/* Kategorien-Kacheln */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {categories.slice(0, 12).map(c => {
          const active = running?.category?.split('/')[0] === c.name
          return (
            <button
              key={c.id}
              onClick={() => openDialog(c)}
              style={{ borderLeftColor: c.color }}
              className={`flex items-center gap-2 rounded-xl border-2 border-l-4 ring-1 ring-border px-3 py-4 transition-transform active:scale-95 ${
                active
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border bg-card hover:bg-accent'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0 border border-black/10 dark:border-white/20"
                style={{ backgroundColor: c.color }}
              />
              <span className="text-sm font-medium text-left leading-tight truncate">{c.name}</span>
              {active && <span className="text-[10px] text-primary font-semibold ml-auto">● läuft</span>}
            </button>
          )
        })}
      </div>

      <p className="mt-2 text-xs text-muted-foreground px-1">
        Antippen = Unterkategorie wählen &amp; starten · Verwaltung in den Einstellungen
      </p>

      {/* Häufig genutzte Kategorien – Header nur anzeigen, wenn es auch Chips gibt */}
      {(running || chips.length > 0) && (
        <div className="mt-4 px-1">
          {chips.length > 0 && (
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Häufig – in den letzten 7 Tagen
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {chips.map(chip => {
              const isRunningChip = running?.category === chip.path
              // Mehrdeutiger Kurzname (gleicher Name unter mehreren Hauptkategorien) → Pfad-Präfix zeigen
              const ambiguous = chips.filter(c2 => lastSegment(c2.path) === lastSegment(chip.path)).length > 1
              const parts = chip.path.split('/')
              const label = ambiguous ? `${parts[0]} / ${lastSegment(chip.path)}` : lastSegment(chip.path)
              return (
                <button
                  key={chip.path}
                  title={chip.path}
                  onClick={() => handleStart(parts, lastSegment(chip.path))}
                  className={`flex items-center gap-1.5 min-h-[36px] py-2 px-3 rounded-full border bg-card hover:bg-accent text-sm transition-transform active:scale-95 ${
                    isRunningChip ? 'border-primary bg-primary/10 font-semibold' : 'border-border'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0 border border-black/10 dark:border-white/20"
                    style={{ backgroundColor: colorFor(chip.path) }}
                  />
                  <span className="truncate max-w-[10rem]">{label}</span>
                  {isRunningChip && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" title="läuft" aria-label="läuft" />
                  )}
                  <span className="text-[10px] text-muted-foreground">{chip.count}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Unterkategorie-Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMain ? dialogMain.name : ''}
            </DialogTitle>
            <DialogDescription>
              {dialogSub
                ? // Dynamischer Pfad-Breadcrumb: 'Arbeit / Sport' statt 'Ebene 1/2'-Jargon
                  `${dialogMain?.name} / ${dialogSub.name}`
                : 'Unterkategorie antippen oder direkt starten'}
            </DialogDescription>
          </DialogHeader>

          {/* Ebene 2: direkter Start der Unterkategorie ohne Kind – primäre Aktion */}
          {dialogSub && (
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                if (!dialogMain) return
                selectPath([dialogMain.name, dialogSub.name], dialogSub.name)
              }}
            >
              Mit {dialogSub.name} direkt starten
            </Button>
          )}

          <div className="max-h-72 overflow-y-auto -mx-1 px-1">
            {currentSubs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Noch keine Unterkategorien auf dieser Ebene.
              </p>
            ) : (
              <div className="divide-y divide-border rounded-lg border border-border">
                {currentSubs.map((sub, idx) => {
                  const isActive = running?.category === categoryPathToString(
                    dialogSub
                      ? [dialogMain?.name || '', dialogSub.name, sub.name]
                      : [dialogMain?.name || '', sub.name]
                  )
                  return (
                    <button
                      key={`${idx}-${sub.name}`}
                      onClick={() => {
                        if (!dialogSub) {
                          // Ebene 1: immer hinein navigieren (auch ohne Kinder),
                          // damit Ebene 3 erreichbar bleibt / angelegt werden kann
                          setDialogSub(sub)
                          setNewSubName('')
                        } else {
                          // Ebene 2 → Kind (Ebene 3) startet direkt
                          selectPath([dialogMain?.name || '', dialogSub.name, sub.name], sub.name)
                        }
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                        isActive ? 'bg-primary/10 font-semibold' : 'hover:bg-accent'
                      }`}
                    >
                      <span className="truncate">{sub.name}</span>
                      {dialogSub ? (
                        // Ebene 3 = letzte Ebene: klar als Start-Aktion gekennzeichnet
                        <span className="flex items-center gap-1 text-primary text-xs font-medium shrink-0">
                          <PlayIcon />
                          starten
                        </span>
                      ) : (
                        // Ebene 1: immer drill-down (Kinderzahl, auch 0)
                        <span className="flex items-center gap-1 text-muted-foreground text-xs shrink-0">
                          {sub.children.length}
                          <ChevronRightIcon />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Breadcrumb-Zurück */}
          {dialogSub && (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => {
                setDialogSub(null)
                setNewSubName('')
              }}
            >
              ← Zurück
            </Button>
          )}

          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <Input
                value={newSubName}
                onChange={e => setNewSubName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateSub()
                }}
                placeholder="Neue Unterkategorie"
              />
              <Button size="sm" onClick={handleCreateSub} disabled={!newSubName.trim()}>
                Anlegen
              </Button>
            </div>
            {!dialogSub && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  if (!dialogMain) return
                  selectPath([dialogMain.name], dialogMain.name)
                }}
              >
                Ohne Unterkategorie starten
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
