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

interface DurationChartProps {
  data: Array<{
    date: string
    hours: number
  }>
}

export function DurationChart({ data }: DurationChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Keine Daten für die letzten 7 Tage
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => {
            const date = new Date(value)
            return date.toLocaleDateString('de-DE', { weekday: 'short' })
          }}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `${value}h`}
          className="text-muted-foreground"
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
  )
}

interface CategoryData {
  name: string
  value: number
  color: string
}

interface CategoryPieChartProps {
  data: CategoryData[]
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

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Keine Kategorien vorhanden
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
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
          label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%` as any}
          labelLine={{ stroke: 'var(--md-on-surface-variant)' }}
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
            />
          ))}
        </Pie>
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
          height={36}
          formatter={(value) => (
            <span className="text-sm text-muted-foreground">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
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
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 rounded-2xl border border-outline-variant bg-surface-container-low">
        <div className="text-2xl font-bold text-on-surface">{totalHours.toFixed(1)}h</div>
        <div className="text-sm text-on-surface-variant">Gesamt (7 Tage)</div>
      </div>
      <div className="p-4 rounded-2xl border border-outline-variant bg-surface-container-low">
        <div className="text-2xl font-bold text-on-surface">{totalEntries}</div>
        <div className="text-sm text-on-surface-variant">Einträge</div>
      </div>
      <div className="p-4 rounded-2xl border border-outline-variant bg-surface-container-low">
        <div className="text-2xl font-bold text-on-surface">{avgHoursPerDay.toFixed(1)}h</div>
        <div className="text-sm text-on-surface-variant">Ø pro Tag</div>
      </div>
      <div className="p-4 rounded-2xl border border-outline-variant bg-surface-container-low">
        <div className="text-2xl font-bold text-on-surface">{mostActiveDay}</div>
        <div className="text-sm text-on-surface-variant">Top Tag</div>
      </div>
    </div>
  )
}