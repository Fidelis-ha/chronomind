# CLAUDE.md – ChronoMind

> Dieses File wird von Claude Code bei jedem Start automatisch gelesen.
> Es enthält den vollständigen Projektkontext, die Architektur, Konventionen
> und Schritt-für-Schritt-Workflows. Halte es aktuell nach jeder Phase.

---

## Projektübersicht

**Name**: ChronoMind  
**Ziel**: KI-gestützte Zeiterfassungs-App mit natürlichsprachiger Eingabe per Text und Sprache, WebCal-Integration, Auswertung und flexiblen Exportformaten.  
**Plattform**: Web (Next.js PWA), später erweiterbar auf iOS/Android via Expo  
**Fusionierbar**: Architektur ist offen für spätere Zusammenführung mit einer Kalender-/Planungsapp

---

## Technologie-Stack

| Bereich | Technologie | Hinweis |
|---|---|---|
| Framework | Next.js 14 (App Router) | Kein Pages Router |
| Sprache | TypeScript | Strict Mode aktiviert |
| UI | shadcn/ui + Tailwind CSS | Keine eigene Komponentenbibliothek bauen |
| Datenbank | Supabase Cloud (PostgreSQL) | RLS auf allen Tabellen |
| Auth | Supabase Auth | Magic Link + Email/Password |
| KI-SDK | Vercel AI SDK | Multi-Provider-Abstraktion |
| KI-Provider | Mistral AI, routerlab.ch | routerlab.ch ist OpenAI-kompatibel |
| Spracheingabe | Web Speech API (Browser-nativ) | Kein externes API nötig |
| Kalender | ical.js | WebCal Import + Export |
| Charts | recharts | Für Auswertungsseite |
| State | Zustand + React Query | Kein Redux |
| Export | ical-generator, native CSV/JSON | |

---

## Basis-Repository

**Startpunkt**: `github.com/supabase-community/vercel-ai-chatbot`  
**Referenz für Zeiterfassungs-UI**: `github.com/ktmouk/minute`  

Claude Code: Lies beim Start die wichtigsten Dateien des geklonten Repos,
bevor du Änderungen vornimmst:
- `app/` (Routing-Struktur verstehen)
- `lib/ai/` (bestehende Provider-Abstraktion)
- `lib/db/schema.ts` (bestehendes Datenbankschema)
- `components/` (vorhandene UI-Komponenten)

---

## Repository & Git-Konventionen

```
Branch-Strategie:
  main          → stabil, production-ready (kein direkter Push)
  develop       → Integrations-Branch
  feature/<name> → ein Branch pro Feature/Phase

Commit-Format (Conventional Commits):
  feat:     Neue Funktionalität
  fix:      Bugfix
  chore:    Setup, Dependencies, Konfiguration
  docs:     Dokumentation, CLAUDE.md Updates
  refactor: Umstrukturierung ohne neue Features
  test:     Tests

Phase-Tags nach Abschluss:
  phase-1-complete
  phase-2-complete
  phase-3-complete

Niemals committen:
  .env.local
  API Keys
  node_modules/
```

**Nach jedem abgeschlossenen Feature automatisch committen:**
```bash
git add -A
git commit -m "feat: <beschreibung>"
```

---

## Projektstruktur (Ziel-Zustand)

```
/
├── CLAUDE.md                          ← dieses File
├── README.md
├── .env.example                       ← committed, Platzhalter-Werte
├── .env.local                         ← gitignored, echte Keys
├── .gitignore
├── .github/
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
│
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (app)/
│       ├── _layout.tsx
│       ├── page.tsx                   ← Today Dashboard
│       ├── chat/page.tsx              ← KI-Chat
│       ├── entries/
│       │   ├── page.tsx               ← Liste + Filter
│       │   └── [id]/page.tsx          ← Detail/Edit
│       ├── analytics/page.tsx         ← Auswertung + KI-Analyse
│       ├── calendars/page.tsx         ← WebCal verwalten
│       └── settings/
│           ├── page.tsx
│           └── ai-provider/page.tsx
│
├── components/
│   ├── chat/
│   │   ├── ChatBubble.tsx
│   │   ├── VoiceInputButton.tsx       ← Web Speech API
│   │   └── TypingIndicator.tsx
│   ├── entries/
│   │   ├── TimeEntryCard.tsx
│   │   ├── EntryForm.tsx
│   │   └── TimerWidget.tsx            ← Floating aktiver Timer
│   ├── analytics/
│   │   ├── BarChart.tsx               ← recharts
│   │   ├── CategoryPie.tsx            ← recharts
│   │   └── AiInsightPanel.tsx
│   └── ui/                            ← shadcn/ui Komponenten
│
├── lib/
│   ├── ai/
│   │   ├── providers/
│   │   │   ├── mistral.ts
│   │   │   └── routerlab.ts           ← OpenAI-kompatibel
│   │   ├── tools/
│   │   │   ├── create-time-entry.ts   ← Tool Calling
│   │   │   ├── update-time-entry.ts
│   │   │   └── list-time-entries.ts
│   │   └── system-prompt.ts           ← Dynamischer System-Prompt
│   ├── calendar/
│   │   ├── webcal.ts                  ← Import (ical.js)
│   │   ├── export.ts                  ← Export (ical-generator)
│   │   └── sync.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts                  ← Server-seitiger Client
│   │   └── queries.ts
│   └── hooks/
│       ├── useTimeEntries.ts
│       ├── useCalendarEvents.ts
│       └── useVoiceInput.ts           ← Web Speech API Hook
│
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql
        └── 002_time_tracking.sql
```

---

## Datenbank-Schema

> Claude Code: Führe Schemaänderungen immer als neue Migration durch.
> Niemals bestehende Migrations-Dateien editieren.

```sql
-- 002_time_tracking.sql (ergänzt das Basis-Schema des Chatbot-Templates)

create table time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  category text,
  tags text[],
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds int generated always as
    (extract(epoch from (ended_at - started_at))::int) stored,
  source text check (source in
    ('ai_chat','manual','voice','calendar')),
  calendar_event_id text,        -- Soft-Link zu calendar_events
  metadata jsonb,
  created_at timestamptz default now()
);

create table calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  webcal_url text not null,      -- webcal:// oder https://
  color text,
  auto_suggest boolean default true,
  last_synced_at timestamptz,
  created_at timestamptz default now()
);

create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid references calendars not null,
  user_id uuid references auth.users not null,
  external_id text not null,
  title text not null,
  description text,
  started_at timestamptz not null,
  ended_at timestamptz,
  location text,
  raw_ical text,
  unique(calendar_id, external_id)
);

create table user_settings (
  user_id uuid primary key references auth.users,
  ai_provider text default 'mistral'
    check (ai_provider in ('mistral', 'routerlab')),
  ai_model text default 'mistral-large-latest',
  ai_api_key_mistral text,
  ai_api_key_routerlab text,
  routerlab_base_url text default 'https://routerlab.ch/v1',
  timezone text default 'Europe/Berlin',
  work_day_start time default '08:00',
  work_day_end time default '18:00'
);

-- RLS aktivieren
alter table time_entries enable row level security;
alter table calendars enable row level security;
alter table calendar_events enable row level security;
alter table user_settings enable row level security;

-- RLS Policies (user sieht nur eigene Daten)
create policy "Own data only" on time_entries
  for all using (auth.uid() = user_id);

create policy "Own data only" on calendars
  for all using (auth.uid() = user_id);

create policy "Own data only" on calendar_events
  for all using (auth.uid() = user_id);

create policy "Own data only" on user_settings
  for all using (auth.uid() = user_id);
```

---

## KI-Integration

### System-Prompt (dynamisch aufgebaut)

```typescript
// lib/ai/system-prompt.ts
export function buildSystemPrompt(context: {
  now: Date
  timezone: string
  workStart: string
  workEnd: string
  todayEntries: TimeEntry[]
  todayCalendarEvents: CalendarEvent[]
}): string {
  return `
Du bist ein hilfreicher Zeiterfassungs-Assistent. Heute ist 
${context.now.toLocaleDateString('de-DE', { timeZone: context.timezone })},
${context.now.toLocaleTimeString('de-DE', { timeZone: context.timezone })} Uhr.

Arbeitszeit des Nutzers: ${context.workStart} – ${context.workEnd} Uhr.

Bereits erfasste Einträge heute:
${context.todayEntries.map(e => 
  `- ${e.title}: ${e.started_at} bis ${e.ended_at ?? 'läuft noch'}`
).join('\n') || 'Noch keine Einträge.'}

Geplante Termine heute (aus Kalender):
${context.todayCalendarEvents.map(e =>
  `- ${e.title}: ${e.started_at} – ${e.ended_at}`
).join('\n') || 'Keine Termine.'}

Deine Aufgaben:
1. Verstehe natürlichsprachige Zeitangaben ("von 9 bis 11", "2 Stunden", "heute Vormittag")
2. Frage nach fehlenden Informationen (Kategorie, Beschreibung) wenn nötig
3. Weise auf Kalendertermine ohne Zeiteintrag hin
4. Nutze Tools um Einträge zu erstellen/bearbeiten
5. Antworte immer auf Deutsch
  `
}
```

### Tool Calling (KI erstellt Einträge strukturiert)

```typescript
// lib/ai/tools/create-time-entry.ts
export const createTimeEntryTool = {
  description: 'Erstellt einen neuen Zeiteintrag in der Datenbank',
  parameters: z.object({
    title: z.string().describe('Bezeichnung der Tätigkeit'),
    category: z.string().optional().describe('Kategorie z.B. Arbeit, Meeting, Pause'),
    started_at: z.string().describe('Startzeit als ISO 8601'),
    ended_at: z.string().optional().describe('Endzeit als ISO 8601, optional wenn noch aktiv'),
    description: z.string().optional(),
  }),
  execute: async (params) => {
    // Supabase insert
  }
}
```

### Provider-Abstraktion

```typescript
// routerlab.ch ist OpenAI-kompatibel → OpenAI-Provider des AI SDK verwenden
import { createOpenAI } from '@ai-sdk/openai'

const routerlab = createOpenAI({
  baseURL: process.env.ROUTERLAB_BASE_URL,
  apiKey: process.env.ROUTERLAB_API_KEY,
})

// Mistral direkt über @ai-sdk/mistral
import { mistral } from '@ai-sdk/mistral'
```

---

## Spracheingabe (Web Speech API)

```typescript
// lib/hooks/useVoiceInput.ts
// Kein externes API, kein Kosten, funktioniert im Browser nativ
export function useVoiceInput(onResult: (text: string) => void) {
  const startRecording = () => {
    const recognition = new (window.SpeechRecognition 
      || window.webkitSpeechRecognition)()
    recognition.lang = 'de-DE'
    recognition.continuous = false
    recognition.onresult = (e) => onResult(e.results[0][0].transcript)
    recognition.start()
  }
  return { startRecording }
}
```

---

## WebCal Integration

```typescript
// lib/calendar/webcal.ts
import ICAL from 'ical.js'

export async function syncCalendar(calendar: Calendar) {
  // webcal:// → https:// konvertieren
  const url = calendar.webcal_url.replace(/^webcal:\/\//, 'https://')
  
  const response = await fetch(url)
  const icalData = await response.text()
  
  const parsed = ICAL.parse(icalData)
  const comp = new ICAL.Component(parsed)
  const events = comp.getAllSubcomponents('vevent')
  
  // Events in Supabase upserten (unique: calendar_id + external_id)
  return events.map(event => ({
    external_id: event.getFirstPropertyValue('uid'),
    title: event.getFirstPropertyValue('summary'),
    started_at: event.getFirstPropertyValue('dtstart').toJSDate(),
    ended_at: event.getFirstPropertyValue('dtend')?.toJSDate(),
  }))
}
```

---

## Export-Formate

```typescript
// lib/calendar/export.ts

// iCal Export (~3h Implementierung)
import ical from 'ical-generator'
export function exportAsICal(entries: TimeEntry[]): string {
  const cal = ical({ name: 'ChronoMind Zeiterfassung' })
  entries.forEach(e => cal.createEvent({
    start: new Date(e.started_at),
    end: new Date(e.ended_at),
    summary: e.title,
    description: e.description,
  }))
  return cal.toString()
}

// CSV Export (~1h Implementierung)
export function exportAsCSV(entries: TimeEntry[]): string {
  const header = 'Titel,Kategorie,Start,Ende,Dauer (Min)\n'
  return header + entries.map(e =>
    `"${e.title}","${e.category}","${e.started_at}","${e.ended_at}","${Math.round(e.duration_seconds / 60)}"`
  ).join('\n')
}

// JSON Export (~20min)
export function exportAsJSON(entries: TimeEntry[]): string {
  return JSON.stringify(entries, null, 2)
}
```

---

## Implementierungs-Phasen

> Claude Code: Arbeite eine Phase vollständig ab, bevor du zur nächsten gehst.
> Hake erledigte Punkte ab und update den Status unten.

### ✅/☐ Phase 1 – Foundation
**Branch**: `feature/phase-1-foundation`  
**Tag nach Abschluss**: `phase-1-complete`

- [ ] Basis-Repo klonen: `github.com/supabase-community/vercel-ai-chatbot`
- [ ] `.env.example` mit allen Variablen anlegen
- [ ] `README.md` mit Setup-Anleitung schreiben
- [ ] `.github/ISSUE_TEMPLATE/` anlegen
- [ ] Supabase Migration `002_time_tracking.sql` ausführen
- [ ] Auth-Seiten (Login, Register) anpassen/übersetzen
- [ ] Manuelle Zeiterfassung: `EntryForm.tsx` + `TimeEntryCard.tsx`
- [ ] Eintrags-Liste mit Datumsfilter: `app/(app)/entries/page.tsx`
- [ ] Today-Dashboard: `app/(app)/page.tsx`
- [ ] `useTimeEntries.ts` Hook (CRUD + Realtime)
- [ ] Settings-Seite: Zeitzone, Arbeitszeiten

### ☐ Phase 2 – KI-Chat + Sprache
**Branch**: `feature/phase-2-ai-chat`  
**Tag nach Abschluss**: `phase-2-complete`

- [ ] System-Prompt Builder (`lib/ai/system-prompt.ts`)
- [ ] Tool: `create_time_entry`
- [ ] Tool: `update_time_entry`
- [ ] Tool: `list_time_entries` (KI kann Kontext abfragen)
- [ ] Chat-Route anpassen: Tools + System-Prompt einbinden
- [ ] `VoiceInputButton.tsx` mit Web Speech API
- [ ] `useVoiceInput.ts` Hook
- [ ] routerlab.ch Provider einbinden
- [ ] AI-Provider-Auswahl in Settings

### ☐ Phase 3 – Kalender + Auswertung + Export
**Branch**: `feature/phase-3-calendar-analytics`  
**Tag nach Abschluss**: `phase-3-complete`

- [ ] `webcal.ts`: WebCal Import + ical.js Parsing
- [ ] `sync.ts`: Sync beim App-Start
- [ ] Kalender-Verwaltungsseite
- [ ] Kalendertermine im Today-Dashboard anzeigen
- [ ] KI erhält Kalenderkontext im System-Prompt
- [ ] `BarChart.tsx` + `CategoryPie.tsx` mit recharts
- [ ] Auswertungsseite mit Datumsfilter
- [ ] `AiInsightPanel.tsx`: "Analysiere meine Woche"-Button
- [ ] Export: iCal, CSV, JSON

---

## Umgebungsvariablen (.env.example)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# KI Provider
MISTRAL_API_KEY=
ROUTERLAB_API_KEY=
ROUTERLAB_BASE_URL=https://routerlab.ch/v1

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Wichtige Regeln (nicht verhandelbar)

1. **Niemals API Keys in Code oder Git** – nur `.env.local`
2. **RLS auf allen Tabellen** – kein User sieht fremde Daten
3. **Migrations nie editieren** – nur neue Dateien anlegen
4. **Kein direkter Push auf `main`** – immer über `develop`
5. **Conventional Commits** – bei jedem Commit
6. **Keine Class Components** – nur Hooks + Funktionale Komponenten
7. **Alle API-Calls über den Provider-Layer** – nie direkte fetch()-Calls zu KI-APIs in Components

---

## Extensibility (Zukunft)

Das Projekt ist bewusst so gebaut, dass es erweiterbar bleibt:

| Zukünftiges Feature | Vorbereitung |
|---|---|
| iOS/Android App | Next.js → React Native, Logik in `lib/` ist portierbar |
| Kalender-App Fusion | `calendar_events` ist standalone, `time_entries.calendar_event_id` ist Soft-Link |
| NFC-Tracking | `source`-Feld in `time_entries` hat bereits Platz für neue Quellen |
| Weitere KI-Provider | Provider-Layer in `lib/ai/providers/` einfach erweitern |
| Proaktive Check-ins | Supabase Edge Functions + Push-Notifications nachrüstbar |

---

## Aktueller Status

**Aktuelle Phase**: Phase 1 – noch nicht gestartet  
**Letzter Commit**: –  
**Offene Blocker**: 
- [ ] Supabase-Projekt anlegen und URL/Keys in `.env.local` eintragen
- [ ] routerlab.ch API-Kompatibilität prüfen (OpenAI-kompatibel?)
- [ ] GitHub-Repo anlegen

---

*Zuletzt aktualisiert: 2026-04-05*  
*Claude Code: Aktualisiere Datum und Status nach jeder abgeschlossenen Teil-Aufgabe.*
