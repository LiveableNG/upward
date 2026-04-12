import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasToken = request.cookies.has('access_token')

  // 1. PUBLIC ROUTES - ALWAYS ALLOW
  // (e.g. static assets, images, etc. handled by matcher)

  // 2. AUTH-ONLY ROUTES (Must NOT be logged in)
  const isAuthPage = pathname.startsWith('/login') || 
                     pathname.startsWith('/signup') || 
                     pathname.startsWith('/invite') || 
                     pathname.startsWith('/forgot-password') ||
                     pathname.startsWith('/reset-password')

  if (isAuthPage && hasToken) {
    // If user is already logged in, don't let them see login/signup/invite pages
    // Redirect them straight to the dashboard to avoid flickering
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 3. PROTECTED ROUTES (Must BE logged in)
  const isProtectedPage = pathname.startsWith('/dashboard') || 
                          pathname.startsWith('/profile') || 
                          pathname.startsWith('/settings') ||
                          pathname.startsWith('/kyc') ||
                          pathname.startsWith('/transactions')

  if (isProtectedPage && !hasToken) {
    // Force them to login if they try to access protected content
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // 4. HYBRID ROUTES (e.g. /pay/[token])
  // These are allowed for both guests and authenticated users.
  // No redirect logic needed here for now.

  return NextResponse.next()
}

// Optimization: Ensure matcher covers all relevant paths
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