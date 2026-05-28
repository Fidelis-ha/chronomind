import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { localDb } from '@/lib/db/local'

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function formatTags(tags: unknown): string {
  if (!tags || !Array.isArray(tags)) return ''
  return (tags as string[]).join('; ')
}

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'csv'
    const startDateParam = searchParams.get('start')
    const endDateParam = searchParams.get('end')

    const entries = await localDb.timeEntries.findAllByUser(session.id)

    interface EntryForExport {
  id: string
  user_id: string
  title: string
  description: string | null
  category: string | null
  tags: unknown
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  source: string | null
  calendar_event_id: string | null
  metadata: unknown
  created_at: string | null
}

    const mapped: EntryForExport[] = entries.map(e => ({
      id: e.id,
      user_id: e.userId,
      title: e.title,
      description: e.description,
      category: e.category,
      tags: e.tags,
      started_at: e.startedAt,
      ended_at: e.endedAt,
      duration_seconds: e.durationSeconds,
      source: e.source,
      calendar_event_id: e.calendarEventId,
      metadata: e.metadata,
      created_at: e.createdAt ? new Date(e.createdAt * 1000).toISOString() : null
    }))

    let filtered = mapped
    if (startDateParam) {
      const start = new Date(startDateParam)
      start.setHours(0, 0, 0, 0)
      filtered = filtered.filter(e => new Date(e.started_at) >= start)
    }
    if (endDateParam) {
      const end = new Date(endDateParam)
      end.setHours(23, 59, 59, 999)
      filtered = filtered.filter(e => new Date(e.started_at) <= end)
    }

    if (format === 'json') {
      return NextResponse.json({ entries: filtered })
    }

    const csvLines: string[] = []
    csvLines.push('id,title,description,category,tags,started_at,ended_at,duration,source')

    for (const entry of filtered) {
      const line = [
        escapeCSV(entry.id),
        escapeCSV(entry.title),
        escapeCSV(entry.description),
        escapeCSV(entry.category),
        escapeCSV(formatTags(entry.tags)),
        escapeCSV(entry.started_at),
        escapeCSV(entry.ended_at),
        escapeCSV(entry.duration_seconds !== null ? formatDuration(entry.duration_seconds) : ''),
        escapeCSV(entry.source)
      ].join(',')
      csvLines.push(line)
    }

    const csvContent = csvLines.join('\r\n')

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `chronomind-export-${timestamp}.csv`

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (err) {
    console.error('Export entries error:', err)
    return NextResponse.json({ error: 'Fehler beim Export' }, { status: 500 })
  }
}