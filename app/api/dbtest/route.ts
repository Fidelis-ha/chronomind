import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

export async function GET() {
  try {
    const allUsers = await db.select().from(users).limit(10)
    const testId = 'test-' + Date.now()
    try {
      await db.insert(users).values({
        id: testId,
        email: testId + '@test.com',
        passwordHash: 'testhash',
        createdAt: Math.floor(Date.now() / 1000)
      })
      return NextResponse.json({ success: true, count: allUsers.length, inserted: testId })
    } catch (insertErr: any) {
      return NextResponse.json({ success: false, count: allUsers.length, insertError: insertErr?.message, insertCode: insertErr?.code })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message, code: err?.code })
  }
}
