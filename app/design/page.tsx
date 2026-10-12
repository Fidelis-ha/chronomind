import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Chronomind · Design-Prototypen' }

const STYLES = [
  {
    slug: 'buehne',
    name: 'Bühne',
    desc: 'Immersiv & glasig: dunkle Bühne, schwebende Glas-Karten, weiches Licht, Bottom-Sheet-Popups.',
    bg: 'linear-gradient(135deg, #0b0d13, #1b2030)',
    fg: '#e8eaf2'
  },
  {
    slug: 'takt',
    name: 'Takt',
    desc: 'Brutalist & mono: Schwarz-Weiß mit Signal-Orange, harte Raster, Monospace, schnippische Animationen.',
    bg: 'linear-gradient(135deg, #ffffff, #ececec)',
    fg: '#111111'
  },
  {
    slug: 'agenda',
    name: 'Agenda',
    desc: 'Papier & Feder: Creme-Papier, Serifen, Kalendarium-Look, Popups als aufgeklappte Zettel.',
    bg: 'linear-gradient(135deg, #faf6ee, #efe6d6)',
    fg: '#2b2722'
  },
  {
    slug: 'flow',
    name: 'Flow',
    desc: 'Soft & pastellig: runde Pill-Formen, elastische Animationen, expandierende FAB, Zeitfluss-Optik.',
    bg: 'linear-gradient(135deg, #f4f3fb, #e4ecff)',
    fg: '#4a4670'
  }
]

export default function DesignIndex() {
  return (
    <main className="min-h-dvh bg-neutral-950 text-neutral-100 px-6 py-12">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Chronomind · Design-Prototypen</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Vier alternative Designkonzepte. Jede Ansicht hat einen interaktiven Zeitstrahl mit
          Demo-Einträgen: Zeit antippen → Popup → Kategorie wählen → Eintrag erstellen.
        </p>
        <div className="mt-8 grid gap-4">
          {STYLES.map(s => (
            <Link
              key={s.slug}
              href={`/design/${s.slug}`}
              className="group block rounded-2xl border border-white/10 p-5 transition-transform hover:scale-[1.02]"
              style={{ background: s.bg, color: s.fg }}
            >
              <span className="text-lg font-semibold">{s.name}</span>
              <p className="mt-1 text-sm opacity-80">{s.desc}</p>
              <span className="mt-3 inline-block text-xs underline opacity-60 group-hover:opacity-100">
                Ansicht öffnen → /design/{s.slug}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
