import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

export async function GET() {
  try {
    const result = await db.select().from(users).limit(1)
    return NextResponse.json({ success: true, count: result.length })
  } catch (error: any) {
    console.error('Test error:', error)
    return NextResponse.json({ 
      error: error?.message || 'Unknown error',
      code: error?.code,
      stack: error?.stack?.split('\n').slice(0,5)
    })
  }
}
