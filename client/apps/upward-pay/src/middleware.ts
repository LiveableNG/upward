import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isTokenExpired(token: string): boolean {
  try {
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return true
    
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64
    
    const payload = JSON.parse(atob(padded))
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
  const isExpired = tokenValue ? isTokenExpired(tokenValue) : true

  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
  const baseUrl = `${protocol}://${host}`

  const isAuthPage = pathname.startsWith('/login') || 
                     pathname.startsWith('/signup') || 
                     pathname.startsWith('/invite') || 
                     pathname.startsWith('/forgot-password') ||
                     pathname.startsWith('/reset-password')

  if (isAuthPage && hasToken && !isExpired) {
    const searchParams = request.nextUrl.searchParams
    const redirectPath = searchParams.get('redirect') || '/dashboard'
    return NextResponse.redirect(new URL(redirectPath, baseUrl))
  }

  const isProtectedPage = pathname.startsWith('/dashboard') || 
                          pathname.startsWith('/settings') ||
                          pathname.startsWith('/kyc') ||
                          pathname.startsWith('/transactions')

  if (isProtectedPage && ( !hasToken || isExpired )) {
    const url = new URL('/login', baseUrl)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*', 
    '/profile',
    '/profile/:path*',
    '/settings',
    '/settings/:path*',
    '/kyc',
    '/kyc/:path*',
    '/transactions',
    '/transactions/:path*',
    '/login',
    '/signup',
    '/invite',
    '/invite/:path*',
    '/fill-record',
    '/fill-record/:path*',
    '/forgot-password',
    '/reset-password'
  ],
}
