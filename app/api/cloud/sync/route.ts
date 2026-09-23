import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface SyncRequest {
  action: 'test' | 'push' | 'pull'
  provider: 'nextcloud' | 'webdav' | 's3'
  config: Record<string, string>
  data?: unknown
}

const enc = new TextEncoder()

// SSRF-Basis-Schutz: nur öffentliche https-Server erlauben
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

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hmacRaw(key: Uint8Array, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data))
  return new Uint8Array(sig)
}

// ── S3 SigV4 (minimal: PUT/GET auf ein Objekt) ──────────────────────────────
async function s3Headers(
  method: 'PUT' | 'GET',
  url: URL,
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
  payload: string
): Promise<Record<string, string>> {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = await sha256Hex(payload)

  const canonicalHeaders = `host:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
  const canonicalRequest = [method, url.pathname, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')
  const scope = `${dateStamp}/${region}/s3/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256Hex(canonicalRequest)].join('\n')

  const kDate = await hmacRaw(enc.encode(`AWS4${secretAccessKey}`), dateStamp)
  const kRegion = await hmacRaw(kDate, region)
  const kService = await hmacRaw(kRegion, 's3')
  const signingKey = await hmacRaw(kService, 'aws4_request')
  const sigHex = await hmacRaw(signingKey, stringToSign)
  const signature = Array.from(sigHex).map(b => b.toString(16).padStart(2, '0')).join('')

  return {
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  }
}

async function s3Request(method: 'PUT' | 'GET', cfg: Record<string, string>, body?: string): Promise<Response> {
  const bucket = cfg.s3_bucket
  const region = cfg.s3_region || 'eu-central-1'
  const key = cfg.s3_key || 'chronomind/chronomind-data.json'
  const url = new URL(`https://${bucket}.s3.${region}.amazonaws.com/${key}`)
  const payload = method === 'PUT' ? (body || '') : ''
  const headers = await s3Headers(method, url, region, cfg.aws_access_key_id, cfg.aws_secret_access_key, payload)
  return fetch(url, { method, headers, body: method === 'PUT' ? payload : undefined })
}

// ── WebDAV (Nextcloud + generisch) ──────────────────────────────────────────
function webdavTarget(cfg: Record<string, string>, provider: string): { url: string; dirUrl: string; auth: string } {
  const auth = Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64')
  if (provider === 'nextcloud') {
    assertPublicHttpsUrl(cfg.nc_server || '')
    const base = (cfg.nc_server || '').replace(/\/+$/, '')
    const path = (cfg.nc_path || 'chronomind/chronomind-data.json').replace(/^\/+/, '')
    const dir = path.split('/').slice(0, -1).join('/')
    return {
      url: `${base}/remote.php/dav/files/${encodeURIComponent(cfg.username)}/${path}`,
      dirUrl: `${base}/remote.php/dav/files/${encodeURIComponent(cfg.username)}/${dir}`,
      auth
    }
  }
  // generisches WebDAV: URL zeigt auf Verzeichnis
  assertPublicHttpsUrl(cfg.webdav_url || '')
  const base = (cfg.webdav_url || '').replace(/\/+$/, '')
  const filename = cfg.webdav_filename || 'chronomind-data.json'
  return { url: `${base}/${filename}`, dirUrl: base, auth }
}

async function webdavRequest(method: string, target: { url: string; auth: string }, body?: string): Promise<Response> {
  return fetch(target.url, {
    method,
    headers: {
      Authorization: `Basic ${target.auth}`,
      ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}),
      ...(method === 'PROPFIND' ? { Depth: '0' } : {})
    },
    body
  })
}

async function webdavPutWithDir(target: { url: string; dirUrl: string; auth: string }, body: string): Promise<Response> {
  let res = await webdavRequest('PUT', target, body)
  if (res.status === 404 || res.status === 409) {
    // Ordner anlegen (nur erste Ebene; Nextcloud legt fehlende Parents i.d.R. nicht an)
    await fetch(target.dirUrl, {
      method: 'MKCOL',
      headers: { Authorization: `Basic ${target.auth}` }
    })
    res = await webdavRequest('PUT', target, body)
  }
  return res
}

export async function POST(req: Request) {
  // Origin-Check (CSRF-Basis-Schutz)
  const origin = req.headers.get('origin')
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.get('host')) {
        return NextResponse.json({ ok: false, error: 'Verboten' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ ok: false, error: 'Verboten' }, { status: 403 })
    }
  }

  let body: SyncRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 })
  }

  const { action, provider, config, data } = body
  if (!action || !provider || !config) {
    return NextResponse.json({ error: 'action, provider und config erforderlich' }, { status: 400 })
  }

  try {
    // ── Test ────────────────────────────────────────────────────────────────
    if (action === 'test') {
      if (provider === 's3') {
        const res = await s3Request('GET', config)
        if (res.status === 403 || res.status === 401) return NextResponse.json({ ok: false, error: 'Zugriff verweigert – Keys prüfen' })
        // 404 = Key falsch? nein: Bucket existiert, Objekt noch nicht da => Verbindung ok
        if (res.ok || res.status === 404) return NextResponse.json({ ok: true })
        return NextResponse.json({ ok: false, error: `HTTP ${res.status}` })
      }
      const target = webdavTarget(config, provider)
      const res = await webdavRequest('PROPFIND', target)
      if (res.status === 207 || res.ok || res.status === 404) {
        return NextResponse.json({ ok: true, detail: res.status === 404 ? 'verbunden, Datei noch nicht vorhanden' : 'verbunden' })
      }
      if (res.status === 401) return NextResponse.json({ ok: false, error: 'Login fehlgeschlagen – Benutzer/App-Passwort prüfen' })
      return NextResponse.json({ ok: false, error: `HTTP ${res.status}` })
    }

    // ── Push ────────────────────────────────────────────────────────────────
    if (action === 'push') {
      const payload = JSON.stringify(data ?? {})
      let res: Response
      if (provider === 's3') {
        res = await s3Request('PUT', config, payload)
      } else {
        const target = webdavTarget(config, provider)
        res = await webdavPutWithDir(target, payload)
      }
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: `Upload fehlgeschlagen (HTTP ${res.status})` }, { status: 502 })
      }
      return NextResponse.json({ ok: true })
    }

    // ── Pull ────────────────────────────────────────────────────────────────
    if (action === 'pull') {
      let res: Response
      if (provider === 's3') {
        res = await s3Request('GET', config)
      } else {
        const target = webdavTarget(config, provider)
        res = await webdavRequest('GET', target)
      }
      if (res.status === 404) return NextResponse.json({ ok: true, data: null })
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: `Download fehlgeschlagen (HTTP ${res.status})` }, { status: 502 })
      }
      const text = await res.text()
      try {
        return NextResponse.json({ ok: true, data: JSON.parse(text) })
      } catch {
        return NextResponse.json({ ok: false, error: 'Cloud-Datei ist kein gültiges JSON' }, { status: 502 })
      }
    }

    return NextResponse.json({ error: 'Unbekannte action' }, { status: 400 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
