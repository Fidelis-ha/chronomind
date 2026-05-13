import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { getUserSettings, upsertUserSettings } from '@/lib/data-store'

export async function GET() {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = getUserSettings(session.user.id)
  return NextResponse.json({ settings })
}

export async function PUT(req: NextRequest) {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const settings = upsertUserSettings(session.user.id, {
    timezone: body.timezone,
    work_day_start: body.work_day_start,
    work_day_end: body.work_day_end,
    ai_provider: body.ai_provider,
    ai_model: body.ai_model,
    ai_api_key_mistral: body.ai_api_key_mistral,
    ai_api_key_routerlab: body.ai_api_key_routerlab,
    routerlab_base_url: body.routerlab_base_url
  })

  return NextResponse.json({ settings })
}
