import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { sessions, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'chronomind-local-secret-change-in-production'
)

const COOKIE_NAME = 'chronomind-session'
const SESSION_DURATION = 60 * 60 * 24 * 30

export interface SessionUser {
  id: string
  email: string
}

// Fallback decode using atob (Edge-compatible) - used when DB is unavailable
function decodeJwtFallback(token: string): { sessionId: string; userId: string; email: string; exp: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    if (pad) base64 += '='.repeat(4 - pad)
    // Use atob for Edge Runtime compatibility; falls back to Buffer for Node.js
    const decoded = typeof globalThis.atob === 'function'
      ? globalThis.atob(base64)
      : Buffer.from(base64, 'base64').toString('utf-8')
    const payload = JSON.parse(decoded)
    if (!payload.sessionId || !payload.userId) return null
    return {
      sessionId: payload.sessionId as string,
      userId: payload.userId as string,
      email: (payload.email || '') as string,
      exp: payload.exp as number
    }
  } catch {
    return null
  }
}

export async function createSession(userId: string, email?: string): Promise<string> {
  const sessionId = crypto.randomUUID()
  const expiresAt = Math.floor((Date.now() + SESSION_DURATION * 1000) / 1000)

  // Try to store session in DB (fails gracefully on Vercel cold start)
  try {
    await db.insert(sessions).values({
      id: sessionId,
      userId,
      expiresAt
    })
  } catch (dbError) {
    // On Vercel, DB might not have this session yet (cold start = fresh DB).
    // Continue anyway - we still return a valid JWT with embedded user info.
    console.warn('DB session insert failed (may be Vercel cold start):', dbError)
  }

  // Embed userId and email in JWT so auth works WITHOUT DB lookup
  // This is critical for Vercel where each request might hit a different instance
  const token = await new SignJWT({ sessionId, userId, email: email || '' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET)

  return token
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) return null

  // First: try standard JWT verify + DB lookup
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const sessionId = payload.sessionId as string

    // Try DB lookup - this fails on Vercel cold start (fresh /tmp DB)
    try {
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)

      if (!session || session.expiresAt * 1000 < Date.now()) {
        if (session) {
          await db.delete(sessions).where(eq(sessions.id, sessionId))
        }
        // Fall through to fallback decode
      } else {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, session.userId))
          .limit(1)

        if (user) return { id: user.id, email: user.email }
      }
    } catch (dbError) {
      // DB unavailable (Vercel cold start) - fall through to fallback
      console.warn('DB lookup failed, using JWT fallback:', dbError)
    }

    // Fallback: extract userId/email directly from JWT (Edge-compatible atob decode)
    // This works even when DB is fresh/empty on Vercel
    const decoded = decodeJwtFallback(token)
    if (decoded && decoded.userId) {
      return {
        id: decoded.userId,
        email: decoded.email || ''
      }
    }

    return null
  } catch {
    return null
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      const sessionId = payload.sessionId as string
      await db.delete(sessions).where(eq(sessions.id, sessionId))
    } catch {}
  }

  cookieStore.delete(COOKIE_NAME)
}

export async function setSessionCookie(token: string) {
  const cookieStore = cookies()
  await cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/'
  })
}

export async function debugSession(): Promise<any> {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  
  if (!token) return { hasCookie: false }
  
  // Decode without verification to inspect
  const parts = token.split('.')
  let payload: any = null
  let decodeError: string | null = null
  
  if (parts.length === 3) {
    try {
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      const pad = base64.length % 4
      if (pad) base64 += '='.repeat(4 - pad)
      const decoded = Buffer.from(base64, 'base64').toString('utf-8')
      payload = JSON.parse(decoded)
    } catch (e: any) {
      decodeError = e.message
    }
  }
  
  return {
    hasCookie: true,
    tokenLength: token.length,
    payload,
    decodeError
  }
}

export { COOKIE_NAME }