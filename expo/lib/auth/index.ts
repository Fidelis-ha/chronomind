// lib/auth/index.ts
// Platform-aware auth. Uses web localStorage for web, SQLite for native.

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as webDb from '../db/web'

const SESSION_KEY = 'session_token'
const USER_KEY = 'session_user'

function simpleHash(password: string): string {
  let hash = 0
  const salt = 'chronomind-salt-2024'
  const str = salt + password
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + ch
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

function genToken(userId: string): string {
  const str = `${userId}:${Date.now()}:${Math.random()}`
  // btoa for browser/RN-web; fallback base64 encoding for safety
  if (typeof btoa !== 'undefined') {
    try {
      return btoa(str)
    } catch {
      // fallback for unicode
      return btoa(unescape(encodeURIComponent(str)))
    }
  }
  // Node/react-native fallback - simple base64
  return str.split('').map(c => c.charCodeAt(0).toString(16).padStart(2,'0')).join('')
}

export async function signIn(email: string, password: string): Promise<string> {
  const hash = simpleHash(password)
  // webDb functions are sync on web - wrap in Promise for consistency
  const user = await Promise.resolve(webDb.webGetUserByEmail(email))
  if (!user) throw new Error('Invalid credentials')
  const userAny = user as any
  if (userAny.passwordHash !== hash) throw new Error('Invalid credentials')

  const token = genToken(userAny.id)
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000

  await Promise.resolve(webDb.webCreateSession(userAny.id, token, new Date(expiresAt)))
  await Promise.resolve(webDb.webUpsertUserSettings(userAny.id, {}))

  // Store session using AsyncStorage keys matching app layout expectations
  await AsyncStorage.setItem(SESSION_KEY, token)
  await AsyncStorage.setItem(USER_KEY, JSON.stringify({ id: userAny.id, email: userAny.email }))

  return token
}

export async function signUp(email: string, password: string): Promise<void> {
  const existing = await Promise.resolve(webDb.webGetUserByEmail(email))
  if (existing) throw new Error('Email already in use')

  const hash = simpleHash(password)
  const userId = await Promise.resolve(webDb.webCreateUser(email, hash))

  const token = genToken(userId)
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000

  await Promise.resolve(webDb.webCreateSession(userId, token, new Date(expiresAt)))
  await Promise.resolve(webDb.webUpsertUserSettings(userId, {}))

  await AsyncStorage.setItem(SESSION_KEY, token)
  await AsyncStorage.setItem(USER_KEY, JSON.stringify({ id: userId, email }))
}

export async function getSession(token: string) {
  if (!token) return null
  return await Promise.resolve(webDb.webGetSessionByToken(token))
}

export async function signOut(token: string): Promise<void> {
  if (!token) return
  await Promise.resolve(webDb.webDeleteSession(token))
  await AsyncStorage.removeItem(SESSION_KEY)
  await AsyncStorage.removeItem(USER_KEY)
}

export async function getCurrentUser(token: string) {
  const session = await Promise.resolve(webDb.webGetSessionByToken(token))
  if (!session) return null
  const sessionAny = session as any
  if (new Date(sessionAny.expiresAt) < new Date()) {
    await Promise.resolve(webDb.webDeleteSession(token))
    await AsyncStorage.removeItem(SESSION_KEY)
    return null
  }
  return await Promise.resolve(webDb.webGetUserById(sessionAny.userId))
}

export async function getStoredSession(): Promise<{ token: string; userId: string } | null> {
  try {
    const token = await AsyncStorage.getItem(SESSION_KEY)
    if (!token) return null
    const userRaw = await AsyncStorage.getItem(USER_KEY)
    const user = userRaw ? JSON.parse(userRaw) : null
    return { token, userId: user?.id ?? '' }
  } catch {
    return null
  }
}

export async function storeSession(token: string, userId: string): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, token)
  await AsyncStorage.setItem(USER_KEY, JSON.stringify({ id: userId }))
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY)
  await AsyncStorage.removeItem(USER_KEY)
}