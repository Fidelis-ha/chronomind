'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'react-hot-toast'
import {
  loadCategories,
  addSub,
  categoryPathToString,
  sanitizeName,
  CATEGORIES_CHANGED_EVENT,
  type MainCategory,
  type SubCategory
} from '@/lib/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'

interface CategoryPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Wird mit säuberlichem Pfad + Titel (unterste Ebene) aufgerufen, Dialog schließt sich vorher selbst */
  onPick: (path: string[], title: string) => void
  /** Hauptkategorie, mit der direkt geöffnet wird (QuickTap-Kachel). Ohne: Hauptkategorie-Auswahl als erste Ebene. */
  initialMain?: MainCategory | null
  /** Kategorie-Pfad, der im Dialog als „aktiv“ hervorgehoben wird (laufender Timer) */
  activeCategory?: string | null
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

/**
 * Gemeinsamer Kategorie-Dialog (aus QuickTap extrahiert, Texte/Verhalten unverändert).
 * Wird von QuickTap (mit initialMain) und vom Zeitstrahl (mit Hauptkategorien-Auswahl)
 * genutzt.
 */
export function CategoryPickerDialog({
  open,
  onOpenChange,
  onPick,
  initialMain = null,
  activeCategory = null
}: CategoryPickerDialogProps) {
  const [categories, setCategories] = useState<MainCategory[]>([])
  const [dialogMain, setDialogMain] = useState<MainCategory | null>(null)
  const [dialogSub, setDialogSub] = useState<SubCategory | null>(null)
  const [newSubName, setNewSubName] = useState('')

  useEffect(() => {
    const refresh = () => setCategories(loadCategories())
    refresh()
    window.addEventListener(CATEGORIES_CHANGED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(CATEGORIES_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  // Bei jedem Öffnen zurücksetzen (QuickTap-Verhalten: startet bei der angetippten Hauptkategorie)
  useEffect(() => {
    if (open) {
      setDialogMain(initialMain)
      setDialogSub(null)
      setNewSubName('')
    }
  }, [open, initialMain])

  const selectPath = (path: string[], title: string) => {
    // UI-Eingaben säubern ('/' strippen, trimmen, kürzen) bevor der Pfad benutzt wird
    const clean = path.map(seg => sanitizeName(seg)).filter(Boolean)
    onOpenChange(false)
    onPick(clean, sanitizeName(title))
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
      // Ebene 3 = letzte Ebene: direkt starten (entspricht dem Chip-Verhalten)
      selectPath([main.name, dialogSub.name, name], name)
      setNewSubName('')
    } else {
      const main = categories.find(c => c.id === dialogMain.id) || dialogMain
      // subIdx undefined = neue Ebene-1-Unterkategorie ans Ende anhängen
      addSub({ mainId: main.id }, name)
      // Im Dialog bleiben und in die neue Unterkategorie navigieren,
      // damit optional eine Ebene-3-Sub angelegt/gewählt werden kann
      setDialogSub({ name: sanitizeName(name), children: [] })
      setNewSubName('')
    }
  }

  const currentSubs = useMemo<SubCategory[]>(() => {
    if (!dialogMain) return []
    if (!dialogSub) return dialogMain.subs
    const fresh = categories.find(c => c.id === dialogMain.id)
    const sub = (fresh || dialogMain).subs.find(s => s.name === dialogSub.name)
    return sub?.children || []
  }, [dialogMain, dialogSub, categories])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {dialogMain ? dialogMain.name : 'Kategorie wählen'}
          </DialogTitle>
          <DialogDescription>
            {!dialogMain
              ? 'Hauptkategorie antippen'
              : dialogSub
                ? // Dynamischer Pfad-Breadcrumb: 'Arbeit / Sport' statt 'Ebene 1/2'-Jargon
                  `${dialogMain?.name} / ${dialogSub.name}`
                : 'Unterkategorie antippen oder direkt starten'}
          </DialogDescription>
        </DialogHeader>

        {/* Ebene 0: Hauptkategorie-Auswahl (nur wenn ohne initialMain geöffnet) */}
        {!dialogMain && (
          <div className="max-h-72 overflow-y-auto -mx-1 px-1">
            <div className="divide-y divide-border rounded-lg border border-border">
              {categories.map(c => {
                const isActive = activeCategory?.split('/')[0] === c.name
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setDialogMain(c)
                      setDialogSub(null)
                      setNewSubName('')
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                      isActive ? 'bg-primary/10 font-semibold' : 'hover:bg-accent'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-black/10 dark:border-white/20"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="truncate">{c.name}</span>
                    <span className="flex items-center gap-1 text-muted-foreground text-xs shrink-0 ml-auto">
                      {c.subs.length}
                      <ChevronRightIcon />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Ebene 2: direkter Start der Unterkategorie ohne Kind – primäre Aktion */}
        {dialogMain && dialogSub && (
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

        {dialogMain && (
          <div className="max-h-72 overflow-y-auto -mx-1 px-1">
            {currentSubs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Noch keine Unterkategorien auf dieser Ebene.
              </p>
            ) : (
              <div className="divide-y divide-border rounded-lg border border-border">
                {currentSubs.map((sub, idx) => {
                  const isActive = activeCategory === categoryPathToString(
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
        )}

        {/* Breadcrumb-Zurück */}
        {dialogMain && dialogSub && (
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

        {dialogMain && (
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
        )}
      </DialogContent>
    </Dialog>
  )
}
