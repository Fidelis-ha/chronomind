import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'chronomind-session'

// Simplest possible token check: just look for the JWT structure
// token = xxx.xxx.xxx where middle part has "sessionId"
function isValidToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  // Part 2 (payload) should contain "sessionId" after base64url decode
  try {
    // base64url -> base64 -> decode
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    if (pad) base64 += '='.repeat(4 - pad)
    // Decode
    let decoded
    if (typeof globalThis.atob === 'function') {
      decoded = atob(base64)
    } else {
      decoded = Buffer.from(base64, 'base64').toString('utf-8')
    }
    // Must have sessionId
    return decoded.includes('"sessionId"')
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const token = req.cookies.get(COOKIE_NAME)?.value
  const isValid = token ? isValidToken(token) : false

  if (
    !isValid &&
    !req.url.includes('/sign-in') &&
    !req.url.includes('/sign-up')
  ) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/sign-in'
    redirectUrl.searchParams.set(`redirectedFrom`, req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    '/((?!share|api|_next/static|_next/image|favicon.ico).*)'
  ]
}
