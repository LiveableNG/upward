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
  const { pathname, search } = request.nextUrl

  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const protocol =
    request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
  const baseUrl = `${protocol}://${host}`

  // PM Auth
  const accessToken = request.cookies.get('pm_access_token')?.value
  const refreshToken = request.cookies.get('pm_refresh')?.value

  const isAccessExpired = accessToken ? isTokenExpired(accessToken) : true
  const isLoggedIn = (!!accessToken && !isAccessExpired) || !!refreshToken

  // Landlord Auth
  const landlordAccessToken = request.cookies.get('landlord_access_token')?.value
  const landlordRefreshToken = request.cookies.get('landlord_refresh_token')?.value
  const isLandlordAccessExpired = landlordAccessToken ? isTokenExpired(landlordAccessToken) : true
  const isLandlordLoggedIn =
    (!!landlordAccessToken && !isLandlordAccessExpired) || !!landlordRefreshToken

  const isPortalPath = pathname.startsWith('/portal')

  const isPublicPath =
    pathname === '/welcome' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/pm-login' ||
    pathname === '/pm-signup' ||
    pathname === '/forgot-password' ||
    pathname === '/pm-forgot-password' ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/reset-password')

  const isPublicRequestPath = pathname.startsWith('/public/requests/')

  // Gateway-style aliases (/pm-login) map to internal auth routes (/login)
  if (pathname === '/pm-login' || pathname === '/pm-signup' || pathname === '/pm-forgot-password') {
    const targetPath =
      pathname === '/pm-login'
        ? '/login'
        : pathname === '/pm-signup'
          ? '/signup'
          : '/forgot-password'

    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/dashboard', baseUrl))
    }

    return NextResponse.rewrite(new URL(targetPath + search, baseUrl))
  }

  if (isPortalPath) {
    const isPortalLoginPath = pathname === '/portal/login'
    const isPortalSignupPath = pathname === '/portal/signup'
    const isPortalPublic =
      isPortalLoginPath || isPortalSignupPath || pathname.startsWith('/portal/reset-password')

    if (isPortalLoginPath || isPortalSignupPath) {
      if (isLandlordLoggedIn) {
        return NextResponse.redirect(new URL('/portal', baseUrl))
      }
      return NextResponse.next()
    }

    if (!isPortalPublic && !isLandlordLoggedIn) {
      const loginUrl = new URL('/portal/login', baseUrl)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // PM Auth Logic
  if (isPublicPath && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', baseUrl))
  }

  if (isPublicRequestPath) {
    if (isLoggedIn) {
      const newPath = pathname.replace('/public/requests/', '/requests/')
      return NextResponse.redirect(new URL(newPath + search, baseUrl))
    }
    return NextResponse.next()
  }

  // Root path handling
  if (pathname === '/') {
    if (isLoggedIn) return NextResponse.redirect(new URL('/dashboard', baseUrl))
    return NextResponse.next()
  }

  // Protected paths
  if (!isPublicPath && !isLoggedIn && !pathname.startsWith('/api')) {
    const loginUrl = new URL('/pm-login', baseUrl)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
