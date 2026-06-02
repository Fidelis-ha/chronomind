'use client'

import { useState, useEffect, useMemo } from 'react'
import { type TimeEntry } from '@/lib/types'
import {
  DurationChart,
  CategoryPieChart,
  WeeklySummary
} from '@/components/analytics/ChartComponents'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

const STORAGE_KEY = 'chronomind_entries'

function loadEntries(): TimeEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

interface DayData {
  date: string
  hours: number
}

interface CategoryData {
  name: string
  value: number
  color: string
}

function getLast7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    days.push(date.toISOString().split('T')[0])
  }
  return days
}

function formatWeekday(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE', { weekday: 'short' })
}

function getMostActiveDay(dayMap: Map<string, number>): string {
  let maxDay = ''
  let maxHours = 0
  dayMap.forEach((hours, day) => {
    if (hours > maxHours) {
      maxHours = hours
      maxDay = formatWeekday(day)
    }
  })
  return maxDay || '-'
}

export function AnalyticsClient() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setEntries(loadEntries())
    setLoading(false)
  }, [])

  const last7Days = useMemo(() => getLast7Days(), [])

  const chartData = useMemo((): DayData[] => {
    const dayMap = new Map<string, number>()

    last7Days.forEach(day => dayMap.set(day, 0))

    entries.forEach(entry => {
      if (!entry.duration_seconds) return
      const entryDate = new Date(entry.started_at).toISOString().split('T')[0]
      if (dayMap.has(entryDate)) {
        const current = dayMap.get(entryDate) || 0
        dayMap.set(entryDate, current + entry.duration_seconds / 3600)
      }
    })

    return last7Days.map(day => ({
      date: day,
      hours: Math.round((dayMap.get(day) || 0) * 10) / 10
    }))
  }, [entries, last7Days])

  const categoryData = useMemo((): CategoryData[] => {
    const catMap = new Map<string, number>()

    entries.forEach(entry => {
      const cat = entry.category || 'Ohne Kategorie'
      const current = catMap.get(cat) || 0
      catMap.set(cat, current + (entry.duration_seconds || 0) / 3600)
    })

    return Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 10) / 10, color: '' }))
      .sort((a, b) => b.value - a.value)
  }, [entries])

  const weeklyStats = useMemo(() => {
    const totalHours = chartData.reduce((sum, d) => sum + d.hours, 0)
    const totalEntries = entries.filter(e => {
      const entryDate = new Date(e.started_at).toISOString().split('T')[0]
      return last7Days.includes(entryDate)
    }).length

    const dayMap = new Map<string, number>()
    chartData.forEach(d => dayMap.set(d.date, d.hours))

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      totalEntries,
      avgHoursPerDay: Math.round((totalHours / 7) * 10) / 10,
      mostActiveDay: getMostActiveDay(dayMap)
    }
  }, [chartData, entries, last7Days])

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="text-center py-8 text-muted-foreground">
          Wird geladen...
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Auswertung</h1>
        <Button variant="outline" asChild>
          <Link href="/app_main/entries">Alle Einträge</Link>
        </Button>
      </div>

      <WeeklySummary
        totalHours={weeklyStats.totalHours}
        totalEntries={weeklyStats.totalEntries}
        avgHoursPerDay={weeklyStats.avgHoursPerDay}
        mostActiveDay={weeklyStats.mostActiveDay}
      />

      <Separator className="my-8" />

      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Stunden pro Tag (letzte 7 Tage)</h2>
          <div className="p-6 rounded-lg border bg-card">
            <DurationChart data={chartData} />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Zeit nach Kategorie</h2>
          <div className="p-6 rounded-lg border bg-card">
            <CategoryPieChart data={categoryData} />
          </div>
        </div>

        {categoryData.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Kategorie-Übersicht</h2>
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Kategorie</th>
                    <th className="text-right p-3 font-medium">Stunden</th>
                    <th className="text-right p-3 font-medium">Anteil</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData.map((cat, i) => (
                    <tr key={cat.name} className="border-b last:border-0">
                      <td className="p-3">{cat.name}</td>
                      <td className="p-3 text-right">{cat.value.toFixed(1)} Std.</td>
                      <td className="p-3 text-right text-muted-foreground">
                        {weeklyStats.totalHours > 0
                          ? `${((cat.value / weeklyStats.totalHours) * 100).toFixed(1)}%`
                          : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}