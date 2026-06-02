'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { type TimeEntry } from '@/lib/types'

interface DashboardChartsProps {
  entries: TimeEntry[]
}

const CATEGORY_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

function aggregateByCategory(entries: TimeEntry[]): { name: string; value: number }[] {
  const map = new Map<string, number>()
  entries.forEach(e => {
    const cat = e.category || 'Sonstiges'
    map.set(cat, (map.get(cat) || 0) + (e.duration_seconds || 0))
  })
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: Math.round(value / 60) }))
    .sort((a, b) => b.value - a.value)
}

function aggregateByDay(entries: TimeEntry[], days = 7): { date: string; minutes: number }[] {
  const result: { date: string; minutes: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayEntries = entries.filter(e => e.started_at.startsWith(dateStr))
    const totalMin = dayEntries.reduce((s, e) => s + Math.round((e.duration_seconds || 0) / 60), 0)
    result.push({
      date: d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      minutes: totalMin
    })
  }
  return result
}

export default function DashboardCharts({ entries }: DashboardChartsProps) {
  const categoryData = useMemo(() => aggregateByCategory(entries), [entries])
  const dailyData = useMemo(() => aggregateByDay(entries), [entries])

  const totalMinutes = entries.reduce((s, e) => s + Math.round((e.duration_seconds || 0) / 60), 0)

  if (entries.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Daily bar chart */}
      <div className="p-4 border rounded-lg bg-card">
        <h3 className="text-sm font-medium mb-4">Stunden der letzten 7 Tage</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${Math.floor(v / 60)}h`} />
            <Tooltip
              formatter={(value) => [`${value} Min`, 'Gearbeitet']}
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
            />
            <Bar dataKey="minutes" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category pie chart */}
      <div className="p-4 border rounded-lg bg-card">
        <h3 className="text-sm font-medium mb-4">Zeit nach Kategorie</h3>
        {categoryData.length > 0 ? (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  paddingAngle={2}
                >
                  {categoryData.map((_, idx) => (
                    <Cell key={idx} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} Min`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1">
              {categoryData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <span className="text-muted-foreground tabular-nums">
                    {Math.floor(item.value / 60)}h {item.value % 60}m
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Keine Kategorien vorhanden</p>
        )}
      </div>
    </div>
  )
}