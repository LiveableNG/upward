import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Public paths
  const isPublicPath = pathname === '/login' || pathname === '/signup'
  const isPublicRequestPath = pathname.startsWith('/public/requests/')
  
  // Check for tokens in cookies
  const accessToken = request.cookies.get('pm_access_token')?.value
  const refreshToken = request.cookies.get('pm_refresh')?.value
  
  const isLoggedIn = !!accessToken || !!refreshToken

  // Redirect logic
  if (isPublicPath && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isPublicRequestPath) {
    if (isLoggedIn) {
      // Redirect logged-in PMs to the guarded version of the requests page
      const newPath = pathname.replace('/public/requests/', '/requests/')
      return NextResponse.redirect(new URL(newPath, request.url))
    }
    // Allow non-logged-in users to access the public request page
    return NextResponse.next()
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
