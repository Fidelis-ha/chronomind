'use client'

import { useState, useEffect, useMemo } from 'react'
import { type TimeEntry } from '@/lib/types'
import { loadEntries, ENTRIES_CHANGED_EVENT } from '@/lib/entries-store'
import {
  WeeklySummary,
  CategoryDonut,
  DailyStackedBars,
  TopActivities,
  HourlyProfile,
  WeeklyTrend
} from '@/components/analytics/ChartComponents'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

type RangeKey = '7' | '30' | '90' | 'all'

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '7', label: '7 Tage', days: 7 },
  { key: '30', label: '30 Tage', days: 30 },
  { key: '90', label: '90 Tage', days: 90 },
  { key: 'all', label: 'Alles', days: null }
]

function withinRange(entry: TimeEntry, days: number | null): boolean {
  if (days === null) return true
  const cutoff = Date.now() - days * 86_400_000
  return new Date(entry.started_at).getTime() >= cutoff
}

export function AnalyticsClient() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<RangeKey>('30')

  useEffect(() => {
    const update = () => setEntries(loadEntries())
    update()
    setLoading(false)
    window.addEventListener(ENTRIES_CHANGED_EVENT, update)
    return () => window.removeEventListener(ENTRIES_CHANGED_EVENT, update)
  }, [])

  const filtered = useMemo(
    () => entries.filter(e => withinRange(e, RANGES.find(r => r.key === range)!.days)),
    [entries, range]
  )

  const stats = useMemo(() => {
    const totalHours = filtered.reduce((s, e) => s + (e.duration_seconds || 0) / 3600, 0)
    const dayMap = new Map<string, number>()
    filtered.forEach(e => {
      if (!e.duration_seconds) return
      const d = new Date(e.started_at).toISOString().split('T')[0]
      dayMap.set(d, (dayMap.get(d) || 0) + e.duration_seconds / 3600)
    })
    let maxHours = 0
    let maxDay = '-'
    dayMap.forEach((h, d) => {
      if (h > maxHours) {
        maxHours = h
        maxDay = new Date(d).toLocaleDateString('de-DE', { weekday: 'short' })
      }
    })
    const dayCount = Math.max(dayMap.size, 1)
    return {
      totalHours: Math.round(totalHours * 10) / 10,
      totalEntries: filtered.length,
      avgHoursPerDay: Math.round((totalHours / dayCount) * 10) / 10,
      mostActiveDay: maxDay
    }
  }, [filtered])

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="text-center py-8 text-muted-foreground">Wird geladen...</div>
      </div>
    )
  }

  const rangeDays = RANGES.find(r => r.key === range)!.days

  return (
    <div className="container mx-auto max-w-4xl py-6 px-4 sm:py-8">
      <div className="flex justify-end mb-4">
        <Button variant="outline" asChild>
          <Link href="/app_main/entries">Alle Einträge</Link>
        </Button>
      </div>

      {/* Zeitraum-Filter */}
      <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Zeitraum wählen">
        {RANGES.map(r => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            aria-pressed={range === r.key}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors [font-variant-numeric:tabular-nums] ${
              range === r.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <WeeklySummary
        totalHours={stats.totalHours}
        totalEntries={stats.totalEntries}
        avgHoursPerDay={stats.avgHoursPerDay}
        mostActiveDay={stats.mostActiveDay}
      />

      <Separator className="my-8" />

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-4">Verteilung nach Hauptkategorie</h2>
          <div className="p-4 sm:p-6 rounded-2xl border border-outline-variant bg-surface-container-low">
            <CategoryDonut entries={filtered} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Zeit pro Tag nach Hauptkategorie</h2>
          <div className="p-4 sm:p-6 rounded-2xl border border-outline-variant bg-surface-container-low">
            <DailyStackedBars entries={filtered} days={rangeDays ?? 90} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Top 8 Aktivitäten</h2>
          <div className="p-4 sm:p-6 rounded-2xl border border-outline-variant bg-surface-container-low">
            <TopActivities entries={filtered} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Tageszeit-Profil</h2>
          <div className="p-4 sm:p-6 rounded-2xl border border-outline-variant bg-surface-container-low">
            <HourlyProfile entries={filtered} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Wochenverlauf (letzte 12 Wochen)</h2>
          <div className="p-4 sm:p-6 rounded-2xl border border-outline-variant bg-surface-container-low">
            <WeeklyTrend entries={filtered} />
          </div>
        </section>
      </div>
    </div>
  )
}
