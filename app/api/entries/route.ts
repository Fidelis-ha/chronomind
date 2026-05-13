import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import {
  getTimeEntries,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry
} from '@/lib/data-store'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') ?? undefined
  const entries = getTimeEntries(session.user.id, date)
  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, category, description, started_at, ended_at, source } = body

  if (!title || !started_at) {
    return NextResponse.json({ error: 'title and started_at are required' }, { status: 400 })
  }

  const entry = createTimeEntry(session.user.id, {
    title,
    category: category ?? null,
    description: description ?? null,
    started_at,
    ended_at: ended_at ?? null,
    source: source ?? 'manual',
    tags: null,
    calendar_event_id: null,
    metadata: null
  })

  return NextResponse.json({ entry }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { id, title, category, description, started_at, ended_at } = body

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const entry = updateTimeEntry(session.user.id, id, {
    title,
    category,
    description,
    started_at,
    ended_at
  })

  if (!entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  return NextResponse.json({ entry })
}

export async function DELETE(req: NextRequest) {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const deleted = deleteTimeEntry(session.user.id, id)
  if (!deleted) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
