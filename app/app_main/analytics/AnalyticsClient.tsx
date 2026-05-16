'use client'

import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { type TimeEntry } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function AnalyticsClient() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    setEntries(loadEntries())
  }, [])

  const filteredEntries = useMemo(() => {
    const now = new Date()
    const cutoff = new Date()

    if (period === '7d') cutoff.setDate(now.getDate() - 7)
    else if (period === '30d') cutoff.setDate(now.getDate() - 30)
    else if (period === '90d') cutoff.setDate(now.getDate() - 90)
    else cutoff.setFullYear(2000)

    return entries.filter(e => new Date(e.started_at) >= cutoff)
  }, [entries, period])

  const dailyData = useMemo(() => {
    const grouped: Record<string, number> = {}

    filteredEntries.forEach(entry => {
      const date = new Date(entry.started_at).toISOString().split('T')[0]
      grouped[date] = (grouped[date] || 0) + (entry.duration_seconds || 0)
    })

    const sorted = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, seconds]) => ({
        date: new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
        hours: Math.round((seconds / 3600) * 10) / 10
      }))

    return sorted
  }, [filteredEntries])

  const categoryData = useMemo(() => {
    const grouped: Record<string, number> = {}

    filteredEntries.forEach(entry => {
      const cat = entry.category || 'Sonstiges'
      grouped[cat] = (grouped[cat] || 0) + (entry.duration_seconds || 0)
    })

    return Object.entries(grouped)
      .sort(([, a], [, b]) => b - a)
      .map(([name, seconds]) => ({ name, value: Math.round(seconds / 60) }))
  }, [filteredEntries])

  const totalHours = useMemo(() => {
    const total = filteredEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0)
    return Math.round((total / 3600) * 10) / 10
  }, [filteredEntries])

  const avgPerDay = useMemo(() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : filteredEntries.length || 1
    return Math.round((totalHours / days) * 10) / 10
  }, [totalHours, period, filteredEntries.length])

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Auswertung</h1>
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 Tage</SelectItem>
            <SelectItem value="30d">30 Tage</SelectItem>
            <SelectItem value="90d">90 Tage</SelectItem>
            <SelectItem value="all">Alles</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Gesamtzeit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalHours}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Einträge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredEntries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ø pro Tag</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgPerDay}h</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Stundenauswertung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} tickLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} unit="h" />
                <Tooltip formatter={(v: number) => [`${v} h`, 'Stunden']} />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nach Kategorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} Min`, 'Dauer']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}