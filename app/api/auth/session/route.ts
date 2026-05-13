import 'server-only'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'

export async function GET() {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })

  if (!session?.user) {
    return NextResponse.json({ user: null })
  }

  return NextResponse.json({ user: session.user })
}
