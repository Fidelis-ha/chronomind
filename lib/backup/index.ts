import { db } from '@/lib/db'
import { timeEntries, chats, calendars, calendarEvents, userSettings, users } from '@/lib/db/schema'

export interface BackupData {
  version: number
  timestamp: string
  data: {
    users: any[]
    timeEntries: any[]
    chats: any[]
    calendars: any[]
    calendarEvents: any[]
    userSettings: any[]
  }
}

export async function exportDatabase(): Promise<BackupData> {
  const allUsers = await db.select().from(users)
  const allTimeEntries = await db.select().from(timeEntries)
  const allChats = await db.select().from(chats)
  const allCalendars = await db.select().from(calendars)
  const allCalendarEvents = await db.select().from(calendarEvents)
  const allSettings = await db.select().from(userSettings)

  return {
    version: 1,
    timestamp: new Date().toISOString(),
    data: {
      users: allUsers,
      timeEntries: allTimeEntries,
      chats: allChats,
      calendars: allCalendars,
      calendarEvents: allCalendarEvents,
      userSettings: allSettings
    }
  }
}

export async function backupToS3(config: {
  s3_bucket: string
  s3_region: string
  aws_access_key_id: string
  aws_secret_access_key: string
}): Promise<{ success: boolean; key?: string; error?: string }> {
  try {
    const data = await exportDatabase()
    const json = JSON.stringify(data)

    const date = new Date().toISOString().split('T')[0]
    const key = `chronomind-backup/${date}-${crypto.randomUUID()}.json`

    const host = `${config.s3_bucket}.s3.${config.s3_region}.amazonaws.com`
    const url = `https://${host}/${key}`

    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)

    const payloadHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json)).then(buf =>
      Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
    )

    const credential = `${config.aws_access_key_id}/${dateStamp}/${config.s3_region}/s3/aws4_request`

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Authorization': `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=placeholder`
      },
      body: json
    })

    if (!res.ok) {
      return { success: false, error: `S3 upload failed: ${res.status}` }
    }

    return { success: true, key }
  } catch (err) {
    console.error('S3 backup error:', err)
    return { success: false, error: 'Backup fehlgeschlagen' }
  }
}

export async function backupToWebDAV(config: {
  webdav_url: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await exportDatabase()
    const json = JSON.stringify(data)

    const date = new Date().toISOString().split('T')[0]
    const filename = `${date}-${crypto.randomUUID()}.json`
    const url = config.webdav_url.endsWith('/')
      ? `${config.webdav_url}${filename}`
      : `${config.webdav_url}/${filename}`

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: json
    })

    if (!res.ok) {
      return { success: false, error: `WebDAV upload failed: ${res.status}` }
    }

    return { success: true }
  } catch (err) {
    console.error('WebDAV backup error:', err)
    return { success: false, error: 'Backup fehlgeschlagen' }
  }
}
