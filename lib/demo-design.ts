// Gemeinsame Demo-Basis für die vier Design-Prototypen (/design/*).
// Bewusst eigenständig: keine Abhängigkeit von cloud-sync/Store-Logik — rein lokal.

export interface DemoCategory {
  id: string
  name: string
  color: string
}

export interface DemoEntry {
  id: string
  startMin: number // Minuten ab Mitternacht (0..1440)
  endMin: number
  catId: string
  title?: string
}

export const DEMO_CATEGORIES: DemoCategory[] = [
  { id: 'arbeit', name: 'Arbeit', color: '#ef4444' },
  { id: 'soziale', name: 'Soziale', color: '#374151' },
  { id: 'geistlich', name: 'Geistlich', color: '#22c55e' },
  { id: 'vergnuegen', name: 'Vergnügen', color: '#7dd3fc' },
  { id: 'versorgung', name: 'Eigene Versorgung', color: '#a855f7' }
]

export const DEMO_DEFAULT_TITLES: Record<string, string> = {
  arbeit: 'Arbeitsblock',
  soziale: 'Treffen',
  geistlich: 'Stille Zeit',
  vergnuegen: 'Freizeit',
  versorgung: 'Versorgung'
}

/** Demo-Einträge relativ zur aktuellen Uhrzeit (minütliche Abstände um „Jetzt"). */
export function demoEntriesFor(nowMin: number): DemoEntry[] {
  const clamp = (m: number) => Math.max(0, Math.min(1440, m))
  return [
    { id: 'd1', startMin: clamp(nowMin - 200), endMin: clamp(nowMin - 80), catId: 'geistlich', title: 'Stille Zeit' },
    { id: 'd2', startMin: clamp(nowMin - 60), endMin: clamp(nowMin - 10), catId: 'arbeit', title: 'Arbeitsblock' },
    { id: 'd3', startMin: clamp(nowMin + 20), endMin: clamp(nowMin + 80), catId: 'vergnuegen', title: 'Freizeit' },
    { id: 'd4', startMin: clamp(nowMin + 110), endMin: clamp(nowMin + 170), catId: 'soziale', title: 'Treffen' }
  ]
}

export function fmtHM(min: number): string {
  const m = Math.max(0, Math.min(1439, Math.round(min)))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function catOf(id: string): DemoCategory {
  return DEMO_CATEGORIES.find(c => c.id === id) ?? DEMO_CATEGORIES[0]
}

/** Raster: Standard 5 Minuten. */
export function snapMin(raw: number, step = 5): number {
  return Math.round(raw / step) * step
}
