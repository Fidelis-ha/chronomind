import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'chronomind-session'

// Manually decode JWT payload for Edge Runtime compatibility
// decodeJwt from jose can have issues in Edge Runtime with certain token formats
function isValidToken(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payloadStr = Buffer.from(parts[1], 'base64url').toString('utf-8')
    const payload = JSON.parse(payloadStr)
    if (!payload || !payload.sessionId) return false
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false
    return true
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
