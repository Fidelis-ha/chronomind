'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  demoEntriesFor,
  DEMO_CATEGORIES,
  DEMO_DEFAULT_TITLES,
  fmtHM,
  catOf,
  snapMin,
  type DemoEntry
} from '@/lib/demo-design'

const HOUR_PX = 48 // 48px pro Stunde

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function FlowDemo() {
  const [nowMin, setNowMin] = useState(() => {
    const d = new Date()
    return snapMin(d.getHours() * 60 + d.getMinutes())
  })
  const [entries, setEntries] = useState<DemoEntry[]>(() => demoEntriesFor(nowMin))
  const [openSlot, setOpenSlot] = useState<{ startMin: number; endMin: number } | null>(null)
  const [draftCat, setDraftCat] = useState<string>('arbeit')
  const [draftTitle, setDraftTitle] = useState('')
  const [removeTarget, setRemoveTarget] = useState<DemoEntry | null>(null)
  const [popping, setPopping] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(false)

  // Initiale Scroll-Position: jetzt − 90min
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    const el = scrollRef.current
    if (el) el.scrollTop = Math.max(0, (nowMin - 90) / 60) * HOUR_PX
  }, [nowMin])

  // Uhr leicht weiterticken (Visual-Polish für die Jetzt-Linie)
  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date()
      setNowMin(d.getHours() * 60 + d.getMinutes())
    }, 30000)
    return () => clearInterval(t)
  }, [])

  const defaultSlot = useMemo(() => {
    const s = snapMin(nowMin)
    return { startMin: s, endMin: Math.min(1440, s + 60) }
  }, [nowMin])

  function openPopup(slot: { startMin: number; endMin: number }) {
    setOpenSlot(slot)
    setDraftCat('arbeit')
    setDraftTitle('')
  }

  function nudge(which: 'start' | 'end', delta: number) {
    setOpenSlot(prev => {
      if (!prev) return prev
      let start = prev.startMin
      let end = prev.endMin
      if (which === 'start') start = Math.max(0, Math.min(1440, start + delta))
      else end = Math.max(0, Math.min(1440, end + delta))
      if (start >= end) return prev
      return { startMin: start, endMin: end }
    })
  }

  function createEntry() {
    if (!openSlot) return
    const id = `f${Date.now()}`
    const cat = catOf(draftCat)
    setEntries(prev => [...prev, { id, startMin: openSlot.startMin, endMin: openSlot.endMin, catId: cat.id, title: draftTitle.trim() || DEMO_DEFAULT_TITLES[cat.id] }])
    setPopping(id)
    setOpenSlot(null)
    setTimeout(() => setPopping(null), 400)
  }

  function tapTimeline(e: React.MouseEvent<HTMLDivElement>) {
    if (!scrollRef.current) return
    const rect = scrollRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top + scrollRef.current.scrollTop
    const start = snapMin((y / HOUR_PX) * 60)
    if (start < 0 || start >= 1440) return
    openPopup({ startMin: start, endMin: Math.min(1440, start + 60) })
  }

  const sorted = useMemo(() => [...entries].sort((a, b) => a.startMin - b.startMin), [entries])

  return (
    <div
      className="relative min-h-screen overflow-hidden font-sans"
      style={{ background: '#f4f3fb' }}
    >
      {/* Weiche Hintergrund-Blobs */}
      <div
        aria-hidden
        className="absolute -top-32 -left-24 h-96 w-96 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, #e9e4ff 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, #dff0ff 0%, transparent 70%)' }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-40 pt-8">
        <h1 className="text-2xl font-semibold" style={{ fontSize: 24, color: '#3a3654' }}>
          Chronomind · Flow
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#8b87a8' }}>
          Tippe auf den Zeitstrahl oder das Plus, um einen Block zu setzen.
        </p>

        {/* Zeitstrahl */}
        <div
          ref={scrollRef}
          className="relative mt-6 flex-1 overflow-y-auto rounded-3xl bg-white/40 pr-1"
          style={{ maxHeight: 'calc(100vh - 220px)', scrollbarWidth: 'thin' }}
        >
          <div
            className="relative cursor-pointer"
            style={{ height: 1440 / 60 * HOUR_PX }}
            onClick={e => {
              if ((e.target as HTMLElement).closest('[data-entry]')) return
              tapTimeline(e)
            }}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="absolute left-0 right-0 flex items-center" style={{ top: h * HOUR_PX }}>
                <span
                  className="z-10 rounded-full bg-white px-2 text-xs"
                  style={{ color: '#8b87a8', marginLeft: 4, boxShadow: '0 1px 4px rgba(124,111,240,0.10)' }}
                >
                  {fmtHM(h * 60)}
                </span>
                <div
                  className="ml-2 flex-1 border-t border-dashed"
                  style={{ borderColor: '#d5d2e8' }}
                />
              </div>
            ))}

            {/* Jetzt-Linie */}
            <div
              className="pointer-events-none absolute left-0 right-0 flex items-center"
              style={{ top: (nowMin / 60) * HOUR_PX - 1.5 }}
            >
              <div
                style={{
                  height: 3,
                  flex: 1,
                  borderRadius: 9999,
                  background: 'linear-gradient(90deg, transparent, #7c6ff0, transparent)',
                  transformOrigin: 'center',
                  animation: 'flow-pulse 4s ease-in-out infinite'
                }}
              />
              <span
                className="ml-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                style={{ background: '#7c6ff0' }}
              >
                jetzt
              </span>
            </div>

            {/* Einträge als Pills */}
            {sorted.map(en => {
              const cat = catOf(en.catId)
              return (
                <button
                  key={en.id}
                  data-entry
                  onClick={() => setRemoveTarget(en)}
                  className={`absolute left-3 right-3 flex items-center gap-2 rounded-full px-4 py-2.5 text-left transition-shadow ${en.id === popping ? 'flow-pop' : ''}`}
                  style={{
                    top: (en.startMin / 60) * HOUR_PX + 2,
                    height: Math.max(30, ((en.endMin - en.startMin) / 60) * HOUR_PX - 4),
                    background: hexToRgba(cat.color, 0.18),
                    boxShadow: '0 2px 10px rgba(124,111,240,0.10)'
                  }}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cat.color }} />
                  <span className="truncate text-sm font-medium" style={{ color: '#3a3654' }}>
                    {en.title || DEMO_DEFAULT_TITLES[cat.id]}
                  </span>
                  <span className="ml-auto shrink-0 text-xs" style={{ color: '#8b87a8' }}>
                    {fmtHM(en.startMin)}–{fmtHM(en.endMin)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => (openSlot ? setOpenSlot(null) : openPopup(defaultSlot))}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white transition-transform active:scale-90"
        style={{ background: '#7c6ff0', boxShadow: '0 8px 24px rgba(124,111,240,0.45)' }}
        aria-label="Neuer Eintrag"
      >
        {openSlot ? <X size={24} /> : <Plus size={28} />}
      </button>

      {/* Erstellen-Popup (expandierende Karte vom FAB) */}
      {openSlot && (
        <div
          className="flow-popup fixed bottom-24 right-6 z-40 w-72 rounded-3xl bg-white p-5 shadow-xl"
          style={{ transformOrigin: 'bottom right' }}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium" style={{ color: '#8b87a8' }}>
              Zeitraum
            </span>
            <span className="text-lg font-semibold" style={{ color: '#3a3654' }}>
              {fmtHM(openSlot.startMin)} – {fmtHM(openSlot.endMin)}
            </span>
          </div>

          <div className="mt-3 flex gap-1.5">
            {([['start', -15], ['start', -5], ['end', 5], ['end', 15]] as const).map(([which, d]) => (
              <button
                key={`${which}${d}`}
                onClick={() => nudge(which, d)}
                className="flex-1 rounded-full bg-gray-100 py-1.5 text-xs font-medium transition-colors hover:bg-gray-200"
                style={{ color: '#5a5578' }}
              >
                {d > 0 ? `+${d}` : d}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {DEMO_CATEGORIES.map(c => {
              const active = draftCat === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setDraftCat(c.id)}
                  className="flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-2.5 text-xs transition-all"
                  style={{
                    background: active ? hexToRgba(c.color, 0.14) : 'transparent',
                    boxShadow: active ? `0 0 0 2px ${c.color}` : 'none',
                    color: '#5a5578'
                  }}
                >
                  <span className="h-3.5 w-3.5 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </button>
              )
            })}
          </div>

          <input
            value={draftTitle}
            onChange={e => setDraftTitle(e.target.value)}
            placeholder={DEMO_DEFAULT_TITLES[draftCat]}
            className="mt-4 w-full rounded-full bg-gray-100 px-4 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#7c6ff0]/40"
          />

          <button
            onClick={createEntry}
            className="mt-4 w-full rounded-full py-2.5 text-sm font-semibold text-white transition-transform active:scale-95"
            style={{ background: '#7c6ff0' }}
          >
            Losgeht&apos;s
          </button>
        </div>
      )}

      {/* Entfernen-Popup */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setRemoveTarget(null)}>
          <div
            className="flow-popup mx-6 flex items-center gap-2 rounded-full bg-white py-2 pl-4 pr-2 shadow-xl"
            style={{ transformOrigin: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <span className="text-sm" style={{ color: '#5a5578' }}>Entfernen?</span>
            <button
              onClick={() => {
                setEntries(prev => prev.filter(x => x.id !== removeTarget.id))
                setRemoveTarget(null)
              }}
              className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-500"
            >
              Entfernen
            </button>
            <button
              onClick={() => setRemoveTarget(null)}
              className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold"
              style={{ color: '#5a5578' }}
            >
              Behalten
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes flow-pulse {
          0%, 100% { transform: scaleX(1); opacity: 0.9; }
          50% { transform: scaleX(0.86); opacity: 0.65; }
        }
        @keyframes flow-pop-key {
          0% { transform: scale(0.7); }
          60% { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        .flow-pop {
          animation: flow-pop-key 350ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes flow-popup-key {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .flow-popup {
          animation: flow-popup-key 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  )
}
