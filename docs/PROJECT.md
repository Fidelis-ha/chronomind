# ChronoMind — Projekt Plan

## Vision

ChronoMind ist eine **KI-gestützte Zeiterfassungs-App**, die auf dem Gerät des Nutzers läuft (local-first). Kalendereinträge und Zeiteinträge werden lokal gespeichert. Optional kann der Nutzer eine eigene Cloud (S3/WebDAV) für Backups konfigurieren.

**Plattformen:** iOS, Android, Web (同一 Codebasis)

---

## Warum Expo + Capacitor

| Anforderung | Lösung |
|---|---|
| Lokale SQLite-DB | `expo-sqlite` (native SQLite) |
| Kalender-Zugriff | `expo-calendar` |
| Kamera für OCR | `expo-camera` |
| Push-Benachrichtigungen | `expo-notifications` + FCM/APNS |
| Social Sharing | `@capacitor/share` |
| iOS + Android | Capacitor 7 (Wrapper) |
| Offline-first | expo-sqlite |

---

## Technologie-Stack

```
Framework:       Expo SDK 54 + Capacitor 7
Sprache:        TypeScript
Datenbank:      expo-sqlite + Drizzle ORM
AI:             OpenAI-kompatibles API (Mistral)
AI-SDK:         Vercel AI SDK (AI SDK v6)
Kalender:       expo-calendar
Kamera:         expo-camera
Benachrichtigungen: expo-notifications
Teilen:         @capacitor/share
Build:          EAS Build (iOS), Android Studio (Android)
Web-Preview:    Vercel
API-Key:        Mistral: ME5YHYhXGcRYw2uMt0LdJQ
```

---

## Projekt-Struktur

```
chronomind-expo/
├── app/                        # expo-router Pages
│   ├── _layout.tsx             # Root Layout mit Auth-Provider
│   ├── (auth)/
│   │   └── sign-in.tsx
│   ├── (app)/
│   │   ├── _layout.tsx         # Geschützter Bereich
│   │   ├── index.tsx           # Dashboard / Today
│   │   ├── entries/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx       # Einträge-Liste
│   │   │   └── new.tsx        # Neuer Eintrag
│   │   ├── chat.tsx            # AI Chat
│   │   ├── calendar.tsx        # Kalender-Übersicht
│   │   └── settings.tsx
│   └── +html.tsx
├── lib/
│   ├── db/
│   │   ├── schema.ts           # Drizzle Schema
│   │   ├── index.ts            # DB Instance
│   │   └── queries.ts          # CRUD Funktionen
│   ├── auth/
│   │   ├── session.ts           # JWT Session
│   │   └── password.ts         # Password Hashing
│   ├── ai/
│   │   ├── index.tsx           # AI SDK Setup
│   │   ├── tools.ts            # AI Tools (create-entry, etc.)
│   │   └── prompts.tsx         # System Prompts
│   ├── calendar/
│   │   └── index.ts            # Kalender-Zugriff
│   ├── backup/
│   │   └── index.ts            # S3 / WebDAV Backup
│   └── mistral.ts              # Mistral API Client
├── components/
│   ├── ui/                     # shadcn/ui Komponenten
│   ├── EntryForm.tsx
│   ├── EntryList.tsx
│   ├── AIChat.tsx
│   └── CalendarView.tsx
├── capacitor.config.ts
├── app.json
├── babel.config.js
├── drizzle.config.ts
├── eas.json
└── package.json
```

---

## Datenbank-Schema

### users
| Feld | Typ | Beschreibung |
|---|---|---|
| id | TEXT (UUID) | Primärschlüssel |
| email | TEXT | Unique |
| password_hash | TEXT | scrypt hash |
| created_at | INTEGER | Unix timestamp |

### sessions
| Feld | Typ | Beschreibung |
|---|---|---|
| id | TEXT (UUID) | Primärschlüssel |
| user_id | TEXT | FK → users |
| token | TEXT | JWT |
| expires_at | INTEGER | Unix timestamp |

### time_entries
| Feld | Typ | Beschreibung |
|---|---|---|
| id | TEXT (UUID) | Primärschlüssel |
| user_id | TEXT | FK → users |
| title | TEXT | Projekt/Task Name |
| category | TEXT | Kategorie |
| started_at | INTEGER | Unix timestamp |
| ended_at | INTEGER | Unix timestamp (null wenn aktiv) |
| notes | TEXT | Notizen |
| created_at | INTEGER | Unix timestamp |

### calendar_events
| Feld | Typ | Beschreibung |
|---|---|---|
| id | TEXT (UUID) | Primärschlüssel |
| user_id | TEXT | FK → users |
| external_id | TEXT | ID vom nativen Kalender |
| title | TEXT | Titel |
| start_date | INTEGER | Unix timestamp |
| end_date | INTEGER | Unix timestamp |
| source | TEXT | 'local' oder Kalender-ID |

### user_settings
| Feld | Typ | Beschreibung |
|---|---|---|
| user_id | TEXT | Primärschlüssel, FK → users |
| timezone | TEXT | z.B. 'Europe/Berlin' |
| backup_provider | TEXT | '', 's3', 'webdav' |
| backup_config | TEXT | JSON mit Zugangsdaten |

---

## Phasen

### PHASE 1: Expo Setup (Basis)

**Ziel:** Laufende App auf Gerät/Web mit Login-Screen

1. `npx create-expo-app@latest chronomind --template blank-typescript` in `/opt/data/`
2. `npx cap init` (App ID: com.chronomind.app)
3. `npx cap add ios` + `npx cap add android`
4. Routing: `npx expo install expo-router` (file-based)
5. UI: Login-Screen, Dashboard, Zeiteinträge-Liste (mock data)
6. Auth: JWT in AsyncStorage (kein Backend nötig)

**Qualitäts-Gate:**
```
npm run lint          → 0 Errors
npx tsc --noEmit     → 0 Errors
npm run build         → erfolgreich
npx expo export       → funktioniert
```

**Deploy:** Vercel Preview → URL an Marc

---

### PHASE 2: Lokale Datenbank

**Ziel:** SQLite-DB funktioniert, Auth + CRUD für Zeiteinträge

1. `npx expo install expo-sqlite`
2. Drizzle ORM: `npx expo install drizzle-orm`
3. Schema erstellen (users, sessions, time_entries, user_settings)
4. Auth: Login/Registrierung/Logout
5. CRUD für time_entries

**Qualitäts-Gate:**
```
npm run lint          → 0 Errors
npx tsc --noEmit     → 0 Errors
npm run build         → erfolgreich
```

**Deploy:** Vercel Preview → URL an Marc

---

### PHASE 3: Kalender-Integration

**Ziel:** Kalender lesen und schreiben

1. `npx expo install expo-calendar`
2. Permissions (iOS Info.plist, Android Manifest)
3. Kalender-Liste laden
4. Events lesen und anzeigen
5. Zeiteintrag → Kalender-Event erstellen

**Qualitäts-Gate:**
```
npm run lint          → 0 Errors
npx tsc --noEmit     → 0 Errors
npm run build         → erfolgreich
```

**Deploy:** Vercel Preview → URL an Marc

---

### PHASE 4: AI-Chat mit Mistral

**Ziel:** Chat-Interface mit KI, die Zeiteinträge erstellen kann

1. AI SDK: `npx expo install ai` (Vercel AI SDK)
2. Mistral Client: OpenAI-kompatibles API
3. Chat-UI (Nachrichten-Historie, Streaming)
4. AI Tools: create_time_entry, list_time_entries, update_time_entry

**Qualitäts-Gate:**
```
npm run lint          → 0 Errors
npx tsc --noEmit     → 0 Errors
npm run build         → erfolgreich
```

**Deploy:** Vercel Preview → URL an Marc

---

### PHASE 5: Kamera + OCR

**Ziel:** Kalenderblatt fotografieren, KI extrahiert Termine

1. `npx expo install expo-camera`
2. Foto aufnehmen / Galerie
3. Mistral OCR (oder Pixtral Vision)
4. Extrahierte Termine → Vorschläge
5. Nutzer bestätigt → Eintrag wird erstellt

**Qualitäts-Gate:**
```
npm run lint          → 0 Errors
npx tsc --noEmit     → 0 Errors
npm run build         → erfolgreich
```

**Deploy:** Vercel Preview → URL an Marc

---

### PHASE 6: Push-Benachrichtigungen

**Ziel:** Erinnerungen und Alarme

1. `npx expo install expo-notifications`
2. FCM für Android, APNS für iOS
3. Erinnerung für aktive Zeiteinträge
4. Tägliche Zusammenfassung

**Qualitäts-Gate:**
```
npm run lint          → 0 Errors
npx tsc --noEmit     → 0 Errors
npm run build         → erfolgreich
```

**Test:** APK auf Android installieren, Benachrichtigung erhalten

---

### PHASE 7: Social Features + Cloud-Sync

**Ziel:** Teilen und Backup

1. `@capacitor/share` für native Share-Dialoge
2. lib/backup/index.ts anpassen
3. S3 / WebDAV Konfiguration in Settings
4. Manueller Backup-Trigger

**Qualitäts-Gate:**
```
npm run lint          → 0 Errors
npx tsc --noEmit     → 0 Errors
npm run build         → erfolgreich
```

**Deploy:** Vercel Preview → URL an Marc

---

## API-Keys (nur Expo/Local)

| Service | Key |
|---|---|
| Mistral | `ME5YHYhXGcRYw2uMt0LdJQ` |

In `.env.local`:
```
EXPO_PUBLIC_MISTRAL_API_KEY=ME5YHYhXGcRYw2uMt0LdJQ
```

---

## Deploy-Ziele

| Umgebung | Ziel |
|---|---|
| Vercel Preview | Nach jeder Phase (Web) |
| GitHub | `git@github.com:Fidelis-ha/chronomind.git` |
| Branch | `fidelis/expo-migration` → PR auf `main` |

---

## Testing-Protokoll

1. **Lokaler Test:** `npm run build` + `npx expo start`
2. **Typecheck:** `npx tsc --noEmit`
3. **Lint:** `npm run lint`
4. **Web-Preview:** Vercel Preview deployen
5. **Link teilen:** Erst wenn alle Gates grün

**Marc wird NUR informiert wenn alle Tests bestanden sind.** Er muss nicht vor jedem nächsten Schritt freigeben — ich arbeite selbstständig weiter.

---

## Bestehende Ressourcen

- **Alter Code:** `/opt/data/chronomind/` (Next.js, nicht mehr verwenden für neue Features)
- **Backup-Logik:** `/opt/data/chronomind/lib/backup/index.ts`
- **DB-Schema:** `/opt/data/chronomind/lib/db/schema.ts`
- **AI-Tools:** `/opt/data/chronomind/lib/ai/index.tsx`

---

## Context7 nutzen

Für alle Framework-spezifischen Fragen: Context7 MCP Server nutzen.

Beispiele:
- "Nutze Context7: expo-sqlite CRUD operations"
- "Nutze Context7: expo-calendar permission handling"
- "Nutze Context7: capacitor push notifications setup"
