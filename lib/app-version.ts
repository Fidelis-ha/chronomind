// App-Version: Bei JEDER Änderung (auch nicht nutzersichtbaren) hier pflegen:
// Versions-Bump + Changelog-Eintrag. Changelog kurz und übersichtlich halten.
// Commit-SHA und Build-Zeitpunkt werden beim Build injiziert (next.config.js):
// - Vercel: VERCEL_GIT_COMMIT_SHA des deployten Commits
// - lokal: git rev-parse HEAD + Build-Zeit

export const APP_VERSION = '1.2.8'

export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.8',
    date: '21.10.2026',
    changes: [
      'Startseite: Höhe berücksichtigt jetzt Geräte mit Gestenleiste, ältere Browser bekommen einen Rückfallwert – die Seite scrollt nicht mehr',
      'Startseite: Cloud-Sync-Fehler zeigt wieder einen kleinen roten Punkt zum erneuten Versuchen',
      'Berechtigungs-Leiste kompakter (eine Zeile), „Test“ spielt das eingestellte Vibrationsmuster',
      'Einstellungen: Vibrationsmuster wirkt sofort beim Auswählen, nicht erst nach dem Speichern',
      'Erinnerung: Vibrationsmuster wird verlässlich über die App ausgelöst'
    ]
  },
  {
    version: '1.2.7',
    date: '21.10.2026',
    changes: [
      'Darstellung: Hell, Dunkel oder System jetzt in den Einstellungen wählbar – der Schalter oben im Kopf entfällt'
    ]
  },
  {
    version: '1.2.6',
    date: '21.10.2026',
    changes: [
      'Seiten-Titel entfernt (Auswertung, Kalender, Einstellungen) – der Inhalt beginnt direkt unter dem Kopf, dadurch mehr Platz'
    ]
  },
  {
    version: '1.2.5',
    date: '21.10.2026',
    changes: [
      'Startseite heißt jetzt „Home“ statt „Heute“',
      'Startseite: Der Zeitstrahl füllt die ganze Seite – kein Scrollen der Seite mehr, nur noch im Zeitstrahl',
      'Startseite: Datum und Kategorien sind schwebende Knöpfe über dem Zeitstrahl, die sich aus- und einklappen lassen',
      'Startseite: Die Zeilen „Timer läuft“, „noch nicht gesichert“ und die eingebettete Einträge-Liste sind entfernt – alle Einträge stehen im Reiter Einträge',
      'Reiterleiste unten schwebt jetzt auf allen Seiten über dem Inhalt'
    ]
  },
  {
    version: '1.2.4',
    date: '21.10.2026',
    changes: [
      'Erinnerung: Das Handy vibriert beim Erinnerungsfenster mit einem eigenen Muster statt mit dem Standardmuster',
      'Einstellungen: Neuer Bereich „Erinnerung & Vibration“ – Muster wählbar (Kurz, Doppelt, Dreifach, Lang, Herzschlag, Aus) mit Test-Knopf'
    ]
  },
  {
    version: '1.2.3',
    date: '21.10.2026',
    changes: [
      'Berechtigungen: Die App fragt beim Öffnen nach der Benachrichtigungs-Erlaubnis, wenn sie fehlt – als schmale, schwebende Leiste mit Erlauben-Knopf, nicht als Popup',
      'Berechtigungen: Ist die Benachrichtigung im Browser blockiert oder gar nicht vorhanden, sagt die Leiste das im Klartext; ein Knopf prüft die Vibration direkt am Gerät'
    ]
  },
  {
    version: '1.2.2',
    date: '21.10.2026',
    changes: [
      'Chat: antwortet jetzt auch ohne Anmeldung (lokaler Modus) und nutzt die auf dem Gerät hinterlegten KI-Einstellungen',
      'Chat: bricht nicht mehr ab, wenn die lokale Datenbank nicht verfügbar ist',
      'Kalender: Nextcloud-Verknüpfung funktioniert (Server-Proxy gegen Browser-Blockade), Kalenderliste, Anlegen, Hochladen und Übernehmen geprüft',
      'Kalender: Fehler beim Laden der Kalender bleiben sichtbar stehen statt nur kurz aufzublitzen'
    ]
  },
  {
    version: '1.2.1',
    date: '21.10.2026',
    changes: [
      'Sicherheit: Cloud-Zugangsdaten werden beim ersten Laden verschlüsselt (Migration repariert)',
      'Sicherheit: nicht entschlüsselbare Zugangsdaten gelten als nicht vorhanden statt als eingerichtet',
      'Zeitachse: Lückenfüllung bezieht sich nur auf Einträge, nicht auf Pläne',
      'Zeitachse: Hinweis im Bestätigungstext, wenn eine Lücke automatisch geschlossen wurde',
      'Erinnerungsfenster: Zurücktaste schließt weiterhin nur das Fenster (kein doppelter Verlaufseintrag)',
      'Kalender: Import liest Zeitangaben mit Zeitzone korrekt, Titel mit Sonderzeichen sauber, Dauer wird berechnet',
      'Kalender: Zeilenumbrüche in der Datei entsprechen der Norm (auch bei Umlauten)'
    ]
  },
  {
    version: '1.2.0',
    date: '20.10.2026',
    changes: [
      'Kalender: beim Öffnen wird automatisch eine aktuelle Kalender-Datei (.ics) erzeugt und bei jeder Änderung nachgeführt',
      'Kalender: optionale Nextcloud-Verknüpfung – Kalender anlegen/wählen und ohne Doppel-Einträge abgleichen (überschreiben oder übernehmen)'
    ]
  },
  {
    version: '1.1.9',
    date: '20.10.2026',
    changes: [
      'Chat-Reiter zeigt ohne eingerichtete KI nur einen Hinweis mit Direktauweisung zur KI-Einrichtung',
      'Sicherheit: API-Keys, Passwörter und Tokens werden auf dem Gerät verschlüsselt gespeichert (nicht mehr im Klartext lesbar)',
      'Backups verschlüsseln alle Zugangsdaten mit einer Passphrase – KI-Zugang überlebt Backup-Wiederherstellung'
    ]
  },
  {
    version: '1.1.8',
    date: '20.10.2026',
    changes: [
      'Auswertung komplett neu: chart.js statt Recharts, mit Zeitraum-Filter (7/30/90/Alles)',
      'Fünf Auswertungen: Kategorien-Verteilung, Zeit pro Tag, Top 8 Aktivitäten, Tageszeit-Profil, Wochenverlauf'
    ]
  },
  {
    version: '1.1.7',
    date: '20.10.2026',
    changes: [
      'Reiter „Einträge" aufgeräumt: nur noch die Liste und ein Datums-Filter (leer = alle Einträge, neueste zuerst)'
    ]
  },
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
