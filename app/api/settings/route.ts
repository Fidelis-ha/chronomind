import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { localDb } from '@/lib/db/local'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const [settings] = await localDb.settings.findByUserId(session.id)

    return NextResponse.json({
      settings: settings ? {
        timezone: settings.timezone,
        work_day_start: settings.workDayStart,
        work_day_end: settings.workDayEnd,
        ai_provider: settings.aiProvider,
        ai_model: settings.aiModel,
        ai_api_key_mistral: settings.aiApiKeyMistral,
        ai_api_key_routerlab: settings.aiApiKeyRouterlab,
        routerlab_base_url: settings.routerlabBaseUrl,
        backup_provider: settings.backupProvider,
        backup_config: settings.backupConfig
      } : null
    })
  } catch (err) {
    console.error('Get settings error:', err)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const data = await req.json()

    await localDb.settings.upsert({
      userId: session.id,
      aiProvider: data.ai_provider,
      aiModel: data.ai_model,
      aiApiKeyMistral: data.ai_api_key_mistral,
      aiApiKeyRouterlab: data.ai_api_key_routerlab,
      routerlabBaseUrl: data.routerlab_base_url,
      timezone: data.timezone,
      workDayStart: data.work_day_start,
      workDayEnd: data.work_day_end,
      backupProvider: data.backup_provider,
      backupConfig: data.backup_config
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update settings error:', err)
    return NextResponse.json({ error: 'Fehler beim Speichern' }, { status: 500 })
  }
}
