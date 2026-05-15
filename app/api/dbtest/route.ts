import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

export async function GET() {
  try {
    const id = crypto.randomUUID()
    const email = `debug-${Date.now()}@example.com`
    const passwordHash = 'test:test'
    
    await db.insert(users).values({
      id,
      email,
      passwordHash,
      createdAt: Math.floor(Date.now() / 1000)
    })
    
    return NextResponse.json({ success: true, id, email })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}
