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

/* ------------------------------------------------------------------ */
/* TAKT — Brutalist/Mono-Prototyp.                                     */
/* Weiß #ffffff · Tinte #111111 · ein Signal-Akzent #ff3b00.           */
/* Eckig, 2px-Linien, harte Schatten, Mono überall, keine Animationen  */
/* außer 100ms-Fades und der blinkenden Jetzt-Markierung (steps).      */
/* ------------------------------------------------------------------ */

const INK = '#111111'
const SIGNAL = '#ff3b00'
const PX_PER_MIN = 48 / 60 // 48px pro Stunde
const DAY_H = 24 * 60 * PX_PER_MIN // 1152px

const WD = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA']

function dateLabel(d: Date): string {
  return `${WD[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}.${String(
    d.getMonth() + 1
  ).padStart(2, '0')}.${d.getFullYear()}`
}

function nowMinutes(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

interface Slot {
  startMin: number
  endMin: number
}

export default function TaktDemo() {
  const [nowMin] = useState(nowMinutes)
  const [entries, setEntries] = useState<DemoEntry[]>(() => demoEntriesFor(nowMinutes()))
  const [openSlot, setOpenSlot] = useState<Slot | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DemoEntry | null>(null)
  const [draftCat, setDraftCat] = useState('arbeit')
  const [draftTitle, setDraftTitle] = useState(DEMO_DEFAULT_TITLES['arbeit'])
  const scrollRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  // Initial: Jetzt minus 90 Minuten in den Sichtbereich scrollen.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (nowMin - 90) * PX_PER_MIN - 24)
    }
  }, [nowMin])

  const hours = useMemo(() => Array.from({ length: 24 }, (_, h) => h), [])
  const panelOpen = openSlot !== null || deleteTarget !== null

  function tapTrack(e: React.MouseEvent<HTMLDivElement>) {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const min = (e.clientY - rect.top) / PX_PER_MIN
    const start = Math.max(0, Math.min(1440 - 60, snapMin(min)))
    setOpenSlot({ startMin: start, endMin: start + 60 })
    setDeleteTarget(null)
    setDraftCat('arbeit')
    setDraftTitle(DEMO_DEFAULT_TITLES['arbeit'])
  }

  function tapEntry(e: React.MouseEvent, entry: DemoEntry) {
    e.stopPropagation()
    setDeleteTarget(entry)
    setOpenSlot(null)
  }

  function nudgeStart(delta: number) {
    setOpenSlot((s) => {
      if (!s) return s
      const start = Math.max(0, Math.min(s.endMin - 5, s.startMin + delta))
      return { ...s, startMin: start }
    })
  }

  function nudgeEnd(delta: number) {
    setOpenSlot((s) => {
      if (!s) return s
      const end = Math.min(1440, Math.max(s.startMin + 5, s.endMin + delta))
      return { ...s, endMin: end }
    })
  }

  function pickCat(id: string) {
    setDraftCat(id)
    setDraftTitle(DEMO_DEFAULT_TITLES[id] ?? '')
  }

  function createEntry() {
    if (!openSlot) return
    const entry: DemoEntry = {
      id: `t${Date.now()}`,
      startMin: openSlot.startMin,
      endMin: openSlot.endMin,
      catId: draftCat,
      title: draftTitle.trim() || DEMO_DEFAULT_TITLES[draftCat] || 'Block'
    }
    setEntries((prev) => [...prev, entry])
    setOpenSlot(null)
  }

  function removeEntry() {
    if (!deleteTarget) return
    setEntries((prev) => prev.filter((en) => en.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const css = `
    .tk-root { font-family: ui-monospace, 'JetBrains Mono', monospace; background:#ffffff; color:${INK}; }
    .tk-root * { border-radius: 0 !important; }
    .tk-shadow { box-shadow: 4px 4px 0 ${INK}; }
    .tk-btn { border: 2px solid ${INK}; background:#fff; color:${INK}; text-transform:uppercase;
      letter-spacing:0.08em; font-size:11px; padding:8px 10px; transition: background 100ms, color 100ms; }
    .tk-btn:hover { background:${INK}; color:#fff; }
    .tk-btn-solid { background:${INK}; color:#fff; }
    .tk-btn-solid:hover { background:#fff; color:${INK}; }
    .tk-entry { position:absolute; left:64px; right:8px; border:2px solid ${INK};
      background-color:#fff; background-image: repeating-linear-gradient(45deg, ${INK} 0 1px, transparent 1px 7px);
      cursor:pointer; transition: background-color 100ms, color 100ms, background-image 100ms; overflow:hidden; }
    .tk-entry::before { content:''; position:absolute; left:0; top:0; bottom:0; width:6px; background:var(--c); border-right:2px solid ${INK}; }
    .tk-entry:hover { background-color:${INK}; color:#fff;
      background-image: repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 7px); }
    .tk-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; }
    .tk-time { font-size:10px; text-transform:uppercase; letter-spacing:0.08em; text-align:right; }
    .tk-hlabel { font-size:10px; text-transform:uppercase; letter-spacing:0.1em; }
    @keyframes tk-blink { 0%, 49% { opacity:1; } 50%, 100% { opacity:0; } }
    .tk-blink { animation: tk-blink 1s steps(1, end) infinite; }
    .tk-panel { animation: tk-fade 100ms linear; }
    @keyframes tk-fade { from { opacity:0; } to { opacity:1; } }
    .tk-input { border:0; border-bottom:2px solid ${INK}; background:transparent; outline:none;
      font-family:inherit; font-size:13px; text-transform:uppercase; letter-spacing:0.08em; padding:4px 0; width:100%; }
    .tk-radio { width:16px; height:16px; border:2px solid ${INK}; display:inline-flex; align-items:center; justify-content:center; flex:none; }
  `

  return (
    <div className="tk-root" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Header: schwarze Leiste, weiße Mono-Typo */}
      <header
        style={{
          background: INK,
          color: '#fff',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          flex: 'none'
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          Chronomind · Takt
        </span>
        <span className="tk-hlabel" style={{ fontSize: 12, fontWeight: 700 }}>
          {dateLabel(new Date())}
        </span>
      </header>

      {/* Zeitstrahl: eigener Scroll-Container, 24h × 48px/h */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div
          ref={trackRef}
          onClick={tapTrack}
          style={{ position: 'relative', height: DAY_H, cursor: 'crosshair' }}
        >
          {/* Stundenlinien + Labels */}
          {hours.map((h) => (
            <div
              key={h}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: h * 60 * PX_PER_MIN,
                height: 48,
                borderTop: '1px solid #111'
              }}
            >
              <span
                className="tk-hlabel"
                style={{
                  position: 'absolute',
                  left: 8,
                  top: 4,
                  background: '#fff',
                  padding: '0 3px'
                }}
              >
                {fmtHM(h * 60)}
              </span>
            </div>
          ))}

          {/* Einträge */}
          {entries.map((en) => {
            const cat = catOf(en.catId)
            return (
              <div
                key={en.id}
                className="tk-entry"
                style={{
                  top: en.startMin * PX_PER_MIN,
                  height: Math.max(22, (en.endMin - en.startMin) * PX_PER_MIN - 2),
                  '--c': cat.color
                } as React.CSSProperties}
                onClick={(e) => tapEntry(e, en)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '4px 8px 4px 14px', height: '100%' }}>
                  <span className="tk-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {en.title ?? cat.name}
                  </span>
                  <span className="tk-time">
                    {fmtHM(en.startMin)}–{fmtHM(en.endMin)}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Jetzt-Linie: 3px Signal mit blinkendem Quadrat links */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: nowMin * PX_PER_MIN - 1.5,
              height: 3,
              background: SIGNAL,
              pointerEvents: 'none',
              zIndex: 20
            }}
          >
            <span
              className="tk-blink"
              style={{
                position: 'absolute',
                left: 4,
                top: -4,
                width: 11,
                height: 11,
                background: SIGNAL
              }}
            />
          </div>
        </div>
      </div>

      {/* Popup: hartes Inline-Panel unten */}
      {panelOpen && (
        <div
          className="tk-panel"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            background: '#fff',
            borderTop: `2px solid ${INK}`,
            boxShadow: `0 -4px 0 ${INK}`,
            padding: 16,
            transform: 'none'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {openSlot && (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '0.04em' }}>
                  {fmtHM(openSlot.startMin)}–{fmtHM(openSlot.endMin)}
                </span>
                <button className="tk-btn" onClick={() => setOpenSlot(null)}>
                  Abbrechen
                </button>
              </div>

              {/* Start / Ende justieren */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                <button className="tk-btn" onClick={() => nudgeStart(-15)}>−15 Start</button>
                <button className="tk-btn" onClick={() => nudgeStart(-5)}>−5 Start</button>
                <button className="tk-btn" onClick={() => nudgeEnd(5)}>+5 Ende</button>
                <button className="tk-btn" onClick={() => nudgeEnd(15)}>+15 Ende</button>
              </div>

              {/* Kategorie-Wahl als Liste mit Radio-Quadrat */}
              <div style={{ borderTop: `2px solid ${INK}`, marginBottom: 14 }}>
                {DEMO_CATEGORIES.map((c) => {
                  const active = c.id === draftCat
                  return (
                    <button
                      key={c.id}
                      onClick={() => pickCat(c.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 2px',
                        borderBottom: `1px solid ${INK}`,
                        background: active ? INK : 'transparent',
                        color: active ? '#fff' : INK,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        transition: 'background 100ms, color 100ms'
                      }}
                    >
                      <span className="tk-radio" style={{ borderColor: active ? '#fff' : INK }}>
                        {active && <i style={{ background: active ? '#fff' : INK, width: 8, height: 8, display: 'block' }} />}
                      </span>
                      <span style={{ width: 10, height: 10, background: c.color, flex: 'none', border: `1px solid ${active ? '#fff' : INK}` }} />
                      {c.name}
                    </button>
                  )
                })}
              </div>

              {/* Titel */}
              <input
                className="tk-input"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="TITEL"
                aria-label="Titel"
              />

              <button
                className="tk-btn tk-btn-solid"
                onClick={createEntry}
                style={{ width: '100%', marginTop: 14, padding: '12px 10px', fontSize: 12 }}
              >
                Eintrag erstellen
              </button>
            </>
          )}

          {deleteTarget && (
            <>
              <div style={{ fontSize: 24, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Eintrag löschen?
              </div>
              <div className="tk-time" style={{ textAlign: 'left', marginBottom: 14 }}>
                {fmtHM(deleteTarget.startMin)}–{fmtHM(deleteTarget.endMin)} · {(deleteTarget.title ?? catOf(deleteTarget.catId).name).toUpperCase()}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="tk-btn tk-btn-solid" onClick={removeEntry} style={{ flex: 1, padding: '12px 10px' }}>
                  Löschen
                </button>
                <button className="tk-btn" onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '12px 10px' }}>
                  Abbrechen
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
