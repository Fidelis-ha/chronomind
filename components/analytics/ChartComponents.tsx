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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: unknown) => [`${Number(value).toFixed(1)} Stunden`, 'Dauer'] as any}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem'
          }}
        />
        <Bar
          dataKey="hours"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
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
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#84cc16'
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%` as any}
          labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
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
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem'
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
      <div className="p-4 rounded-lg border bg-card">
        <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
        <div className="text-sm text-muted-foreground">Gesamt (7 Tage)</div>
      </div>
      <div className="p-4 rounded-lg border bg-card">
        <div className="text-2xl font-bold">{totalEntries}</div>
        <div className="text-sm text-muted-foreground">Einträge</div>
      </div>
      <div className="p-4 rounded-lg border bg-card">
        <div className="text-2xl font-bold">{avgHoursPerDay.toFixed(1)}h</div>
        <div className="text-sm text-muted-foreground">Ø pro Tag</div>
      </div>
      <div className="p-4 rounded-lg border bg-card">
        <div className="text-2xl font-bold">{mostActiveDay}</div>
        <div className="text-sm text-muted-foreground">Top Tag</div>
      </div>
    </div>
  )
}