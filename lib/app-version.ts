// App-Version: EINMALIG pro Release hier pflegen (Changelog kurz und übersichtlich halten).
// Commit-SHA und Build-Zeitpunkt werden beim Build injiziert (next.config.js):
// - Vercel: VERCEL_GIT_COMMIT_SHA des deployten Commits
// - lokal: git rev-parse HEAD + Build-Zeit

export const APP_VERSION = '1.1.0'

export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.0',
    date: '15.10.2026',
    changes: [
      'Neu: Wake-Reminder – nach 5 Min. Ruhezeit bei laufender Zeiterfassung erscheint beim Wiederaufwachen eine Push-Meldung mit Auswahl-Dialog',
      'Auswahl: Top 10 der häufigsten Aktivitäten der letzten 7 Tage + alle Aktivitäten von heute; Antippen stoppt die alte Erfassung und startet die neue ab jetzt'
    ]
  },
  {
    version: '1.0.0',
    date: '14.10.2026',
    changes: [
      'Zeitstrahl: 1 Tap legt einen Eintrag sofort an, Ziehgriffe zum Anpassen, Popover blockiert nichts mehr, Drag-to-Create mit der Maus',
      'Kontinuierlicher Zoom (Pinch/Strg+Rad) ohne Zeit-Drift am Ankerpunkt',
      'Design-Prototypen unter /design'
    ]
  }
]

export const GITHUB_REPO = 'https://github.com/Fidelis-ha/chronomind'

export function commitUrl(sha: string): string {
  return sha ? `${GITHUB_REPO}/commit/${sha}` : GITHUB_REPO
}

export function shortSha(sha: string): string {
  return sha ? sha.slice(0, 7) : '—'
}

/** Build-Zeit deterministisch in Berlin-Zeit formatieren (identisch auf Server + Client) */
export function formatBuildTime(iso: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const parts = new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).formatToParts(d)
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
    return `${get('day')}.${get('month')}.${get('year')} ${get('hour')}:${get('minute')}`
  } catch {
    return '—'
  }
}

export const APP_COMMIT_SHA: string = process.env.NEXT_PUBLIC_COMMIT_SHA || ''
export const APP_BUILD_TIME: string = process.env.NEXT_PUBLIC_BUILD_TIME || ''
