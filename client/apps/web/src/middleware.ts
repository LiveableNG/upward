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


const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://upward-pay.vercel.app'
const PM_URL = process.env.NEXT_PUBLIC_PM_URL || 'https://upward-pm.vercel.app'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://upward-api.vercel.app/api/v1'

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // 1. Pay / Tenant Auth cookies
  const payTokenCookie = request.cookies.get('pay_access_token')
  const hasPayToken = !!payTokenCookie
  const payTokenValue = payTokenCookie?.value
  const isPayExpired = payTokenValue ? isTokenExpired(payTokenValue) : true

  // 2. PM / Landlord Auth cookies
  const pmTokenCookie = request.cookies.get('pm_access_token')
  const pmRefreshCookie = request.cookies.get('pm_refresh')
  const landlordTokenCookie = request.cookies.get('landlord_access_token')
  const landlordRefreshCookie = request.cookies.get('landlord_refresh_token')

  const hasPmToken = !!pmTokenCookie || !!landlordTokenCookie || !!pmRefreshCookie || !!landlordRefreshCookie

  // 3. Determine routing destination (Pay vs PM App)
  const redirectParam = request.nextUrl.searchParams.get('redirect') || ''

  const isPmRedirectParam = redirectParam.startsWith('/portal') ||
    redirectParam.startsWith('/properties') ||
    redirectParam.startsWith('/landlords') ||
    redirectParam.startsWith('/tenants') ||
    redirectParam.startsWith('/payments') ||
    redirectParam.startsWith('/requests') ||
    redirectParam.startsWith('/documents') ||
    redirectParam.startsWith('/pm')

  const isPmPath = pathname.startsWith('/portal') ||
    pathname.startsWith('/properties') ||
    pathname.startsWith('/landlords') ||
    pathname.startsWith('/tenants') ||
    pathname.startsWith('/payments') ||
    pathname.startsWith('/requests') ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/_upward_pm') ||
    pathname === '/pm-login' ||
    pathname === '/pm-signup'

  const isSharedRoute = pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/invite')

  // Rule: Should this request route to the PM app instead of the Pay app?
  const routeToPm = isPmPath || (isSharedRoute && (hasPmToken || isPmRedirectParam))

  const targetBase = routeToPm ? PM_URL : APP_URL
  const tokenCookie = routeToPm ? (pmTokenCookie || landlordTokenCookie) : payTokenCookie
  const hasToken = !!tokenCookie
  const isExpired = routeToPm
    ? (tokenCookie ? isTokenExpired(tokenCookie.value) : true)
    : isPayExpired

  // 4. Asset Proxy Logic (for upward-pay assets)
  if (pathname.startsWith('/_upward_pay')) {
    const assetPath = pathname.replace('/_upward_pay', '')
    const url = new URL(assetPath + search, APP_URL)

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-forwarded-host', request.headers.get('host') || '')
    requestHeaders.set('host', url.host)

    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    })
  }

  // 5. Asset Proxy Logic (for upward-pm assets)
  if (pathname.startsWith('/_upward_pm')) {
    const assetPath = pathname.replace('/_upward_pm', '')
    const url = new URL(assetPath + search, PM_URL)

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-forwarded-host', request.headers.get('host') || '')
    requestHeaders.set('host', url.host)

    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    })
  }

  // 6. Explicit /pm-login and /pm-signup rewrites
  if (pathname === '/pm-login' || pathname === '/pm-signup') {
    const targetPath = pathname === '/pm-login' ? '/login' : '/signup'
    const url = new URL(targetPath + search, PM_URL)

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-forwarded-host', request.headers.get('host') || '')
    requestHeaders.set('host', url.host)
    requestHeaders.set('x-proxy-source', 'upward-web-gateway')
    requestHeaders.set('x-forwarded-proto', 'https')

    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    })
  }

  // 7. Auth Redirection Logic (Redirect to dashboard if logged in)
  const isAuthPage = pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/pm-login' || pathname === '/pm-signup'

  if (isAuthPage) {
    const redirectParam = request.nextUrl.searchParams.get('redirect')
    if (redirectParam !== '/dashboard') {
      // 1. If PM/Landlord user has an active token, redirect straight to PM dashboard
      if (hasPmToken && pmTokenCookie && !isTokenExpired(pmTokenCookie.value)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      if (hasPmToken && landlordTokenCookie && !isTokenExpired(landlordTokenCookie.value)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      // 2. If Tenant user has an active token, redirect straight to Tenant dashboard
      if (hasPayToken && payTokenCookie && !isTokenExpired(payTokenCookie.value)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  // 8. Protected Routes Logic
  const isProtectedRoute = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/properties') ||
    pathname.startsWith('/landlords') ||
    pathname.startsWith('/tenants') ||
    pathname.startsWith('/payments') ||
    pathname.startsWith('/requests') ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/api/v1')

  if (isProtectedRoute && (!hasToken || isExpired) && !pathname.startsWith('/api/v1')) {
    // If we are at a protected route but not authenticated, go to appropriate login
    const loginPath = routeToPm ? (pathname.startsWith('/portal') ? '/portal/login' : '/pm-login') : '/login'
    const url = new URL(loginPath, request.url)
    if (pathname !== '/dashboard' && pathname !== '/portal') {
      url.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(url)
  }

  // 9. Proxy/Rewrite Logic for API
  if (pathname.startsWith('/api/v1')) {
    const apiBase = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL
    const pathWithoutPrefix = pathname.replace('/api/v1', '')
    const url = new URL(apiBase + pathWithoutPrefix + search)

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-forwarded-host', request.headers.get('host') || '')
    requestHeaders.set('host', url.host)
    requestHeaders.set('x-proxy-source', 'upward-web-gateway')
    requestHeaders.set('x-forwarded-proto', 'https')

    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    })
  }

  // 10. Proxy/Rewrite Logic for App Routes
  const shouldProxy = isProtectedRoute ||
    pathname.startsWith('/welcome') ||
    pathname.startsWith('/pay') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/waitlist') ||
    pathname.startsWith('/fill-record') ||
    pathname.startsWith('/complete-profile') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/kyc') ||
    pathname.startsWith('/transactions') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/.well-known')

  if (shouldProxy) {
    const targetPath = pathname
    const url = new URL(targetPath + search, targetBase)

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-forwarded-host', request.headers.get('host') || '')
    requestHeaders.set('host', url.host)
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
    '/_upward_pm/:path*',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/pm-login',
    '/pm-signup',
    '/portal/:path*',
    '/properties/:path*',
    '/landlords/:path*',
    '/tenants/:path*',
    '/payments/:path*',
    '/requests/:path*',
    '/documents/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/pay/:path*',
    '/waitlist/:path*',
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

