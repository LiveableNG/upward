import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Public paths
  const isPublicPath = pathname === '/login' || pathname === '/signup'
  
  // Check for tokens in cookies
  const accessToken = request.cookies.get('pm_access_token')?.value
  const refreshToken = request.cookies.get('pm_refresh')?.value
  
  const isLoggedIn = !!accessToken || !!refreshToken

  // Redirect logic
  if (isPublicPath && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!isPublicPath && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
