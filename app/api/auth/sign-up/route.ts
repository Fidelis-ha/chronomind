import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '@/lib/auth/password'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-Mail und Passwort erforderlich' },
        { status: 400 }
      )
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { error: 'Benutzer existiert bereits' },
        { status: 400 }
      )
    }

    const id = crypto.randomUUID()
    const passwordHash = await hashPassword(password)
    console.log('Password hashed, length:', passwordHash.length)

    await db.insert(users).values({
      id,
      email,
      passwordHash,
      createdAt: Math.floor(Date.now() / 1000)
    })

    return NextResponse.json({ success: true, userId: id })
  } catch (error) {
    console.error('Sign up error:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Registrierung' },
      { status: 500 }
    )
  }
}
