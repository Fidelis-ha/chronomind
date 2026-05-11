import 'server-only'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'chronomind-session'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'chronomind-local-secret-change-in-production'
)

export interface SessionUser {
  id: string
  email: string
  name?: string
  // Supabase-compatible fields (for components that expect them)
  user_metadata?: { name?: string; avatar_url?: string }
  app_metadata?: Record<string, unknown>
  aud?: string
  created_at?: string
}

export interface Session {
  user: SessionUser
}

async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string | undefined,
      user_metadata: { name: payload.name as string | undefined }
    } as SessionUser
  } catch {
    return null
  }
}

export const auth = async ({
  cookieStore
}: {
  cookieStore: ReturnType<typeof cookies>
}) => {
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  const user = await verifyToken(token)
  if (!user) return null

  return { user } as Session
}