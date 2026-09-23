'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import {
  type Activity,
  loadActivities,
  saveActivities,
  ICON_CHOICES,
  DEFAULT_ACTIVITIES
} from '@/lib/activities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ActivitiesEditorProps {
  onChanged?: (activities: Activity[]) => void
}

/** Bearbeitbare Aktivitäten-Liste: Umbenennen, Icon wählen, löschen, hinzufügen, sortieren */
export function ActivitiesEditor({ onChanged }: ActivitiesEditorProps) {
  const [items, setItems] = useState<Activity[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [openIconFor, setOpenIconFor] = useState<number | null>(null)

  useEffect(() => {
    setItems(loadActivities())
  }, [])

  const commit = (next: Activity[]) => {
    setItems(next)
    saveActivities(next)
    onChanged?.(next)
  }

  const rename = (idx: number, title: string) => {
    const next = items.map((a, i) => (i === idx ? { ...a, title } : a))
    // live mitschreiben, aber Event nur bei Blur/Enter sparen wir uns - direkt ist einfacher
    setItems(next)
  }

  const commitRename = (idx: number) => {
    const a = items[idx]
    if (!a.title.trim()) {
      toast.error('Name darf nicht leer sein')
      setItems(loadActivities())
      return
    }
    commit(items)
  }

  const setIcon = (idx: number, icon: string) => {
    const next = items.map((a, i) => (i === idx ? { ...a, icon } : a))
    commit(next)
    setOpenIconFor(null)
  }

  const remove = (idx: number) => {
    const next = items.filter((_, i) => i !== idx)
    commit(next)
  }

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    commit(next)
  }

  const add = () => {
    const t = newTitle.trim()
    if (!t) return
    if (items.some(a => a.title.toLowerCase() === t.toLowerCase())) {
      toast.error('Aktivität existiert bereits')
      return
    }
    commit([...items, { title: t, icon: '⏱️' }])
    setNewTitle('')
    toast.success(`„${t}" hinzugefügt`)
  }

  const resetDefaults = () => {
    commit(DEFAULT_ACTIVITIES)
    toast.success('Standard-Aktivitäten wiederhergestellt')
  }

  return (
    <div className="space-y-2">
      {items.map((a, idx) => (
        <div key={idx} className="flex items-center gap-2 p-2 border rounded-lg bg-card">
          <button
            type="button"
            onClick={() => setOpenIconFor(openIconFor === idx ? null : idx)}
            className="text-2xl leading-none shrink-0 w-10 h-10 rounded-lg border hover:bg-accent"
            title="Symbol wählen"
          >
            {a.icon}
          </button>
          <Input
            value={a.title}
            onChange={e => rename(idx, e.target.value)}
            onBlur={() => commitRename(idx)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() } }}
            className="flex-1"
          />
          <div className="flex flex-col shrink-0">
            <button type="button" onClick={() => move(idx, -1)} className="text-xs leading-none px-1 text-muted-foreground hover:text-foreground" title="Nach oben">▲</button>
            <button type="button" onClick={() => move(idx, 1)} className="text-xs leading-none px-1 text-muted-foreground hover:text-foreground" title="Nach unten">▼</button>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => remove(idx)} className="shrink-0 text-destructive hover:text-destructive" title="Löschen">
            ✕
          </Button>

          {openIconFor === idx && (
            <div className="absolute z-10 mt-24 p-2 border rounded-lg bg-background shadow-lg grid grid-cols-6 gap-1">
              {ICON_CHOICES.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setIcon(idx, icon)}
                  className="text-xl w-9 h-9 rounded hover:bg-accent"
                >
                  {icon}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <Input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Neue Aktivität…"
        />
        <Button type="button" onClick={add}>+ Hinzufügen</Button>
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={resetDefaults} className="text-muted-foreground">
        Standard wiederherstellen
      </Button>
    </div>
  )
}
