import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'chronomind-session'

// Manually decode JWT payload for Edge Runtime compatibility
// decodeJwt from jose has issues in Edge Runtime with certain token formats
function base64UrlDecode(str: string): string {
  // Replace URL-safe chars and add padding
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  if (pad) base64 += '='.repeat(4 - pad)
  // Decode using atob in browser or Buffer in Node
  if (typeof globalThis.atob === 'function') {
    return atob(base64)
  }
  return Buffer.from(base64, 'base64').toString('utf-8')
}

function isValidToken(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payloadStr = base64UrlDecode(parts[1])
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
