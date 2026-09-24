'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { markDirty } from '@/lib/dirty-state'
import { RUNNING_ENTRY_KEY } from '@/lib/cloud-sync-payload'
import {
  loadCategories,
  addMainCategory,
  updateMainCategory,
  removeMainCategory,
  addSub,
  updateSub,
  removeSub,
  CATEGORY_COLOR_PALETTE,
  type MainCategory
} from '@/lib/categories'

/** W10: Laufenden Timer bei Rename mitschieben (alte Einträge bleiben bewusst unverändert – out-of-scope) */
function migrateRunningCategory(oldPrefix: string, newPrefix: string) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(RUNNING_ENTRY_KEY)
    if (!raw) return
    const running = JSON.parse(raw) as { category?: string | null }
    const cat = running.category
    if (cat && (cat === oldPrefix || cat.startsWith(`${oldPrefix}/`))) {
      running.category = `${newPrefix}${cat.slice(oldPrefix.length)}`
      localStorage.setItem(RUNNING_ENTRY_KEY, JSON.stringify(running))
      markDirty()
    }
  } catch { /* ignorieren */ }
}

/** W2: Duplikat-Prüfung (trim + case-insensitive) */
function isDuplicate(names: string[], name: string): boolean {
  const needle = name.trim().toLowerCase()
  return names.some(n => n.trim().toLowerCase() === needle)
}

function InlineName({
  value,
  onCommit,
  ariaLabel
}: {
  value: string
  onCommit: (name: string) => void | false
  ariaLabel: string
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const commit = () => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === value) {
      setDraft(value)
      return
    }
    // false zurück = abgelehnt (z.B. Duplikat) → Entwurf zurücksetzen
    if (onCommit(trimmed) === false) setDraft(value)
  }
  return (
    <Input
      aria-label={ariaLabel}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      className="h-8 text-sm"
    />
  )
}

function AddSubRow({ onAdd, placeholder }: { onAdd: (name: string) => void | false; placeholder: string }) {
  const [name, setName] = useState('')
  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    // false zurück = abgelehnt (Duplikat) → Eingabe behalten
    if (onAdd(trimmed) !== false) setName('')
  }
  return (
    <div className="flex gap-2">
      <Input
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') submit()
        }}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
      <Button size="sm" variant="outline" onClick={submit} disabled={!name.trim()}>
        +
      </Button>
    </div>
  )
}

export function CategorySettings() {
  const [cats, setCats] = useState<MainCategory[]>([])
  const [expandedMains, setExpandedMains] = useState<Set<string>>(new Set())
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set())
  const [newMainName, setNewMainName] = useState('')
  const [newMainColor, setNewMainColor] = useState(CATEGORY_COLOR_PALETTE[0])

  const refresh = useCallback(() => setCats(loadCategories()), [])
  useEffect(() => {
    refresh()
  }, [refresh])

  const toggleMain = (id: string) => {
    setExpandedMains(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSub = (key: string) => {
    setExpandedSubs(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleCreateMain = () => {
    const name = newMainName.trim()
    if (!name) return
    if (isDuplicate(cats.map(c => c.name), name)) {
      toast.error('Gibt es schon')
      return
    }
    setCats(addMainCategory(name, newMainColor))
    setNewMainName('')
  }

  return (
    <div className="space-y-3">
      {cats.map(c => (
        <div key={c.id} className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            {/* 32px Swatch: Farbeingabe visuell versteckt darüber gelegt */}
            <div className="relative w-8 h-8 shrink-0">
              <span
                className="absolute inset-0 rounded-lg border border-black/10 dark:border-white/20"
                style={{ backgroundColor: c.color }}
              />
              <input
                type="color"
                value={c.color}
                onChange={e => setCats(updateMainCategory(c.id, { color: e.target.value }))}
                className="absolute inset-0 w-8 h-8 rounded-lg cursor-pointer opacity-0"
                aria-label={`Farbe von ${c.name}`}
                title="Farbe ändern"
              />
            </div>
            <InlineName
              value={c.name}
              onCommit={name => {
                if (isDuplicate(cats.filter(o => o.id !== c.id).map(o => o.name), name)) {
                  toast.error('Gibt es schon')
                  return false
                }
                migrateRunningCategory(c.name, name)
                setCats(updateMainCategory(c.id, { name }))
              }}
              ariaLabel={`Name von ${c.name}`}
            />
            <Button
              variant="ghost"
              size="sm"
              className="min-h-9 px-2"
              onClick={() => toggleMain(c.id)}
              aria-expanded={expandedMains.has(c.id)}
            >
              {expandedMains.has(c.id) ? '▾' : '▸'} {c.subs.length}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 text-destructive hover:text-destructive"
              aria-label={`${c.name} löschen`}
              title="Löschen"
              onClick={() => {
                if (confirm(`Hauptkategorie "${c.name}" inkl. aller Unterkategorien löschen?`)) {
                  setCats(removeMainCategory(c.id))
                }
              }}
            >
              ✕
            </Button>
          </div>

          {expandedMains.has(c.id) && (
            <div className="ml-3 border-l border-border pl-3 space-y-2">
              {c.subs.length === 0 && (
                <p className="text-xs text-muted-foreground">Noch keine Unterkategorien.</p>
              )}
              {c.subs.map((s, subIdx) => {
                const subKey = `${c.id}:${subIdx}`
                return (
                  <div key={subKey} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <InlineName
                        value={s.name}
                        onCommit={name => {
                          if (isDuplicate(c.subs.filter((_, i) => i !== subIdx).map(o => o.name), name)) {
                            toast.error('Gibt es schon')
                            return false
                          }
                          migrateRunningCategory(`${c.name}/${s.name}`, `${c.name}/${name}`)
                          setCats(updateSub({ mainId: c.id, subIdx }, name))
                        }}
                        ariaLabel={`Name von ${c.name} / ${s.name}`}
                      />
                      <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-9 px-2"
                          onClick={() => toggleSub(subKey)}
                          aria-expanded={expandedSubs.has(subKey)}
                        >
                          {expandedSubs.has(subKey) ? '▾' : '▸'} {s.children.length}
                        </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 text-destructive hover:text-destructive"
                        aria-label={`${s.name} löschen`}
                        title="Löschen"
                        onClick={() => setCats(removeSub({ mainId: c.id, subIdx }))}
                      >
                        ✕
                      </Button>
                    </div>

                    {expandedSubs.has(subKey) && (
                      <div className="ml-3 border-l border-border pl-3 space-y-1.5">
                        {s.children.length === 0 && (
                          <p className="text-xs text-muted-foreground">Noch keine Unterunterkategorien.</p>
                        )}
                        {s.children.map((ch, childIdx) => (
                          <div key={childIdx} className="flex items-center gap-2">
                            <InlineName
                              value={ch.name}
                              onCommit={name => {
                                if (isDuplicate(s.children.filter((_, j) => j !== childIdx).map(o => o.name), name)) {
                                  toast.error('Gibt es schon')
                                  return false
                                }
                                migrateRunningCategory(
                                  `${c.name}/${s.name}/${ch.name}`,
                                  `${c.name}/${s.name}/${name}`
                                )
                                setCats(updateSub({ mainId: c.id, subIdx, childIdx }, name))
                              }}
                              ariaLabel={`Name von ${c.name} / ${s.name} / ${ch.name}`}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0 text-destructive hover:text-destructive"
                              aria-label={`${ch.name} löschen`}
                              title="Löschen"
                              onClick={() => setCats(removeSub({ mainId: c.id, subIdx, childIdx }))}
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                        <AddSubRow
                          onAdd={name => {
                            if (isDuplicate(s.children.map(o => o.name), name)) {
                              toast.error('Gibt es schon')
                              return false
                            }
                            setCats(addSub({ mainId: c.id, subIdx }, name))
                          }}
                          placeholder={`+ Unterkategorie unter "${s.name}"`}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
              <AddSubRow
                onAdd={name => {
                  if (isDuplicate(c.subs.map(o => o.name), name)) {
                    toast.error('Gibt es schon')
                    return false
                  }
                  setCats(addSub({ mainId: c.id }, name))
                }}
                placeholder={`+ Unterkategorie unter "${c.name}"`}
              />
            </div>
          )}
        </div>
      ))}

      {/* Neue Hauptkategorie */}
      <div className="border border-border rounded-lg p-3 space-y-2">
        <div className="text-sm font-medium">Neue Hauptkategorie</div>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLOR_PALETTE.map(col => (
            <button
              key={col}
              type="button"
              onClick={() => setNewMainColor(col)}
              style={{ backgroundColor: col }}
              aria-label={`Farbe ${col} wählen`}
              className={`w-6 h-6 rounded-full border border-black/10 dark:border-white/20 transition-transform ${
                newMainColor === col
                  ? 'ring-2 ring-ring ring-offset-1 scale-110'
                  : ''
              }`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newMainName}
            onChange={e => setNewMainName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreateMain()
            }}
            placeholder="Name der Hauptkategorie"
          />
          <Button onClick={handleCreateMain} disabled={!newMainName.trim()}>
            Anlegen
          </Button>
        </div>
      </div>
    </div>
  )
}
