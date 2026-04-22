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
  const tokenCookie = request.cookies.get('access_token')
  const hasToken = !!tokenCookie
  const tokenValue = tokenCookie?.value

  const isAuthPage = pathname.startsWith('/login') || 
                     pathname.startsWith('/signup') || 
                     pathname.startsWith('/invite') || 
                     pathname.startsWith('/forgot-password') ||
                     pathname.startsWith('/reset-password')

  if (isAuthPage && hasToken) {
    if (tokenValue && !isTokenExpired(tokenValue)) {
      const searchParams = request.nextUrl.searchParams
      const redirectPath = searchParams.get('redirect') || '/dashboard'
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }
  }
  const isProtectedPage = pathname.startsWith('/dashboard') || 
                          pathname.startsWith('/settings') ||
                          pathname.startsWith('/kyc') ||
                          pathname.startsWith('/transactions')

  if (isProtectedPage && !hasToken) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/profile/:path*',
    '/settings/:path*',
    '/kyc/:path*',
    '/transactions/:path*',
    '/login',
    '/signup',
    '/invite/:path*',
    '/forgot-password',
    '/reset-password'
  ],
}