// lib/db/queries.ts — Native SQLite + Drizzle queries
// Only imported dynamically on native; not bundled for web

import { eq } from 'drizzle-orm'
import { openDatabaseSync } from 'expo-sqlite'
import { drizzle } from 'drizzle-orm/expo-sqlite'
import { users, sessions, timeEntries, userSettings } from './schema'

// Lazy DB init — only called when actually needed on native
let _db: ReturnType<typeof drizzle> | null = null
function getDb() {
  if (!_db) _db = drizzle(openDatabaseSync('chronomind.db'))
  return _db
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function createUser(email: string, passwordHash: string) {
  const id = genId()
  await getDb().insert(users).values({ id, email, passwordHash, createdAt: new Date() })
  return id
}

export async function getUserByEmail(email: string) {
  const r = await getDb().select().from(users).where(eq(users.email, email)).limit(1)
  return r[0] ?? null
}

export async function getUserById(id: string) {
  const r = await getDb().select().from(users).where(eq(users.id, id)).limit(1)
  return r[0] ?? null
}

export async function createSession(userId: string, token: string, expiresAt: Date) {
  const id = genId()
  await getDb().insert(sessions).values({ id, userId, token, expiresAt })
  return id
}

export async function getSessionByToken(token: string) {
  const r = await getDb().select().from(sessions).where(eq(sessions.token, token)).limit(1)
  return r[0] ?? null
}

export async function deleteSession(token: string) {
  await getDb().delete(sessions).where(eq(sessions.token, token))
}

export async function createTimeEntry(data: {
  userId: string; title: string; description?: string; category?: string
  startedAt: string; endedAt?: string; durationSeconds?: number; source?: string
}) {
  const id = genId()
  await getDb().insert(timeEntries).values({
    id, userId: data.userId, title: data.title,
    description: data.description ?? null, category: data.category ?? null,
    startedAt: data.startedAt, endedAt: data.endedAt ?? null,
    durationSeconds: data.durationSeconds ?? null, source: data.source ?? 'manual',
    createdAt: new Date()
  })
  return id
}

export async function getTimeEntriesByUser(userId: string) {
  return getDb().select().from(timeEntries).where(eq(timeEntries.userId, userId))
}

export async function updateTimeEntry(id: string, data: {
  title?: string; description?: string | null; category?: string | null
  startedAt?: string; endedAt?: string | null; durationSeconds?: number | null
}) {
  await getDb().update(timeEntries).set(data).where(eq(timeEntries.id, id))
}

export async function deleteTimeEntry(id: string) {
  await getDb().delete(timeEntries).where(eq(timeEntries.id, id))
}

export async function getUserSettings(userId: string) {
  const r = await getDb().select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1)
  return r[0] ?? null
}

export async function upsertUserSettings(userId: string, data: {
  timezone?: string; backupProvider?: string; backupConfig?: string
  aiProvider?: string; aiApiKey?: string
}) {
  const existing = await getUserSettings(userId)
  if (existing) {
    await getDb().update(userSettings).set(data).where(eq(userSettings.userId, userId))
  } else {
    await getDb().insert(userSettings).values({ userId, ...data })
  }
}