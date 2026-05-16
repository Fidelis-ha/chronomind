# ChronoMind

> KI-gestützte Zeiterfassungs-App mit natürlichsprachiger Eingabe per Text und Sprache, WebCal-Integration, Auswertung und flexiblen Exportformaten.

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#setup"><strong>Setup</strong></a> ·
  <a href="#entwicklung"><strong>Entwicklung</strong></a> ·
  <a href="#deploy"><strong>Deploy</strong></a>
</p>
<br/>

## Features

- **Zeiterfassung**: Manuelle Einträge mit Titel, Kategorie, Datum/Zeit, Beschreibung
- **Natürlichsprachige Zeiterfassung per Chat** (KI-gestützt mit Mistral/RouterLab)
- **Sprachinput** per Web Speech API
- **Kalender-Verwaltung**: WebCal-URLs hinzufügen und synchronisieren
- **Auswertung**: Stundenauswertung (BarChart) und Kategorie-Verteilung (PieChart) mit Periodenfilter
- **Export**: iCal (.ics), CSV, JSON – alles direkt im Browser generiert
- **Import**: JSON-Backup wiederherstellen
- **Cloud Backup**: S3 oder WebDAV konfigurierbar
- **KI-Einstellungen**: Anbieter (Mistral/RouterLab) und API-Keys in Settings verwalten

## Setup

### 1. Dependencies installieren

```bash
npm install
```

### 2. Entwicklung starten

```bash
npm run dev
```

App läuft auf [http://localhost:3000](http://localhost:3000)

### 3. Demo-Login

```
E-Mail:    demo@chronomind.app
Passwort:  demo123
```

## Entwicklung

### Verfügbare Seiten

| Route | Beschreibung |
|-------|--------------|
| `/app_main` | Dashboard – Heutige Übersicht und Einträge |
| `/app_main/entries` | Alle Zeiteinträge mit Datumsfilter |
| `/app_main/chat` | KI-Chat für natürliche Zeiterfassung |
| `/app_main/analytics` | Auswertung mit Charts |
| `/app_main/calendar` | Kalender-Verwaltung (WebCal) |
| `/app_main/settings` | Einstellungen (KI, Zeit, Backup, Export) |

### Architektur

| Bereich | Technologie |
|---------|-------------|
| Framework | Next.js 14 (App Router) |
| Sprache | TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| Storage | localStorage (client-seitig) |
| Auth | JWT (jose) – lokale Sessions |
| KI | Mistral AI / RouterLab (fetch-basiert, kein SDK) |
| Charts | recharts |
| Kalender | ical.js |

### Branch-Strategie

```
main          → stabil, production-ready
feature/<name> → ein Branch pro Feature
```

### Conventional Commits

```bash
git commit -m "feat: neue Funktion"
git commit -m "fix: bug behoben"
git commit -m "docs: dokumentation aktualisiert"
```

## Tech Stack

| Bereich | Technologie |
|---------|-------------|
| Framework | Next.js 14 (App Router) |
| Sprache | TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| Storage | localStorage |
| Auth | JWT (jose) |
| KI | Mistral AI / RouterLab |
| Charts | recharts |

## Lizenz

MIT