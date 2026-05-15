import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { localDb } from '@/lib/db/local'

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')

    const targetDate = date ? new Date(date) : new Date()
    targetDate.setHours(0, 0, 0, 0)

    const entries = await localDb.timeEntries.findByUserAndDate(session.id, targetDate)

    const mapped = entries.map(e => ({
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

    return NextResponse.json({ entries: mapped })
  } catch (err) {
    console.error('Get entries error:', err)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { entry } = await req.json()

    const id = crypto.randomUUID()
    await localDb.timeEntries.create({
      id,
      userId: session.id,
      title: entry.title,
      description: entry.description,
      category: entry.category,
      tags: entry.tags,
      startedAt: entry.started_at,
      endedAt: entry.ended_at,
      source: entry.source,
      calendarEventId: entry.calendar_event_id,
      metadata: entry.metadata,
      createdAt: Math.floor(Date.now() / 1000)
    })

    const [created] = await localDb.timeEntries.findById(id)

    const mapped = {
      id: created.id,
      user_id: created.userId,
      title: created.title,
      description: created.description,
      category: created.category,
      tags: created.tags,
      started_at: created.startedAt,
      ended_at: created.endedAt,
      duration_seconds: created.durationSeconds,
      source: created.source,
      calendar_event_id: created.calendarEventId,
      metadata: created.metadata,
      created_at: created.createdAt ? new Date(created.createdAt * 1000).toISOString() : null
    }

    return NextResponse.json({ entry: mapped })
  } catch (err) {
    console.error('Create entry error:', err)
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
  }
}
