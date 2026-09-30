'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'

import { IconChartBar, IconChartPie } from '@/components/ui/icons'

interface DurationChartProps {
  data: Array<{
    date: string
    hours: number
  }>
}

export function DurationChart({ data }: DurationChartProps) {
  const hasData = data.some((d) => d.hours > 0)

  if (data.length === 0 || !hasData) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <IconChartBar className="h-10 w-10 text-on-surface-variant" aria-hidden />
        <p className="text-sm font-medium text-on-surface">
          Noch keine Einträge in den letzten 7 Tagen
        </p>
        <p className="text-xs text-on-surface-variant">
          Erfasse Zeiten, um deine Wochenübersicht zu sehen.
        </p>
      </div>
    )
  }

  return (
    <div className="h-[280px] md:h-[360px] lg:h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--md-outline-variant)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 13, fill: 'var(--md-on-surface-variant)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--md-outline-variant)' }}
          tickFormatter={(value) => {
            const date = new Date(value)
            return date.toLocaleDateString('de-DE', { weekday: 'short' })
          }}
        />
        <YAxis
          tick={{ fontSize: 13, fill: 'var(--md-on-surface-variant)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}h`}
        />
        <Tooltip
          labelFormatter={(value) => {
            const date = new Date(value)
            return date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
          }}
          formatter={(value: unknown) => [`${Number(value).toFixed(1)} Stunden`, 'Dauer'] as any}
          contentStyle={{
            backgroundColor: 'var(--md-surface-container-high)',
            border: '1px solid var(--md-outline-variant)',
            borderRadius: '1rem',
            color: 'var(--md-on-surface)'
          }}
        />
        <Bar
          dataKey="hours"
          fill="var(--md-primary)"
          radius={[8, 8, 0, 0]}
          name="Stunden"
        />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface CategoryData {
  name: string
  value: number
  color: string
}

interface CategoryPieChartProps {
  data: CategoryData[]
  totalHours?: number
}

const DEFAULT_COLORS = [
  'var(--md-primary)',
  'var(--md-tertiary)',
  'var(--md-secondary)',
  'var(--md-tertiary-container)',
  'var(--md-primary-container)',
  'var(--md-on-surface-variant)',
  'var(--md-outline)',
  'var(--md-inverse-primary)'
]

export function CategoryPieChart({ data, totalHours = 0 }: CategoryPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <IconChartPie className="h-10 w-10 text-on-surface-variant" aria-hidden />
        <p className="text-sm font-medium text-on-surface">
          Noch keine Kategorien vorhanden
        </p>
        <p className="text-xs text-on-surface-variant">
          Erfasse Zeiten mit Kategorien, um die Verteilung zu sehen.
        </p>
      </div>
    )
  }

  const showLabels = data.length <= 5
  const donutTotal = totalHours > 0 ? `${totalHours.toFixed(1)}h` : null

  return (
    <div className="h-[280px] md:h-[360px] lg:h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          // Typ-Assertion nötig, da recharts-format value als unknown typisiert ist
          label={
            showLabels
              ? ({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%` as any
              : false
          }
          labelLine={showLabels ? { stroke: 'var(--md-on-surface-variant)' } : false}
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
            />
          ))}
        </Pie>
        {donutTotal && (
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-on-surface"
          >
            <tspan x="50%" dy="-0.4em" fontSize="20" fontWeight="700" fill="var(--md-on-surface)">
              {donutTotal}
            </tspan>
            <tspan x="50%" dy="1.4em" fontSize="11" fill="var(--md-on-surface-variant)">
              gesamt
            </tspan>
          </text>
        )}
        <Tooltip
          formatter={(value: unknown) => [`${Number(value).toFixed(1)} Std.`, 'Dauer']}
          contentStyle={{
            backgroundColor: 'var(--md-surface-container-high)',
            border: '1px solid var(--md-outline-variant)',
            borderRadius: '1rem',
            color: 'var(--md-on-surface)'
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={showLabels ? 36 : undefined}
          formatter={(value) => (
            <span className="text-sm text-on-surface-variant">{value}</span>
          )}
        />
      </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

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
    { value: `${totalHours.toFixed(1)}h`, label: 'Gesamt (7 Tage)' },
    { value: `${totalEntries}`, label: 'Einträge' },
    { value: `${avgHoursPerDay.toFixed(1)}h`, label: 'Ø pro Tag' },
    { value: mostActiveDay, label: 'Top Tag' }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-4 rounded-2xl border border-outline-variant bg-surface-container-low"
        >
          <div className="text-2xl font-bold text-on-surface">{stat.value}</div>
          <div className="mt-0.5 text-sm font-medium text-on-surface-variant">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}
