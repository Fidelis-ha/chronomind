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

- Natürlichsprachige Zeiterfassung per Chat (KI-gestützt)
- Sprachinput per Web Speech API
- WebCal-Kalender-Import
- Auswertung mit Charts
- Export: iCal, CSV, JSON
- Multi-Provider-KI (Mistral, routerlab.ch)

## Setup

### 1. Umgebungsvariablen

In Vercel projekt settings eintragen:

- `JWT_SECRET` – ein starker Secret-String für JWT-Signierung
- `MISTRAL_API_KEY` – von [console.mistral.ai](https://console.mistral.ai)
- `NEXT_PUBLIC_MISTRAL_API_KEY` – (optional, wird in User Settings gespeichert)

### 2. Demo-Login

```
E-Mail:    demo@chronomind.app
Passwort:  demo123
```

Eigene Nutzer können sich über /sign-up registrieren (Daten werden In-Memory gespeichert — für Demo-Zwecke).
Optional: GitHub OAuth aktivieren unter **Auth > Providers > GitHub**

### 4. Dependencies installieren

```bash
pnpm install
```

### 5. Entwicklung starten

```bash
pnpm dev
```

App läuft auf [http://localhost:3000](http://localhost:3000)

## Entwicklung

### Architektur

**Auth**: JWT-basierte Sessions (jose) — Cookie: `chronomind-session`
**Storage**: In-Memory Store (Demo) — für Production bitte durch echte DB ersetzen
**Zeiterfassung**: `/api/entries` API-Routen

### Branch-Strategie

```
main          → stabil, production-ready
develop       → Integrations-Branch
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
| DB | In-Memory (Demo) |
| Auth | JWT (jose) |
| KI | Vercel AI SDK + Mistral |
| Charts | recharts |

## Lizenz

MIT
