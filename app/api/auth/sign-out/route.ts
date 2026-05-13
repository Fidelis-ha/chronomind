import 'server-only'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'chronomind-session'

export async function POST() {
  const cookieStore = cookies()
  cookieStore.delete(COOKIE_NAME)
  return NextResponse.json({ success: true })
}
