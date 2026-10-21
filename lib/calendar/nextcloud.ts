// Optionale Nextcloud-Verknuepfung (CalDAV) – komplett clientseitig via fetch
// mit Basic Auth aus der (verschluesselten) CloudConfig.

import { type CloudConfig } from '@/lib/cloud-sync'

export interface RemoteCalendar {
  url: string
  displayName: string
}

export interface RemoteEvent {
  uid: string
  summary: string
  dtstart: string // ICS-Zeitstring (UTC, 'Z') – TZID-Werte werden bereits nach UTC normalisiert
  dtend: string
  data: string // komplette VEVENT-ICS-Repraesentation (roh)
}

export type ConflictStrategy = 'app-wins' | 'push-only' | 'remote-wins'

function davBase(config: CloudConfig): string {
  const server = (config.nc_server || '').replace(/\/+$/, '')
  const user = encodeURIComponent(config.username || '')
  return `${server}/remote.php/dav/calendars/${user}/`
}

function authHeaders(config: CloudConfig): HeadersInit {
  const token = btoa(`${config.username || ''}:${config.password || ''}`)
  return {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/xml'
  }
}

async function davRequest(
  config: CloudConfig,
  url: string,
  method: string,
  body?: string
): Promise<Response> {
  return fetch(url, {
    method,
    headers: authHeaders(config),
    body
  })
}

function ensureOk(res: Response, action: string): Response {
  if (!res.ok) {
    throw new Error(`${action} fehlgeschlagen (HTTP ${res.status})`)
  }
  return res
}

/** Neuen Kalender in der Nextcloud anlegen (MKCALENDAR) */
export async function createNextcloudCalendar(config: CloudConfig, name: string): Promise<void> {
  const base = davBase(config)
  const slug = (name || 'Chronomind')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'chronomind'
  const url = `${base}${slug}/`
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<d:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:set>
    <d:prop>
      <d:displayname>${name.replace(/[<>&]/g, '')}</d:displayname>
    </d:prop>
  </d:set>
</d:mkcalendar>`
  const res = await davRequest(config, url, 'MKCALENDAR', body)
  if (res.status !== 201 && res.status !== 405) {
    // 405 = existiert bereits -> als ok behandeln
    throw new Error(`Kalender anlegen fehlgeschlagen (HTTP ${res.status})`)
  }
}

/** Bestehende Kalender listen (PROPFIND depth 1 der Kalendersammlung) */
export async function listNextcloudCalendars(config: CloudConfig): Promise<RemoteCalendar[]> {
  const base = davBase(config)
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
  </d:prop>
</d:propfind>`
  const res = ensureOk(await davRequest(config, base, 'PROPFIND', body), 'Kalender laden')
  const text = await res.text()
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const calendars: RemoteCalendar[] = []
  for (const resp of Array.from(doc.getElementsByTagNameNS('DAV:', 'response'))) {
    const rt = resp.getElementsByTagNameNS('DAV:', 'resourcetype')[0]
    if (!rt || !rt.getElementsByTagNameNS('urn:ietf:params:xml:ns:caldav', 'calendar').length) continue
    const hrefEl = resp.getElementsByTagNameNS('DAV:', 'href')[0]
    const nameEl = resp.getElementsByTagNameNS('DAV:', 'displayname')[0]
    if (!hrefEl) continue
    const href = hrefEl.textContent || ''
    const absolute = href.startsWith('http') ? href : new URL(href, base).toString()
    calendars.push({
      url: absolute,
      displayName: nameEl?.textContent || decodeURIComponent(href.replace(/\/+$/, '').split('/').pop() || '')
    })
  }
  return calendars
}

/** Alle VEVENT-UIDs eines Remote-Kalenders laden (REPORT calendar-query) */
export async function fetchRemoteEvents(config: CloudConfig, calendarUrl: string): Promise<RemoteEvent[]> {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT"/>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`
  const res = ensureOk(await davRequest(config, calendarUrl, 'REPORT', body), 'Events laden')
  const text = await res.text()
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const events: RemoteEvent[] = []
  for (const resp of Array.from(doc.getElementsByTagNameNS('DAV:', 'response'))) {
    const dataEl = resp.getElementsByTagNameNS('urn:ietf:params:xml:ns:caldav', 'calendar-data')[0]
    const data = dataEl?.textContent || ''
    const uid = data.match(/UID:(.+)/)?.[1]?.trim()
    if (!uid) continue
    events.push({
      uid,
      summary: unescapeIcsText(data.match(/SUMMARY:(.+)/)?.[1]?.trim() || ''),
      dtstart: normalizeIcsDateTime(data, 'DTSTART'),
      dtend: normalizeIcsDateTime(data, 'DTEND'),
      data
    })
  }
  return events
}

/** RFC-5545-Unescaping fuer Textwerte (\\n, \\,, \\;, \\\\) */
export function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim()
}

/**
 * Liest eine DTSTART/DTEND-Zeile und normalisiert sie auf UTC ('...Z').
 * Unterstuetzt: 'YYYYMMDDTHHMMSSZ' (UTC), 'YYYYMMDDTHHMMSS' (lokal) und
 * 'TZID=Europe/Berlin:YYYYMMDDTHHMMSS' (wird ueber Intl korrekt umgerechnet).
 */
export function normalizeIcsDateTime(data: string, prop: 'DTSTART' | 'DTEND'): string {
  const line = data.match(new RegExp(`${prop}([^:\\r\\n]*):([^\\r\\n]+)`))
  if (!line) return ''
  const params = line[1] || ''
  const value = line[2].trim()
  // Ganztagesdatum (VALUE=DATE) oder reines Datum: auf 00:00 UTC setzen
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}${value.slice(4, 6)}${value.slice(6, 8)}T000000Z`
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/)
  if (!m) return value
  const [, y, mo, d, h, mi, s, z] = m
  if (z === 'Z') return value
  const tzid = params.match(/TZID=([^;:]+)/)?.[1]?.replace(/^"|"$/g, '')
  if (!tzid) {
    // Kein TZID, kein Z: laut RFC "floating" (Ortszeit des Nutzers) – als Ortszeit behandeln
    const local = new Date(+y, +mo - 1, +d, +h, +mi, +s)
    return icsUtc(local)
  }
  try {
    // Ortszeit in der Zielzone -> UTC: Datum in der Zone "vortäuschen" und Offset korrigieren
    const naive = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tzid,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
    const parts = dtf.formatToParts(new Date(naive))
    const get = (t: string) => Number(parts.find(p => p.type === t)?.value)
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'))
    const offset = asUtc - naive // Zonen-Offset in ms
    return icsUtc(new Date(naive - offset))
  } catch {
    return value
  }
}

/** Date -> ICS-UTC-String */
function icsUtc(date: Date): string {
  return (
    date.getUTCFullYear().toString().padStart(4, '0') +
    String(date.getUTCMonth() + 1).padStart(2, '0') +
    String(date.getUTCDate()).padStart(2, '0') + 'T' +
    String(date.getUTCHours()).padStart(2, '0') +
    String(date.getUTCMinutes()).padStart(2, '0') +
    String(date.getUTCSeconds()).padStart(2, '0') + 'Z'
  )
}

/** Ein VEVENT in den Nextcloud-Kalender legen (PUT, stabile UID = Dateiname) */
export async function putRemoteEvent(config: CloudConfig, calendarUrl: string, uid: string, icsText: string): Promise<void> {
  const url = `${calendarUrl.replace(/\/+$/, '')}/${encodeURIComponent(uid)}.ics`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Basic ${btoa(`${config.username || ''}:${config.password || ''}`)}`,
      'Content-Type': 'text/calendar; charset=utf-8'
    },
    body: icsText
  })
  if (res.status !== 201 && res.status !== 204) {
    throw new Error(`Event hochladen fehlgeschlagen (HTTP ${res.status})`)
  }
}

/** Einen Remote-VEVENT-Rohblock als einzelne VCALENDAR-Datei verpacken */
export function wrapSingleEvent(event: RemoteEvent): string {
  if (/BEGIN:VCALENDAR/i.test(event.data)) return event.data
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ChronoMind//Kalender-Abgleich//DE',
    'CALSCALE:GREGORIAN',
    event.data.trim(),
    'END:VCALENDAR'
  ].join('\r\n') + '\r\n'
}

/** ICS-Zeitstring (YYYYMMDDTHHMMSSZ) -> ISO */
export function icsUtcToIso(value: string): string {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/)
  if (!m) return value
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])).toISOString()
}
