# ChronoMind — Projekt Dokumentation

## Aktueller Stand (2026-05-15)

**Architektur:** Next.js 14 (App Router) + Vercel AI SDK v6 + better-sqlite3 (Drizzle ORM)
**Deployment:** https://chronomind-expo.vercel.app (produktiv)
**GitHub:** https://github.com/Fidelis-ha/chronomind (main branch → Vercel GitHub Integration → chronomind-fidelis projekt)
**Datenbank:** SQLite (lokale Datei `/tmp/chronomind.db` auf Vercel, `chronomind.db` lokal)
**Authentifizierung:** JWT-basierte Sessions mit Cookies (7 Tage Gültigkeit)

---

## Technologie-Stack

```
Framework:       Next.js 14 (App Router)
Sprache:         TypeScript
Datenbank:       better-sqlite3 + Drizzle ORM
AI:              Mistral API (OpenAI-kompatibel)
AI-SDK:          Vercel AI SDK v6 (@ai-sdk/react, ai@6.0.180)
Auth:            JWT (jose library) + bcrypt
Styling:         Tailwind CSS + shadcn/ui Komponenten
Kalender:        WebDAV (iCloud-calendars, Nextcloud)
Deployment:      Vercel (GitHub Integration)
```

---

## Projekt-Struktur

```
chronomind/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Geschützte Routes (Dashboard, Entries, etc.)
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard (Today)
│   │   ├── entries/              # Zeiteinträge
│   │   │   ├── page.tsx         # Liste
│   │   │   └── [id]/page.tsx    # Einzelansicht
│   │   ├── chat.tsx             # KI Chat Interface
│   │   ├── calendar.tsx         # Kalender Integration
│   │   └── settings.tsx         # Einstellungen
│   ├── (auth)/                   # Öffentliche Routes
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   └── api/                      # API Routes
│       ├── auth/
│       │   ├── sign-in/route.ts
│       │   ├── sign-up/route.ts
│       │   └── session/route.ts
│       ├── entries/
│       │   ├── route.ts         # GET (Liste), POST (Erstellen)
│       │   └── [id]/route.ts   # GET (einzeln), PUT, DELETE
│       ├── chat/route.ts
│       ├── settings/route.ts
│       └── backup/route.ts
├── components/                   # React Komponenten
│   ├── login-form.tsx
│   ├── entry-form.tsx
│   └── ...
├── lib/
│   ├── db/
│   │   ├── index.ts             # Drizzle + better-sqlite3 Instance
│   │   ├── schema.ts            # Tabellendefinitionen (users, sessions, time_entries, etc.)
│   │   └── local.ts             # Datenbank-Helper (CRUD Funktionen)
│   ├── auth/
│   │   ├── session.ts           # JWT Token Erstellung/Validierung
│   │   ├── password.ts          # bcrypt Hashing
│   │   └── index.ts             # Auth Helper
│   └── ai/
│       ├── index.tsx            # AI SDK Setup (Mistral)
│       └── tools/               # AI Tools (create-time-entry, etc.)
├── middleware.ts                 # Auth-Middleware
└── package.json
```

---

## Datenbank-Schema

### users
| Feld | Typ | Beschreibung |
|---|---|---|
| id | TEXT (UUID) | Primärschlüssel |
| email | TEXT | Unique |
| password_hash | TEXT | bcrypt hash |
| created_at | INTEGER | Unix timestamp |

### sessions
| Feld | Typ | Beschreibung |
|---|---|---|
| id | TEXT (UUID) | Primärschlüssel |
| user_id | TEXT | FK → users |
| expires_at | INTEGER | Unix timestamp |

### time_entries
| Feld | Typ | Beschreibung |
|---|---|---|
| id | TEXT (UUID) | Primärschlüssel |
| user_id | TEXT | FK → users |
| title | TEXT | Projekt/Task Name |
| description | TEXT | Notizen |
| category | TEXT | Kategorie |
| tags | TEXT (JSON) | Array von Tags |
| started_at | TEXT | ISO timestamp |
| ended_at | TEXT | ISO timestamp (null wenn aktiv) |
| duration_seconds | INTEGER | Berechnete Dauer |
| source | TEXT | 'manual', 'ai_chat', 'calendar' |
| calendar_event_id | TEXT | Referenz zum Kalender-Event |
| metadata | TEXT (JSON) | Zusätzliche Metadaten |
| created_at | INTEGER | Unix timestamp |

### calendars
| Feld | Typ | Beschreibung |
|---|---|---|
| id | TEXT (UUID) | Primärschlüssel |
| user_id | TEXT | FK → users |
| name | TEXT | Kalender Name |
| webcal_url | TEXT | WebDAV URL |
| color | TEXT | Anzeigefarbe |
| auto_suggest | INTEGER | Boolean (1/0) |
| last_synced_at | TEXT | ISO timestamp |
| created_at | INTEGER | Unix timestamp |

### calendar_events
| Feld | Typ | Beschreibung |
|---|---|---|
| id | TEXT (UUID) | Primärschlüssel |
| calendar_id | TEXT | FK → calendars |
| user_id | TEXT | FK → users |
| external_id | TEXT | ID vom externen Kalender |
| title | TEXT | Titel |
| description | TEXT | Beschreibung |
| started_at | TEXT | ISO timestamp |
| ended_at | TEXT | ISO timestamp |
| location | TEXT | Ort |
| raw_ical | TEXT | Original iCal Daten |

### user_settings
| Feld | Typ | Beschreibung |
|---|---|---|
| user_id | TEXT | Primärschlüssel, FK → users |
| ai_provider | TEXT | 'mistral' |
| ai_model | TEXT | 'mistral-large-latest' |
| ai_api_key_mistral | TEXT | API Key (verschlüsselt) |
| ai_api_key_routerlab | TEXT | Backup API Key |
| routerlab_base_url | TEXT | 'https://routerlab.ch/v1' |
| timezone | TEXT | 'Europe/Berlin' |
| work_day_start | TEXT | '08:00' |
| work_day_end | TEXT | '18:00' |
| backup_provider | TEXT | 's3', 'webdav', oder leer |
| backup_config | TEXT (JSON) | Zugangsdaten |

### chats
| Feld | Typ | Beschreibung |
|---|---|---|
| id | TEXT (UUID) | Primärschlüssel |
| user_id | TEXT | FK → users |
| payload | TEXT (JSON) | Chat-Historie |

---

## API-Endpunkte

### Auth
- `POST /api/auth/sign-up` — Registrierung (email, password)
- `POST /api/auth/sign-in` — Login (email, password) → setzt Cookie
- `GET /api/auth/session` — Aktuelle Session (benötigt Cookie)

### Entries
- `GET /api/entries?date=YYYY-MM-DD` — Zeiteinträge für Datum
- `POST /api/entries` — Neuer Eintrag
- `GET /api/entries/[id]` — Einzelner Eintrag
- `PUT /api/entries/[id]` — Aktualisieren
- `DELETE /api/entries/[id]` — Löschen

### Sonstige
- `GET /api/chat` — Chat-Historie
- `POST /api/chat` — Neue Nachricht (mit AI)
- `GET /api/settings` — Benutzereinstellungen
- `PUT /api/settings` — Einstellungen aktualisieren
- `GET /api/backup` — Backup erstellen/herunterladen

---

## Environment Variables (Vercel)

| Variable | Wert |
|---|---|
| JWT_SECRET | chronomind-super-secret-jwt-key-2026 |
| DATABASE_PATH | /tmp/chronomind.db (Vercel), ./chronomind.db (lokal) |
| MISTRAL_API_KEY | (via Vercel dashboard) |
| ROUTERLAB_BASE_URL | https://routerlab.ch/v1 |

---

## Lokale Entwicklung

```bash
cd /opt/data/chronomind

# Dependencies installieren
npm install

# Development Server starten
npm run dev

# Build (erfolgreich mit exit code 0)
npm run build

# TypeScript Check
npx tsc --noEmit

# Production deploy (Vercel CLI)
VERCEL_TOKEN=$(cat .vercel_token) npx vercel deploy --prod
```

---

## Wichtige Dateien

- `middleware.ts` — Auth-Check für geschützte Routes
- `lib/auth/session.ts` — JWT Token handling (7 Tage, cookie-basiert)
- `lib/db/index.ts` — Database Instance + auto-initialisierung
- `lib/db/schema.ts` — Drizzle Schema Definitionen
- `lib/ai/index.tsx` — Mistral AI Setup mit Vercel AI SDK

---

## Bekannte Probleme und Lösungen

1. **TypeScript Schema-Mismatch:** `createdAt` in Schema ist `integer` (Unix timestamp), aber im Code wurde `Date` übergeben. Lösung: `Math.floor(Date.now() / 1000)` statt `new Date()`.

2. **Vercel CLI Auth-Probleme:** VERCEL_TOKEN wird nicht korrekt erkannt. Workaround: GitHub Integration nutzen → push to main triggers deployment.

3. **SQLite auf Vercel:** Serverless Functions haben `/tmp` als beschreibbares Verzeichnis. Database Path muss auf `/tmp/chronomind.db` gesetzt werden.

---

## Deployment

1. **GitHub push (main branch)** → Vercel GitHub Integration → automatischer Build
2. **Manuell via CLI:** `npx vercel deploy --prod` (funktioniert nur mit korrektem token)
3. **Aktuelle Produktion:** https://chronomind-expo.vercel.app

---

## Nächste Schritte (Review)

- [ ] Sign-up API testen (500 error behoben?)
- [ ] Sign-in mit frischem User testen
- [ ] Session-Cookie funktioniert?
- [ ] Entries API mit auth testen
- [ ] KI Chat funktioniert?
- [ ] Kalender-WebDAV-Sync testen
- [ ] Settings Page funktioniert?