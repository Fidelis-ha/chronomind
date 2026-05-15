import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { verifyPassword, hashPassword } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/session'
import { COOKIE_NAME } from '@/lib/auth/session'

const DEMO_EMAIL = 'demo@chronomind.app'
const DEMO_PASSWORD = 'demo123'

export async function POST(req: Request) {
  try {
    // Try to find existing demo user
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, DEMO_EMAIL))
      .limit(1)

    let userId: string

    if (!existingUser) {
      // Create demo user if it doesn't exist
      userId = crypto.randomUUID()
      const passwordHash = await hashPassword(DEMO_PASSWORD)
      
      await db.insert(users).values({
        id: userId,
        email: DEMO_EMAIL,
        passwordHash,
        createdAt: Math.floor(Date.now() / 1000)
      })
    } else {
      userId = existingUser.id
      
      // Verify demo password (in case it was changed)
      const valid = await verifyPassword(DEMO_PASSWORD, existingUser.passwordHash)
      if (!valid) {
        // Re-hash with correct password if needed
        const passwordHash = await hashPassword(DEMO_PASSWORD)
        // Note: Would need an update query here - for now just verify
      }
    }

    // Create session
    const token = await createSession(userId)

    const response = NextResponse.json({
      success: true,
      user: { id: userId, email: DEMO_EMAIL },
      message: 'Demo login successful'
    })

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Demo login error:', error)
    return NextResponse.json(
      { error: 'Demo-Login fehlgeschlagen' },
      { status: 500 }
    )
  }
}