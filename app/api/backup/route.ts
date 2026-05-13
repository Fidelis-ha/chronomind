import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { localDb } from '@/lib/db/local'
import { backupToS3, backupToWebDAV } from '@/lib/backup'

export async function POST() {
  try {
    const session = await getSession()
    if (!session?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const [settings] = await localDb.settings.findByUserId(session.id)

    if (!settings?.backupProvider || !settings?.backupConfig) {
      return NextResponse.json(
        { error: 'Kein Backup-Anbieter konfiguriert' },
        { status: 400 }
      )
    }

    let result
    if (settings.backupProvider === 's3') {
      result = await backupToS3(settings.backupConfig as any)
    } else if (settings.backupProvider === 'webdav') {
      result = await backupToWebDAV(settings.backupConfig as any)
    } else {
      return NextResponse.json(
        { error: 'Unbekannter Backup-Anbieter' },
        { status: 400 }
      )
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('Backup error:', err)
    return NextResponse.json({ error: 'Backup fehlgeschlagen' }, { status: 500 })
  }
}
