import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Server-Proxy für CalDAV-Anfragen an die Nextcloud.
 *
 * Warum: Der Kalender-Reiter spricht Nextcloud direkt aus dem Browser an.
 * Nextcloud sendet aber keine CORS-Header für fremde Origins – der Browser
 * blockiert solche Anfragen ("Failed to fetch"). Der Cloud-Sync nutzt aus
 * demselben Grund bereits den Server-Proxy /api/cloud/sync.
 *
 * Sicherheit:
 *  - nur https
 *  - SSRF-Schutz: keine lokalen/privaten Adressen
 *  - nur die CalDAV-Methoden PROPFIND / REPORT / MKCALENDAR / PUT / DELETE / GET
 *  - Basic-Auth-Zugangsdaten kommen pro Anfrage mit und werden nicht geloggt
 */

const ALLOWED_METHODS = new Set(['PROPFIND', 'REPORT', 'MKCALENDAR', 'PUT', 'DELETE', 'GET', 'HEAD'])

function assertPublicHttpsUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Ungültige Server-URL')
  }
  if (url.protocol !== 'https:') {
    throw new Error('Nur https-Server erlaubt')
  }
  const host = url.hostname.toLowerCase()
  const blocked =
    host === 'localhost' ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('169.254.') ||
    host.endsWith('.local') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  if (blocked) {
    throw new Error('Nur öffentliche Server erlaubt')
  }
  return url
}

interface DavProxyRequest {
  url: string
  method: string
  username?: string
  password?: string
  body?: string
  contentType?: string
  depth?: string
}

export async function POST(req: Request) {
  let payload: DavProxyRequest
  try {
    payload = (await req.json()) as DavProxyRequest
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const method = (payload.method || '').toUpperCase()
  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ error: `Methode nicht erlaubt: ${method}` }, { status: 400 })
  }

  let target: URL
  try {
    target = assertPublicHttpsUrl(payload.url)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ungültige URL' },
      { status: 400 }
    )
  }

  const headers: Record<string, string> = {}
  if (payload.username || payload.password) {
    headers.Authorization = `Basic ${Buffer.from(
      `${payload.username || ''}:${payload.password || ''}`
    ).toString('base64')}`
  }
  if (payload.contentType) headers['Content-Type'] = payload.contentType
  if (payload.depth) headers.Depth = payload.depth
  if (method === 'PROPFIND' && !payload.depth) headers.Depth = '1'

  try {
    const res = await fetch(target.toString(), {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : payload.body,
      // Keine Weiterleitung: CalDAV antwortet mit absoluten Pfaden
      redirect: 'manual'
    })
    const text = await res.text()
    return NextResponse.json(
      { status: res.status, body: text },
      { status: 200 }
    )
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server nicht erreichbar' },
      { status: 502 }
    )
  }
}
