// Web fallback: uses localStorage for auth sessions
// For the Vercel web preview, native SQLite is not available.

const STORAGE_KEY = 'chronomind_db'

export interface DbUser {
  id: string
  email: string
  passwordHash: string
  createdAt: Date
}

export interface DbSession {
  id: string
  userId: string
  token: string
  expiresAt: Date
}

export interface DbTimeEntry {
  id: string
  userId: string
  title: string
  description: string | null
  category: string | null
  startedAt: string
  endedAt: string | null
  durationSeconds: number | null
  source: string
  createdAt: Date
}

interface DbStore {
  users: DbUser[]
  sessions: DbSession[]
  timeEntries: DbTimeEntry[]
  settings: Record<string, any>[]
}

function load(): DbStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { users: [], sessions: [], timeEntries: [], settings: [] }
  } catch {
    return { users: [], sessions: [], timeEntries: [], settings: [] }
  }
}

function save(store: DbStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Auth
export function webGetUserByEmail(email: string): DbUser | null {
  const db = load()
  return db.users.find(u => u.email === email) || null
}

export function webGetUserById(id: string): DbUser | null {
  const db = load()
  return db.users.find(u => u.id === id) || null
}

export function webCreateUser(email: string, passwordHash: string): string {
  const db = load()
  const id = genId()
  db.users.push({ id, email, passwordHash, createdAt: new Date() })
  save(db)
  return id
}

export function webCreateSession(userId: string, token: string, expiresAt: Date): string {
  const db = load()
  const id = genId()
  db.sessions.push({ id, userId, token, expiresAt })
  save(db)
  return id
}

export function webGetSessionByToken(token: string): DbSession | null {
  const db = load()
  return db.sessions.find(s => s.token === token) || null
}

export function webDeleteSession(token: string): void {
  const db = load()
  db.sessions = db.sessions.filter(s => s.token !== token)
  save(db)
}

// Time Entries
export function webGetTimeEntriesByUser(userId: string): DbTimeEntry[] {
  const db = load()
  return db.timeEntries.filter(e => e.userId === userId)
}

export function webCreateTimeEntry(data: {
  userId: string; title: string; description?: string; category?: string
  startedAt: string; endedAt?: string; durationSeconds?: number; source?: string
}): string {
  const db = load()
  const id = genId()
  db.timeEntries.push({
    id,
    userId: data.userId,
    title: data.title,
    description: data.description || null,
    category: data.category || null,
    startedAt: data.startedAt,
    endedAt: data.endedAt || null,
    durationSeconds: data.durationSeconds || null,
    source: data.source || 'manual',
    createdAt: new Date()
  })
  save(db)
  return id
}

export function webDeleteTimeEntry(id: string): void {
  const db = load()
  db.timeEntries = db.timeEntries.filter(e => e.id !== id)
  save(db)
}

export function webUpdateTimeEntry(id: string, data: Partial<DbTimeEntry>): void {
  const db = load()
  const idx = db.timeEntries.findIndex(e => e.id === id)
  if (idx >= 0) {
    db.timeEntries[idx] = { ...db.timeEntries[idx], ...data }
    save(db)
  }
}

export function webGetUserSettings(userId: string): Record<string, any> | null {
  const db = load()
  return db.settings.find(s => (s as any).userId === userId) || null
}

export function webUpsertUserSettings(userId: string, data: Record<string, any>): void {
  const db = load()
  const idx = db.settings.findIndex(s => (s as any).userId === userId)
  const record = { userId, ...data }
  if (idx >= 0) {
    db.settings[idx] = record
  } else {
    db.settings.push(record)
  }
  save(db)
}
