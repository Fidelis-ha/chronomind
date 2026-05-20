// lib/db/index.ts
// Platform-aware database entry point.
// Web: localStorage via ./web (static import, no native deps)
// Native: expo-sqlite + drizzle via ./queries (dynamic import, never bundled for web)

import * as webDb from './web'
export type { DbUser, DbSession, DbTimeEntry } from './web'

export function isNativePlatform(): boolean {
  if (typeof navigator === 'undefined') return true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((navigator as any).product === 'ReactNative') return true
  return false
}

// ─── Auth ────────────────────────────────────────────────────────────────

export async function createUser(email: string, passwordHash: string): Promise<string> {
  if (!isNativePlatform()) return webDb.webCreateUser(email, passwordHash)
  const { createUser: fn } = await import('./queries')
  return fn(email, passwordHash)
}

export async function getUserByEmail(email: string) {
  if (!isNativePlatform()) return webDb.webGetUserByEmail(email)
  const { getUserByEmail: fn } = await import('./queries')
  return fn(email)
}

export async function getUserById(id: string) {
  if (!isNativePlatform()) return webDb.webGetUserById(id)
  const { getUserById: fn } = await import('./queries')
  return fn(id)
}

export async function createSession(userId: string, token: string, expiresAt: Date) {
  if (!isNativePlatform()) return webDb.webCreateSession(userId, token, expiresAt)
  const { createSession: fn } = await import('./queries')
  return fn(userId, token, expiresAt)
}

export async function getSessionByToken(token: string) {
  if (!isNativePlatform()) return webDb.webGetSessionByToken(token)
  const { getSessionByToken: fn } = await import('./queries')
  return fn(token)
}

export async function deleteSession(token: string) {
  if (!isNativePlatform()) return webDb.webDeleteSession(token)
  const { deleteSession: fn } = await import('./queries')
  return fn(token)
}

// ─── Time Entries ─────────────────────────────────────────────────────────

export async function createTimeEntry(data: {
  userId: string; title: string; description?: string; category?: string
  startedAt: string; endedAt?: string; durationSeconds?: number; source?: string
}): Promise<string> {
  if (!isNativePlatform()) return webDb.webCreateTimeEntry(data)
  const { createTimeEntry: fn } = await import('./queries')
  return fn(data)
}

export async function getTimeEntriesByUser(userId: string) {
  if (!isNativePlatform()) return webDb.webGetTimeEntriesByUser(userId)
  const { getTimeEntriesByUser: fn } = await import('./queries')
  return fn(userId)
}

export async function updateTimeEntry(id: string, data: {
  title?: string; description?: string | null; category?: string | null
  startedAt?: string; endedAt?: string | null; durationSeconds?: number | null
}) {
  if (!isNativePlatform()) return webDb.webUpdateTimeEntry(id, data as any)
  const { updateTimeEntry: fn } = await import('./queries')
  return fn(id, data as any)
}

export async function deleteTimeEntry(id: string) {
  if (!isNativePlatform()) return webDb.webDeleteTimeEntry(id)
  const { deleteTimeEntry: fn } = await import('./queries')
  return fn(id)
}

// ─── Settings ─────────────────────────────────────────────────────────────

export async function getUserSettings(userId: string) {
  if (!isNativePlatform()) return webDb.webGetUserSettings(userId)
  const { getUserSettings: fn } = await import('./queries')
  return fn(userId)
}

export async function upsertUserSettings(userId: string, data: {
  timezone?: string; backupProvider?: string; backupConfig?: string
  aiProvider?: string; aiApiKey?: string
}) {
  if (!isNativePlatform()) return webDb.webUpsertUserSettings(userId, data)
  const { upsertUserSettings: fn } = await import('./queries')
  return fn(userId, data)
}