# CLAUDE.md – ChronoMind

KI-gestützte Zeiterfassungs-App. Next.js 14 + SQLite (lokal) + Vercel AI SDK + shadcn/ui.

---

## Tech-Stack
- **Framework**: Next.js 14 (App Router), TypeScript
- **DB**: SQLite (besser-sqlite3 + Drizzle ORM) - lokal gespeichert
- **Auth**: Lokale JWT-Sessions (jose)
- **KI**: Vercel AI SDK, Provider: Mistral/routerlab.ch (extern)
- **Features**: Web Speech API, ical.js, recharts
- **Cloud Backup**: S3 oder WebDAV (optional)

---

## Git & Workflow
```
main → production | develop → Integration | feature/<name> → Features
```
Commits: `feat:`, `fix:`, `chore:`, `docs:`

---

## Projektstruktur
```
app/(app)/
├── page.tsx           ← Today Dashboard
├── chat/page.tsx     ← KI-Chat
├── entries/page.tsx  ← Liste + Filter
├── analytics/page.tsx
├── calendars/page.tsx
└── settings/page.tsx

lib/
├── db/
│   ├── schema.ts      ← Drizzle Schema (users, sessions, chats, time_entries, etc.)
│   ├── local.ts       ← DB Access Layer
│   └── index.ts       ← DB Instance
├── auth/
│   ├── session.ts     ← JWT Session Management
│   └── password.ts    ← Password Hashing
├── backup/
│   └── index.ts       ← Cloud Backup (S3, WebDAV)
└── ai/
    ├── system-prompt.ts
    └── tools/
        ├── create-time-entry.ts
        ├── update-time-entry.ts
        └── list-time-entries.ts
```

---

## Datenbank (SQLite)

**Tabellen:**
- `users`: id, email, password_hash, created_at
- `sessions`: id, user_id, expires_at
- `chats`: id, user_id, payload (JSON)
- `time_entries`: id, user_id, title, category, started_at, ended_at, etc.
- `calendars`: id, user_id, name, webcal_url, color, etc.
- `calendar_events`: id, calendar_id, user_id, external_id, title, etc.
- `user_settings`: user_id, ai_provider, timezone, backup_provider, backup_config

**DB-Pfad**: `DATABASE_PATH` env var (Standard: `./chronomind.db`)

---

## Auth

- Lokale JWT-Sessions via `jose`
- Passwords werden mit `scrypt` gehashed
- Cookie: `chronomind-session` (httpOnly, secure in Production)

---

## Cloud Backup

In `lib/backup/index.ts`:
- `exportDatabase()` - Export aller DB-Daten als JSON
- `backupToS3()` - Sichert zu Amazon S3
- `backupToWebDAV()` - Sichert zu WebDAV-Server

**Konfiguration** in Settings:
- Backup Provider: '' (kein), 's3', 'webdav'
- S3: bucket, region, access key, secret key
- WebDAV: URL

---

## Regeln
1. Keine API Keys in Code - nur `.env.local`
2. Alle Daten lokal speichern - keine externe DB
3. Conventional Commits

---

## Aktueller Status
✅ Phase 1: Auth, Manual Entry, Dashboard (lokal)
✅ Phase 2: KI-Chat + Sprache + VoiceInput + AI SDK v6
✅ Phase 3 (teilweise): Cloud Backup zu S3/WebDAV
⬜ Phase 3 complete: Kalender, Analytics, Export

**Phase 3 TO-DO:**
- lib/calendar/webcal.ts + sync.ts
- Kalender-Verwaltungsseite
- recharts: BarChart + CategoryPie
- Auswertungsseite + AiInsightPanel
- Export: iCal, CSV, JSON

---

## .env.example
```
DATABASE_PATH=./chronomind.db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
MISTRAL_API_KEY=your-mistral-api-key
ROUTERLAB_API_KEY=your-routerlab-api-key
ROUTERLAB_BASE_URL=https://routerlab.ch/v1
```

---

*2026-05-08*
