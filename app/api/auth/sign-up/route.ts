import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'chronomind-session'
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'chronomind-local-secret-change-in-production'
)

// Shared in-memory user store (resets on cold start — demo only)
declare global {
  // eslint-disable-next-line novar
  var __USERS__: Record<string, { password: string; id: string; name: string }> | undefined
}

function getUsers() {
  if (!global.__USERS__) {
    global.__USERS__ = {
      'demo@chronomind.app': {
        password: 'demo123',
        id: 'user-demo-001',
        name: 'Demo User'
      }
    }
  }
  return global.__USERS__
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const users = getUsers()
    if (users[email]) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    const userId = `user-${Date.now()}`
    users[email] = {
      password,
      id: userId,
      name: name || email.split('@')[0]
    }

    // Create JWT token
    const token = await new SignJWT({
      sub: userId,
      email,
      name: users[email].name
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    // Set cookie
    const cookieStore = cookies()
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    })

    return NextResponse.json({
      success: true,
      user: { id: userId, email, name: users[email].name }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
