import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { localDb } from '@/lib/db/local'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const [existing] = await localDb.timeEntries.findById(params.id)
    if (!existing || existing.userId !== session.id) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }

    const updates = await req.json()
    await localDb.timeEntries.update(params.id, updates)

    const [updated] = await localDb.timeEntries.findById(params.id)

    const mapped = {
      id: updated.id,
      user_id: updated.userId,
      title: updated.title,
      description: updated.description,
      category: updated.category,
      tags: updated.tags,
      started_at: updated.startedAt,
      ended_at: updated.endedAt,
      duration_seconds: updated.durationSeconds,
      source: updated.source,
      calendar_event_id: updated.calendarEventId,
      metadata: updated.metadata,
      created_at: updated.createdAt?.toISOString()
    }

    return NextResponse.json({ entry: mapped })
  } catch (err) {
    console.error('Update entry error:', err)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const [existing] = await localDb.timeEntries.findById(params.id)
    if (!existing || existing.userId !== session.id) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }

    await localDb.timeEntries.delete(params.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete entry error:', err)
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
  }
}
