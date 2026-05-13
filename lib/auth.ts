import 'server-only'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'chronomind-session'
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'chronomind-local-secret-change-in-production'
)

export interface JwtUser {
  id: string
  email: string
  name?: string
}

export interface Session {
  user: JwtUser
}

export async function auth({
  cookieStore
}: {
  cookieStore: ReturnType<typeof cookies>
}): Promise<Session | null> {
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (!payload.sub) return null
    return {
      user: {
        id: payload.sub as string,
        email: payload.email as string,
        name: payload.name as string | undefined
      }
    }
  } catch {
    return null
  }
}
