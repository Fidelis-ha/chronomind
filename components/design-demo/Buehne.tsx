'use client'

import { useEffect, useRef, useState } from 'react'
import {
  demoEntriesFor,
  DEMO_CATEGORIES,
  DEMO_DEFAULT_TITLES,
  fmtHM,
  catOf,
  snapMin,
  type DemoEntry
} from '@/lib/demo-design'

const PX_PER_H = 48
const PX_PER_MIN = PX_PER_H / 60
const TRACK_H = 24 * PX_PER_H // 1152px

function nowMinutes(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

const clamp = (m: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, m))

export default function BuehneDemo() {
  const [nowMin, setNowMin] = useState<number>(() => nowMinutes())
  const [entries, setEntries] = useState<DemoEntry[]>(() => demoEntriesFor(nowMinutes()))
  const [openSlot, setOpenSlot] = useState<{ startMin: number; endMin: number } | null>(null)
  const [draftCat, setDraftCat] = useState<string>(DEMO_CATEGORIES[0].id)
  const [draftTitle, setDraftTitle] = useState<string>('')
  const [pendingDelete, setPendingDelete] = useState<DemoEntry | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll-to-now: ausschließlich im Mount-Effect (smooth).
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const t = window.setTimeout(() => {
      el.scrollTo({ top: Math.max(0, (nowMinutes() - 90) * PX_PER_MIN), behavior: 'smooth' })
    }, 120)
    const iv = window.setInterval(() => setNowMin(nowMinutes()), 60_000)
    return () => {
      window.clearTimeout(t)
      window.clearInterval(iv)
    }
  }, [])

  function handleTrackTap(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const min = (e.clientY - rect.top) / PX_PER_MIN
    const start = clamp(snapMin(min), 0, 1440 - 60)
    setOpenSlot({ startMin: start, endMin: start + 60 })
    setDraftCat(DEMO_CATEGORIES[0].id)
    setDraftTitle('')
  }

  function adjustSlot(part: 'start' | 'end', delta: number) {
    setOpenSlot(s => {
      if (!s) return s
      if (part === 'start') {
        return { ...s, startMin: clamp(s.startMin + delta, 0, s.endMin - 5) }
      }
      return { ...s, endMin: clamp(s.endMin + delta, s.startMin + 5, 1440) }
    })
  }

  function createEntry() {
    if (!openSlot) return
    const entry: DemoEntry = {
      id: `e${Date.now()}`,
      startMin: openSlot.startMin,
      endMin: openSlot.endMin,
      catId: draftCat,
      ...(draftTitle.trim() ? { title: draftTitle.trim() } : {})
    }
    setEntries(prev => [...prev, entry])
    setOpenSlot(null)
  }

  const dateLabel = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  })

  const hours = Array.from({ length: 25 }, (_, h) => h)

  return (
    <div className="min-h-[100dvh] bg-[#0b0d13] text-[#e8eaf2] antialiased">
      <style>{`
        @keyframes buehne-rise {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes buehne-sheet {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes buehne-breathe {
          0%, 100% { box-shadow: 0 0 8px 2px rgba(245, 197, 66, 0.35); }
          50%      { box-shadow: 0 0 20px 7px rgba(245, 197, 66, 0.75); }
        }
      `}</style>

      {/* Kopfzeile */}
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-[28px] leading-tight font-sans tracking-wide font-light">
          Chronomind · <span className="font-medium">Bühne</span>
        </h1>
        <p className="mt-1 text-xs text-white/40 tracking-wide">{dateLabel}</p>
      </header>

      {/* Zeitstrahl */}
      <div
        ref={scrollRef}
        className="overflow-y-auto border-t border-white/10 bg-[radial-gradient(120%_60%_at_50%_0%,rgba(255,255,255,0.05),transparent_70%)]"
        style={{ height: 'calc(100dvh - 96px)' }}
      >
        <div
          className="relative w-full cursor-copy select-none"
          style={{ height: TRACK_H }}
          onClick={handleTrackTap}
        >
          {/* Stundenlinien + Labels */}
          {hours.map(h => (
            <div key={h}>
              <div
                className="absolute inset-x-0 h-px bg-white/8"
                style={{ top: h * PX_PER_H }}
              />
              <span
                className="absolute left-2 -translate-y-1/2 text-[10px] text-white/40"
                style={{ top: h * PX_PER_H }}
              >
                {fmtHM(h * 60)}
              </span>
            </div>
          ))}

          {/* Einträge */}
          {entries.map(en => {
            const cat = catOf(en.catId)
            return (
              <button
                key={en.id}
                type="button"
                onClick={ev => {
                  ev.stopPropagation()
                  setPendingDelete(en)
                }}
                className="absolute left-14 right-2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-left backdrop-blur-md transition-transform active:scale-[0.98]"
                style={{
                  top: en.startMin * PX_PER_MIN,
                  height: Math.max(28, (en.endMin - en.startMin) * PX_PER_MIN),
                  borderLeft: `3px solid ${cat.color}`,
                  boxShadow: `0 0 24px -6px ${cat.color}55, 0 8px 24px -12px rgba(0,0,0,0.6)`,
                  animation: 'buehne-rise 250ms ease-out both'
                }}
              >
                <div className="truncate text-sm font-medium tracking-wide">{en.title ?? DEMO_DEFAULT_TITLES[en.catId] ?? cat.name}</div>
                <div className="text-[11px] text-white/50 tracking-wide">
                  {fmtHM(en.startMin)} – {fmtHM(en.endMin)}
                </div>
              </button>
            )
          })}

          {/* Jetzt-Linie */}
          <div
            className="pointer-events-none absolute inset-x-0 z-10"
            style={{ top: nowMin * PX_PER_MIN }}
          >
            <div
              className="h-[2px] w-full bg-[#f5c542]"
              style={{ animation: 'buehne-breathe 3s ease-in-out infinite' }}
            />
            <span className="absolute right-2 -top-5 rounded-full bg-[#f5c542]/15 px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#f5c542] backdrop-blur-sm">
              {fmtHM(nowMin)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom-Sheet: neuer Eintrag */}
      {openSlot && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
            onClick={() => setOpenSlot(null)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-b-0 border-white/10 bg-[#12141c]/95 px-5 pb-8 pt-5 backdrop-blur-md shadow-[0_-16px_48px_-12px_rgba(0,0,0,0.7)]"
            style={{ animation: 'buehne-sheet 300ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <p className="text-2xl font-light tracking-wide">
              {fmtHM(openSlot.startMin)} <span className="text-white/40">–</span> {fmtHM(openSlot.endMin)}
            </p>
            <p className="mt-0.5 text-xs text-white/40 tracking-wide">Neuer Zeitblock</p>

            {/* Start */}
            <div className="mt-5 flex items-center gap-2">
              <span className="w-12 text-xs text-white/50 tracking-wide">Start</span>
              {[-15, -5].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => adjustSlot('start', d)}
                  className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs tracking-wide backdrop-blur-md active:scale-95"
                >
                  {d}
                </button>
              ))}
            </div>
            {/* Ende */}
            <div className="mt-2 flex items-center gap-2">
              <span className="w-12 text-xs text-white/50 tracking-wide">Ende</span>
              {[5, 15].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => adjustSlot('end', d)}
                  className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs tracking-wide backdrop-blur-md active:scale-95"
                >
                  +{d}
                </button>
              ))}
            </div>

            {/* Kategorien */}
            <div className="mt-5 flex flex-wrap gap-2">
              {DEMO_CATEGORIES.map(c => {
                const active = draftCat === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setDraftCat(c.id)}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs tracking-wide backdrop-blur-md transition-colors"
                    style={{
                      borderColor: active ? c.color : 'rgba(255,255,255,0.12)',
                      backgroundColor: active ? `${c.color}22` : 'rgba(255,255,255,0.06)'
                    }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </button>
                )
              })}
            </div>

            {/* Titel */}
            <input
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              placeholder={DEMO_DEFAULT_TITLES[draftCat] ?? 'Titel'}
              className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm tracking-wide text-[#e8eaf2] placeholder:text-white/30 outline-none focus:border-white/25"
            />

            <button
              type="button"
              onClick={createEntry}
              className="mt-4 w-full rounded-xl border border-white/15 bg-white/[0.06] py-3 text-sm font-medium tracking-wide backdrop-blur-md transition-transform active:scale-[0.98]"
              style={{ boxShadow: `0 0 24px -6px ${catOf(draftCat).color}55` }}
            >
              Eintrag erstellen
            </button>
          </div>
        </>
      )}

      {/* Bestätigungs-Popup: löschen */}
      {pendingDelete && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
            onClick={() => setPendingDelete(null)}
          />
          <div
            className="fixed left-1/2 top-1/2 z-50 w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#12141c]/95 p-5 text-center backdrop-blur-md shadow-[0_16px_48px_-12px_rgba(0,0,0,0.7)]"
            style={{ animation: 'buehne-rise 250ms ease-out both' }}
          >
            <p className="text-sm font-medium tracking-wide">Eintrag löschen?</p>
            <p className="mt-1 text-xs text-white/40 tracking-wide">
              {pendingDelete.title ?? catOf(pendingDelete.catId).name} ·{' '}
              {fmtHM(pendingDelete.startMin)} – {fmtHM(pendingDelete.endMin)}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.06] py-2.5 text-xs tracking-wide backdrop-blur-md active:scale-95"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntries(prev => prev.filter(x => x.id !== pendingDelete.id))
                  setPendingDelete(null)
                }}
                className="flex-1 rounded-xl border border-red-400/30 bg-red-500/20 py-2.5 text-xs tracking-wide text-red-200 backdrop-blur-md active:scale-95"
              >
                Löschen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
