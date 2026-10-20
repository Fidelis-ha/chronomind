'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Chart as ChartJS, type ChartData, type ChartOptions } from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { baseChartOptions, themeColors } from './chart-registry'
import { colorForPath } from '@/lib/categories'
import { useChartThemeVersion } from './useChartTheme'
import { SONSTIGE_LABEL, mainCategory, mainCategoryColor } from './chart-helpers'
import { IconChartBar } from '@/components/ui/icons'
import type { TimeEntry } from '@/lib/types'

const SONSTIGE_COLOR = '#9e9e9e'
const CHART_HEIGHT = 240

/* ---------- Lazy Render via IntersectionObserver ---------- */

function LazyChart({
  render,
  empty
}: {
  render: () => React.ReactNode
  empty: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <IconChartBar className="h-10 w-10 text-on-surface-variant" aria-hidden />
        <p className="text-sm font-medium text-on-surface">Keine Daten im gewählten Zeitraum</p>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ height: CHART_HEIGHT }}>
      {visible ? render() : null}
    </div>
  )
}

/* ---------- 1) Kategorien-Donut ---------- */

export function CategoryDonut({ entries }: { entries: TimeEntry[] }) {
  const themeVer = useChartThemeVersion()
  const empty = useMemo(() => entries.every(e => !e.duration_seconds), [entries])

  const { data, options } = useMemo(() => {
    const t = themeColors()
    const map = new Map<string, number>()
    entries.forEach(e => {
      if (!e.duration_seconds) return
      const main = mainCategory(e.category)
      map.set(main, (map.get(main) || 0) + e.duration_seconds / 3600)
    })
    const labels: string[] = []
    const values: number[] = []
    const colors: string[] = []
    Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, hours]) => {
        labels.push(name)
        values.push(Math.round(hours * 10) / 10)
        colors.push(name === SONSTIGE_LABEL ? SONSTIGE_COLOR : colorForPath(name) || SONSTIGE_COLOR)
      })

    const chartData: ChartData<'doughnut'> = {
      labels,
      datasets: [
        { data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }
      ]
    }
    const chartOptions: ChartOptions<'doughnut'> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: t.onSurfaceVariant,
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            boxHeight: 8,
            font: { size: 12 }
          }
        },
        tooltip: {
          backgroundColor: t.surfaceContainerHigh,
          borderColor: t.outlineVariant,
          borderWidth: 1,
          titleColor: t.onSurface,
          bodyColor: t.onSurface,
          callbacks: { label: ctx => ` ${ctx.parsed.toFixed(1)} Std.` }
        }
      }
    }
    return { data: chartData, options: chartOptions }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, themeVer])

  return (
    <LazyChart
      empty={empty}
      render={() => <Chart type="doughnut" data={data} options={options} />}
    />
  )
}

/* ---------- 2) Gestapelte Tagesbalken ---------- */

export function DailyStackedBars({ entries, days }: { entries: TimeEntry[]; days: number }) {
  const themeVer = useChartThemeVersion()
  const empty = useMemo(() => entries.every(e => !e.duration_seconds), [entries])

  const { data, options } = useMemo(() => {
    const t = themeColors()
    const maxDays = Math.min(days, 30)
    const byDate = new Map<string, Map<string, number>>()
    entries.forEach(e => {
      if (!e.duration_seconds) return
      const date = new Date(e.started_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      if (!byDate.has(key)) byDate.set(key, new Map())
      const cat = mainCategory(e.category)
      const m = byDate.get(key)!
      m.set(cat, (m.get(cat) || 0) + e.duration_seconds / 3600)
    })

    const dateKeys = Array.from(byDate.keys()).sort().slice(-maxDays)
    const catSet = new Set<string>()
    dateKeys.forEach(d => byDate.get(d)?.forEach((_, c) => catSet.add(c)))
    const cats = Array.from(catSet)
    const catColor = (c: string) =>
      c === SONSTIGE_LABEL ? SONSTIGE_COLOR : colorForPath(c) || SONSTIGE_COLOR

    const datasets = cats.map(c => ({
      label: c,
      data: dateKeys.map(d => Math.round(((byDate.get(d)?.get(c) || 0)) * 100) / 100),
      backgroundColor: catColor(c),
      stack: 'tag',
      borderRadius: 3
    }))

    const labels = dateKeys.map(d => {
      const [y, m, day] = d.split('-')
      return `${day}.${m}.`
    })

    const base = baseChartOptions(t)
    const chartOptions: ChartOptions<'bar'> = {
      ...(base as ChartOptions<'bar'>),
      plugins: {
        ...base.plugins,
        legend: { ...base.plugins!.legend, display: cats.length > 0 },
        tooltip: {
          ...base.plugins!.tooltip,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(1)} Std.`
          }
        }
      }
    }

    return {
      data: { labels, datasets } as ChartData<'bar'>,
      options: chartOptions
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, days, themeVer])

  return (
    <LazyChart empty={empty} render={() => <Chart type="bar" data={data} options={options} />} />
  )
}

/* ---------- 3) Top-8-Aktivitäten (horizontal) ---------- */

export function TopActivities({ entries }: { entries: TimeEntry[] }) {
  const themeVer = useChartThemeVersion()
  const empty = useMemo(() => entries.every(e => !e.duration_seconds), [entries])

  const { data, options } = useMemo(() => {
    const t = themeColors()
    const map = new Map<string, number>()
    entries.forEach(e => {
      if (!e.duration_seconds) return
      const title = e.title || 'Ohne Titel'
      map.set(title, (map.get(title) || 0) + e.duration_seconds / 3600)
    })
    const top = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)

    const labels = top.map(([title]) => {
      const suffix = title.split('/').pop() || title
      return suffix.length > 32 ? suffix.slice(0, 31) + '…' : suffix
    })
    const values = top.map(([, h]) => Math.round(h * 100) / 100)

    const chartData: ChartData<'bar'> = {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: 'var(--md-primary)',
          borderRadius: 3
        }
      ]
    }

    const chartOptions: ChartOptions<'bar'> = {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: t.surfaceContainerHigh,
          borderColor: t.outlineVariant,
          borderWidth: 1,
          titleColor: t.onSurface,
          bodyColor: t.onSurface,
          callbacks: { label: ctx => ` ${Number(ctx.parsed.x).toFixed(1)} Std.` }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: t.outlineVariant },
          border: { display: false },
          ticks: { color: t.onSurfaceVariant, font: { size: 11 } }
        },
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: t.onSurfaceVariant, font: { size: 11 } }
        }
      }
    }
    return { data: chartData, options: chartOptions }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, themeVer])

  return (
    <LazyChart empty={empty} render={() => <Chart type="bar" data={data} options={options} />} />
  )
}

/* ---------- 4) Tageszeit-Profil ---------- */

export function HourlyProfile({ entries }: { entries: TimeEntry[] }) {
  const themeVer = useChartThemeVersion()
  const empty = useMemo(() => entries.every(e => !e.duration_seconds), [entries])

  const { data, options } = useMemo(() => {
    const t = themeColors()
    const byHour = new Map<number, Map<string, number>>()
    for (let h = 0; h < 24; h++) byHour.set(h, new Map())
    entries.forEach(e => {
      if (!e.duration_seconds) return
      const hour = new Date(e.started_at).getHours()
      const cat = mainCategory(e.category)
      const m = byHour.get(hour)!
      m.set(cat, (m.get(cat) || 0) + e.duration_seconds / 60)
    })

    const catSet = new Set<string>()
    byHour.forEach(m => m.forEach((_, c) => catSet.add(c)))
    const cats = Array.from(catSet)
    const datasets = cats.map(c => ({
      label: c,
      data: Array.from({ length: 24 }, (_, h) =>
        Math.round((byHour.get(h)?.get(c) || 0) * 10) / 10
      ),
      backgroundColor: c === SONSTIGE_LABEL ? SONSTIGE_COLOR : colorForPath(c) || SONSTIGE_COLOR,
      stack: 'stunde',
      borderRadius: 2
    }))

    const labels = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}`)

    const base = baseChartOptions(t)
    const chartOptions: ChartOptions<'bar'> = {
      ...(base as ChartOptions<'bar'>),
      plugins: {
        ...base.plugins,
        legend: { ...base.plugins!.legend, display: cats.length > 0 },
        tooltip: {
          ...base.plugins!.tooltip,
          callbacks: {
            title: ctx => `${ctx[0].label}:00 Uhr`,
            label: ctx => ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(0)} Min.`
          }
        }
      }
    }

    return { data: { labels, datasets } as ChartData<'bar'>, options: chartOptions }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, themeVer])

  return (
    <LazyChart empty={empty} render={() => <Chart type="bar" data={data} options={options} />} />
  )
}

/* ---------- 5) Wochenverlauf (Linie, 12 Wochen) ---------- */

export function WeeklyTrend({ entries }: { entries: TimeEntry[] }) {
  const themeVer = useChartThemeVersion()
  const empty = useMemo(() => entries.every(e => !e.duration_seconds), [entries])

  const { data, options } = useMemo(() => {
    const t = themeColors()
    const now = new Date()
    // ISO-Kalenderwoche
    const isoWeek = (d: Date): { year: number; week: number } => {
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      const dayNum = date.getUTCDay() || 7
      date.setUTCDate(date.getUTCDate() + 4 - dayNum)
      const year = date.getUTCFullYear()
      const jan1 = new Date(Date.UTC(year, 0, 1))
      const week = Math.ceil(((date.getTime() - jan1.getTime()) / 86400000 + 1) / 7)
      return { year, week }
    }

    const byWeek = new Map<string, number>()
    entries.forEach(e => {
      if (!e.duration_seconds) return
      const { year, week } = isoWeek(new Date(e.started_at))
      const key = `${year}-W${String(week).padStart(2, '0')}`
      byWeek.set(key, (byWeek.get(key) || 0) + e.duration_seconds / 3600)
    })

    // letzte 12 Wochen (inkl. aktueller)
    const weeks: { key: string; label: string }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      const { year, week } = isoWeek(d)
      weeks.push({ key: `${year}-W${String(week).padStart(2, '0')}`, label: `KW ${week}` })
    }

    const chartData: ChartData<'line'> = {
      labels: weeks.map(w => w.label),
      datasets: [
        {
          label: 'Stunden',
          data: weeks.map(w => Math.round((byWeek.get(w.key) || 0) * 10) / 10),
          borderColor: 'var(--md-primary)',
          backgroundColor: 'var(--md-primary)',
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
          borderWidth: 2
        }
      ]
    }

    const chartOptions: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: t.surfaceContainerHigh,
          borderColor: t.outlineVariant,
          borderWidth: 1,
          titleColor: t.onSurface,
          bodyColor: t.onSurface,
          callbacks: { label: ctx => ` ${Number(ctx.parsed.y).toFixed(1)} Std.` }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: t.outlineVariant },
          ticks: { color: t.onSurfaceVariant, font: { size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: t.outlineVariant },
          border: { display: false },
          ticks: { color: t.onSurfaceVariant, font: { size: 11 } }
        }
      }
    }
    return { data: chartData, options: chartOptions }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, themeVer])

  return (
    <LazyChart empty={empty} render={() => <Chart type="line" data={data} options={options} />} />
  )
}

/* ---------- Kennzahlen-Kacheln (beibehalten) ---------- */

interface WeeklySummaryProps {
  totalHours: number
  totalEntries: number
  avgHoursPerDay: number
  mostActiveDay: string
}

export function WeeklySummary({
  totalHours,
  totalEntries,
  avgHoursPerDay,
  mostActiveDay
}: WeeklySummaryProps) {
  const stats = [
    { value: `${totalHours.toFixed(1)}h`, label: 'Gesamt' },
    { value: `${totalEntries}`, label: 'Einträge' },
    { value: `${avgHoursPerDay.toFixed(1)}h`, label: 'Ø pro Tag' },
    { value: mostActiveDay, label: 'Top Tag' }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 [font-variant-numeric:tabular-nums]">
      {stats.map(stat => (
        <div
          key={stat.label}
          className="p-4 rounded-2xl border border-outline-variant bg-surface-container-low"
        >
          <div className="text-2xl font-bold text-on-surface">{stat.value}</div>
          <div className="mt-0.5 text-sm font-medium text-on-surface-variant">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
