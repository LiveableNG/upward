import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isTokenExpired(token: string): boolean {
  try {
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return true
    
    const payload = JSON.parse(atob(payloadBase64))
    const now = Math.floor(Date.now() / 1000)
    
    return payload.exp < now
  } catch {
    return true
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const tokenCookie = request.cookies.get('pay_access_token')
  const hasToken = !!tokenCookie
  const tokenValue = tokenCookie?.value

  if (pathname === '/' && hasToken) {
    if (tokenValue && !isTokenExpired(tokenValue)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // 2. Handle redirects for Auth pages at the gateway level
  const isAuthPage = pathname.startsWith('/login') || 
                     pathname.startsWith('/signup')

  if (isAuthPage && hasToken) {
    if (tokenValue && !isTokenExpired(tokenValue)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/signup'
  ],
}
