'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  demoEntriesFor,
  DEMO_CATEGORIES,
  DEMO_DEFAULT_TITLES,
  fmtHM,
  catOf,
  snapMin,
  type DemoEntry
} from '@/lib/demo-design'

const PX_PER_MIN = 48 / 60
const DAY_PX = 24 * 60 * PX_PER_MIN // 1152px

function minutesToPx(min: number): number {
  return (min / 60) * PX_PER_MIN * 60 // = min * 0.8
}

function pxToMinutes(y: number): number {
  return y / PX_PER_MIN
}

function longDate(d: Date): string {
  const wd = d.toLocaleDateString('de-DE', { weekday: 'long' })
  const mon = d.toLocaleDateString('de-DE', { month: 'long' })
  return `${wd}, den ${d.getDate()}. ${mon}`
}

function nowMinutes(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
}

interface Slot {
  startMin: number
  endMin: number
}

type Popup =
  | { kind: 'create'; slot: Slot }
  | { kind: 'delete'; id: string }
  | null

export default function AgendaDemo() {
  const [nowMin] = useState(nowMinutes)
  const [entries, setEntries] = useState<DemoEntry[]>(() => demoEntriesFor(Math.floor(nowMinutes())))
  const [popup, setPopup] = useState<Popup>(null)
  const [draftCat, setDraftCat] = useState('arbeit')
  const [draftTitle, setDraftTitle] = useState('')
  const [createdIds, setCreatedIds] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  // Initiale Scroll-Position: 90 Minuten vor „Jetzt“
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, minutesToPx(nowMin - 90) - 12)
    }
  }, [nowMin])

  const dateLabel = useMemo(() => longDate(new Date()), [])
  const nowTop = minutesToPx(nowMin)

  function openCreateAt(clientY: number) {
    const el = scrollRef.current
    if (!el) return
    const y = clientY - el.getBoundingClientRect().top + el.scrollTop
    const raw = pxToMinutes(y)
    const startMin = Math.max(0, Math.min(1440, snapMin(raw)))
    const endMin = Math.max(startMin + 5, Math.min(1440, startMin + 60))
    setDraftCat('arbeit')
    setDraftTitle('')
    setPopup({ kind: 'create', slot: { startMin, endMin } })
  }

  function shiftSlot(delta: number) {
    setPopup((p) => {
      if (!p || p.kind !== 'create') return p
      let start = p.slot.startMin + delta
      start = Math.max(0, Math.min(1440 - (p.slot.endMin - p.slot.startMin), start))
      const dur = p.slot.endMin - p.slot.startMin
      return { ...p, slot: { startMin: start, endMin: Math.min(1440, start + dur) } }
    })
  }

  function createEntry() {
    if (!popup || popup.kind !== 'create') return
    const id = `e${Date.now()}`
    const entry: DemoEntry = {
      id,
      startMin: popup.slot.startMin,
      endMin: popup.slot.endMin,
      catId: draftCat,
      title: draftTitle.trim() || DEMO_DEFAULT_TITLES[draftCat]
    }
    setEntries((prev) => [...prev, entry])
    setCreatedIds((prev) => new Set(prev).add(id))
    setPopup(null)
  }

  function deleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setPopup(null)
  }

  const activeCat = catOf(draftCat)
  const createSlot = popup && popup.kind === 'create' ? popup.slot : null

  return (
    <div
      className="min-h-screen text-[#2b2722]"
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        backgroundColor: '#faf6ee',
        backgroundImage:
          'radial-gradient(circle at 20% 30%, rgba(43,39,34,0.025) 0, transparent 45%), ' +
          'radial-gradient(circle at 75% 65%, rgba(43,39,34,0.02) 0, transparent 40%), ' +
          'radial-gradient(circle at 50% 90%, rgba(201,168,150,0.05) 0, transparent 50%), ' +
          'repeating-linear-gradient(0deg, rgba(43,39,34,0.018) 0px, rgba(43,39,34,0.018) 1px, transparent 1px, transparent 3px)'
      }}
    >
      <style>{`
        @keyframes pen-in {
          from { opacity: 0; transform: rotate(-1deg); }
          to   { opacity: 1; transform: rotate(0deg); }
        }
        @keyframes note-in {
          from { opacity: 0; transform: rotate(-0.6deg) scaleY(0.7); }
          to   { opacity: 1; transform: rotate(-0.6deg) scaleY(1); }
        }
        .pen-in { animation: pen-in 400ms ease-out both; }
        .note-in { transform-origin: top center; animation: note-in 250ms ease-out both; }
      `}</style>

      {/* Kalenderkopf */}
      <header className="px-4 pt-6 pb-3 text-center">
        <h1 className="text-2xl italic tracking-wide" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          Chronomind · Agenda
        </h1>
        <p className="mt-1 text-sm italic text-[#6b615a]">{dateLabel}</p>
        <div className="mx-auto mt-3 h-px w-24" style={{ backgroundColor: '#c9a896' }} />
      </header>

      {/* Zeitstrahl-Kalendarium */}
      <div
        ref={scrollRef}
        className="relative mx-auto max-w-2xl overflow-y-auto"
        style={{ height: 'calc(100vh - 130px)', minHeight: 420 }}
        onClick={(e) => openCreateAt(e.clientY)}
      >
        <div className="relative mx-4" style={{ height: DAY_PX }}>
          {/* Stundenlinien + Labels */}
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="absolute left-0 right-0"
              style={{ top: minutesToPx(h * 60), borderTop: '1px solid #c9a896' }}
            >
              <span
                className="absolute right-1 -top-4 text-[11px] italic"
                style={{ color: '#9c7f6e' }}
              >
                {fmtHM(h * 60)}
              </span>
            </div>
          ))}

          {/* Einträge */}
          {entries.map((entry) => {
            const cat = catOf(entry.catId)
            return (
              <button
                key={entry.id}
                type="button"
                className={`absolute left-0 right-8 text-left ${createdIds.has(entry.id) ? 'pen-in' : ''}`}
                style={{
                  top: minutesToPx(entry.startMin),
                  height: Math.max(24, minutesToPx(entry.endMin - entry.startMin) - 4),
                  paddingLeft: 18
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setPopup({ kind: 'delete', id: entry.id })
                }}
              >
                {/* Tinten-Punkt */}
                <span
                  className="absolute left-0.5 top-2 h-2.5 w-2.5 rounded-full"
                  style={{ background: `radial-gradient(circle at 35% 35%, ${cat.color}, ${cat.color}cc 60%, transparent 75%)` }}
                />
                <span className="block text-[15px] italic leading-snug">{entry.title}</span>
                <span className="block text-[11px] text-[#6b615a]">
                  {fmtHM(entry.startMin)} – {fmtHM(entry.endMin)}
                </span>
                {/* unregelmäßige Feder-Unterstreichung */}
                <span
                  className="absolute left-4 right-0"
                  style={{
                    bottom: 2,
                    borderBottom: `2px solid ${cat.color}`,
                    opacity: 0.7,
                    transform: 'rotate(-0.15deg) scaleY(0.9)',
                    borderRadius: '0 0 60% 40% / 0 0 100% 100%'
                  }}
                />
              </button>
            )
          })}

          {/* Jetzt-Linie */}
          <div className="absolute left-0 right-0 z-10" style={{ top: nowTop }}>
            <div style={{ borderTop: '1.5px solid #b33' }} className="relative">
              <span
                className="absolute -top-2.5 right-0 rounded-sm px-1.5 py-0.5 text-[9px] font-bold tracking-widest"
                style={{
                  color: '#b33',
                  border: '1px solid #b33',
                  backgroundColor: '#faf6ee',
                  transform: 'rotate(-2deg)'
                }}
              >
                JETZT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Papier-Zettel */}
      {popup && (
        <div className="fixed bottom-4 left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-3">
          <div
            className="note-in p-4"
            style={{
              backgroundColor: '#fffdf7',
              border: '1px solid #d8cfc0',
              boxShadow: '0 8px 24px rgba(43,39,34,0.18)',
              transform: 'rotate(-0.6deg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {popup.kind === 'create' && createSlot ? (
              <>
                <h2 className="text-lg italic">Neuer Eintrag</h2>
                <p className="mt-0.5 text-2xl tracking-wide">
                  {fmtHM(createSlot.startMin)} – {fmtHM(createSlot.endMin)}
                </p>

                {/* Zeit-Buttons */}
                <div className="mt-2 flex gap-2">
                  {[-15, -5, 5, 15].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => shiftSlot(d)}
                      className="h-8 w-8 rounded-full text-xs"
                      style={{
                        border: '1px solid #d8cfc0',
                        color: '#2b2722',
                        backgroundColor: 'transparent'
                      }}
                    >
                      {d > 0 ? `+${d}` : d}
                    </button>
                  ))}
                </div>

                {/* Kategorie-Stempel */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {DEMO_CATEGORIES.map((c) => {
                    const active = c.id === draftCat
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setDraftCat(c.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs"
                        style={{
                          border: '1px solid #d8cfc0',
                          borderRadius: 2,
                          backgroundColor: active ? `${c.color}33` : 'transparent',
                          color: '#2b2722'
                        }}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </button>
                    )
                  })}
                </div>

                {/* Titel-Input als Linien-Input */}
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createEntry()
                  }}
                  placeholder={DEMO_DEFAULT_TITLES[draftCat]}
                  className="mt-3 w-full bg-transparent pb-1 text-[15px] italic outline-none"
                  style={{ borderBottom: '1px solid #d8cfc0', color: '#2b2722' }}
                />

                <button
                  type="button"
                  onClick={createEntry}
                  className="mt-3 w-full py-2 text-sm italic"
                  style={{
                    border: '1px solid #d8cfc0',
                    backgroundColor: '#faf6ee',
                    color: '#2b2722'
                  }}
                >
                  Eintrag festhalten
                </button>
              </>
            ) : popup.kind === 'delete' ? (
              <>
                <h2 className="text-lg italic">Eintrag ausradieren?</h2>
                <p className="mt-1 text-sm text-[#6b615a]">
                  {(() => {
                    const e = entries.find((x) => x.id === popup.id)
                    return e ? `${fmtHM(e.startMin)} – ${fmtHM(e.endMin)} · ${e.title}` : ''
                  })()}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => deleteEntry(popup.id)}
                    className="flex-1 py-2 text-sm italic"
                    style={{
                      border: `1px solid ${activeCat.color}`,
                      backgroundColor: '#faf6ee',
                      color: '#b33'
                    }}
                  >
                    Ausradieren
                  </button>
                  <button
                    type="button"
                    onClick={() => setPopup(null)}
                    className="flex-1 py-2 text-sm italic"
                    style={{ border: '1px solid #d8cfc0', backgroundColor: '#faf6ee', color: '#2b2722' }}
                  >
                    Behalten
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
