import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isTokenExpired(token: string): boolean {
  try {
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return true
    
    // Add padding if necessary for atob
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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://upward-dev.vercel.app'

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const tokenCookie = request.cookies.get('pay_access_token')
  const hasToken = !!tokenCookie
  const tokenValue = tokenCookie?.value
  const isExpired = tokenValue ? isTokenExpired(tokenValue) : true

  // 1. Auth Redirection Logic (Redirect to dashboard if logged in)
  const isAuthPage = pathname === '/' || pathname === '/login' || pathname === '/signup'
  
  if (isAuthPage && hasToken && !isExpired) {
    const redirectParam = request.nextUrl.searchParams.get('redirect')
    // Only redirect if not already at /dashboard (prevents loops)
    if (redirectParam !== '/dashboard') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // 2. Protected Routes Logic
  const isProtectedRoute = pathname.startsWith('/dashboard') || 
                           pathname.startsWith('/api/v1')

  if (isProtectedRoute && ( !hasToken || isExpired ) && !pathname.startsWith('/api/v1')) {
    // If we are at a protected route but not authenticated, go to login
    const url = new URL('/login', request.url)
    if (pathname !== '/dashboard') {
      url.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(url)
  }

  // 3. Asset Proxy Logic (for upward-pay assets)
  if (pathname.startsWith('/_upward_pay')) {
    const assetPath = pathname.replace('/_upward_pay', '')
    const url = new URL(assetPath + search, APP_URL)
    return NextResponse.rewrite(url)
  }

  // 4. Proxy/Rewrite Logic for App Routes
  const shouldProxy = isProtectedRoute || 
                      pathname.startsWith('/welcome') || 
                      pathname.startsWith('/pay') ||
                      pathname.startsWith('/profile') ||
                      pathname.startsWith('/invite') ||
                      pathname.startsWith('/fill-record') ||
                      pathname.startsWith('/complete-profile') ||
                      pathname.startsWith('/login') ||
                      pathname.startsWith('/signup') ||
                      pathname.startsWith('/forgot-password') ||
                      pathname.startsWith('/reset-password') ||
                      pathname.startsWith('/settings') ||
                      pathname.startsWith('/kyc') ||
                      pathname.startsWith('/transactions') ||
                      pathname.startsWith('/.well-known')

  if (shouldProxy) {
    const url = new URL(pathname + search, APP_URL)
    
    // Create custom headers for the proxy
    const requestHeaders = new Headers(request.headers)
    
    // IMPORTANT: Remove Host header to prevent destination server from redirecting to its canonical domain
    requestHeaders.delete('host')
    
    requestHeaders.set('x-forwarded-host', request.headers.get('host') || '')
    requestHeaders.set('x-proxy-source', 'upward-web-gateway')
    requestHeaders.set('x-forwarded-proto', 'https')

    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/_upward_pay/:path*',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/dashboard/:path*',
    '/profile/:path*',
    '/pay/:path*',
    '/api/v1/:path*',
    '/welcome/:path*',
    '/invite/:path*',
    '/fill-record/:path*',
    '/complete-profile/:path*',
    '/settings/:path*',
    '/kyc/:path*',
    '/transactions/:path*',
    '/.well-known/:path*'
  ],
}

