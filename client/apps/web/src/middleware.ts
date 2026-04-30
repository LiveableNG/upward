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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://upward-pay.vercel.app'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const tokenCookie = request.cookies.get('pay_access_token')
  const hasToken = !!tokenCookie
  const tokenValue = tokenCookie?.value

  if ((pathname === '/' || pathname === '/login' || pathname === '/signup') && hasToken) {
    if (tokenValue && !isTokenExpired(tokenValue)) {
      const redirectParam = request.nextUrl.searchParams.get('redirect')
      if (redirectParam !== '/dashboard') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  const isProtectedRoute = pathname.startsWith('/dashboard') || 
                           pathname.startsWith('/profile') ||
                           pathname.startsWith('/pay') ||
                           pathname.startsWith('/api/v1')

  if (isProtectedRoute && !hasToken && !pathname.startsWith('/api/v1')) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (isProtectedRoute || 
      pathname.startsWith('/welcome') || 
      pathname.startsWith('/invite') ||
      pathname.startsWith('/.well-known')) {
    const url = new URL(pathname + request.nextUrl.search, APP_URL)
    return NextResponse.rewrite(url, {
      request: {
        headers: new Headers(request.headers),
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/signup',
    '/dashboard/:path*',
    '/profile/:path*',
    '/pay/:path*',
    '/api/v1/:path*',
    '/welcome/:path*',
    '/invite/:path*',
    '/.well-known/:path*'
  ],
}
