// App-Version: Bei JEDER Änderung (auch nicht nutzersichtbaren) hier pflegen:
// Versions-Bump + Changelog-Eintrag. Changelog kurz und übersichtlich halten.
// Commit-SHA und Build-Zeitpunkt werden beim Build injiziert (next.config.js):
// - Vercel: VERCEL_GIT_COMMIT_SHA des deployten Commits
// - lokal: git rev-parse HEAD + Build-Zeit

export const APP_VERSION = '1.1.6'

export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.6',
    date: '20.10.2026',
    changes: [
      'Erinnerungsfenster ist jetzt bildschirmfüllend mit Schließen-X oben rechts (liegt auf dem Inhalt) und Android-Zurücktaste',
      'Erinnerungsliste: alle Zeiteinträge, sortiert nach letzter Aktivierung; Tippen des laufenden Eintrags lässt ihn weiterlaufen'
    ]
  },
  {
    version: '1.1.5',
    date: '20.10.2026',
    changes: [
      'Häufige Kategorien: vollständige, scrollbar Liste (statt max. 6) – sortiert nach Nutzung der letzten 7 Tage',
      'Nutzungszähler an den Kategorien-Chips entfernt; „keine Kategorie" erscheint nicht mehr'
    ]
  },
  {
    version: '1.1.4',
    date: '20.10.2026',
    changes: [
      'Keine Lücken mehr: Neue Einträge und Timer starten automatisch am Ende des letzten Eintrags (bis 10 Minuten Abstand)',
      'Einrasten präziser: snappt abhängig vom Zoom (nah = fein, weit = grob), auch beim Vergrößern/Verkleinern von Einträgen'
    ]
  },
  {
    version: '1.1.3',
    date: '20.10.2026',
    changes: [
      'Eintrag-Fenster: Antippen daneben schließt nur noch das Fenster (kein versehentlicher Eintrag mehr) – Regression behoben',
      'Eintrag-Fenster schließt sich beim Scrollen; der Kategorien-Dialog blockiert die Umgebung nicht mehr'
    ]
  },
  {
    version: '1.1.2',
    date: '20.10.2026',
    changes: [
      'App-Link-Verifizierung für den Android-TWA-Wrapper: assetlinks.json für de.gemeinsamwalter.chronomind hinzugefügt (keine Änderung in der App-Oberfläche)'
    ]
  },
  {
    version: '1.1.1',
    date: '15.10.2026',
    changes: [
      'Klick neben einem geöffneten Dialog legt keinen versehentlichen Eintrag mehr an',
      'Beim Ziehen langer Einträge bleibt die Von-bis-Zeit immer sichtbar (klebt am Bildschirmrand und wandert mit)',
      'Nach Timer-Ende erscheint der neue Eintrag nur noch einmal (kein Doppel-Balken); Timer aus QuickTap zeigen nun auch im Zeitstrahl',
      'Direkt angrenzende Einträge derselben Aktivität werden automatisch zu einem zusammengefasst'
    ]
  },
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
