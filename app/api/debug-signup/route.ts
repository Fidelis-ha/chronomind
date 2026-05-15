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

    // Debug: try a simple insert
    console.log('Inserting user with id:', id, 'email:', email)
    
    try {
      await db.insert(users).values({
        id,
        email,
        passwordHash,
        createdAt: Math.floor(Date.now() / 1000)
      })
      console.log('Insert successful')
      return NextResponse.json({ success: true, userId: id })
    } catch (insertError: any) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ 
        error: 'Insert failed',
        details: insertError.message,
        code: insertError.code
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Sign up error:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Registrierung', details: error.message },
      { status: 500 }
    )
  }
}