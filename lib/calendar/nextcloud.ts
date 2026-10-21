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
  dtstart: string // ICS-Zeitstring (UTC)
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
      summary: data.match(/SUMMARY:(.+)/)?.[1]?.trim() || '',
      dtstart: data.match(/DTSTART[^:]*:(.+)/)?.[1]?.trim() || '',
      dtend: data.match(/DTEND[^:]*:(.+)/)?.[1]?.trim() || '',
      data
    })
  }
  return events
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
