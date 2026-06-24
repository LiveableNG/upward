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

function landingAnalyticsScript(): NextResponse {
  const gaId = process.env.NEXT_PUBLIC_GA_ID
  if (!gaId) {
    return new NextResponse('// Google Analytics disabled (NEXT_PUBLIC_GA_ID not set)', {
      headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
    })
  }

  const body = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
(function () {
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=${gaId}';
  document.head.appendChild(s);
  gtag('js', new Date());
  gtag('config', '${gaId}', { page_path: window.location.pathname });
})();`

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (pathname === '/landing-analytics.js') {
    return landingAnalyticsScript()
  }

  if (pathname === '/pm') {
    return NextResponse.redirect(new URL('/pm-login', request.url))
  }

  let isPmInvite = false
  let rewrittenPathname = pathname
  // Intercept waitlist invites at gateway level to avoid client loading states
  if (pathname.startsWith('/pm-invite/')) {
    isPmInvite = true
    rewrittenPathname = pathname.replace('/pm-invite/', '/invite/')
  } else if (pathname.startsWith('/invite/')) {
    const segments = pathname.split('/')
    const uuid = segments[segments.length - 1]
    if (uuid && uuid !== 'invite') {
      try {
        const res = await fetch(`${API_URL}/public/invite/${uuid}`)
        if (res.ok) {
          const data = await res.json()
          if (data?.isWaitlist) {
            return NextResponse.redirect(new URL(`/waitlist/${uuid}${search}`, request.url))
          }
        } else {
          // If not a tenant/waitlist invite, check if it is a PM team member invite
          const pmRes = await fetch(`${API_URL}/pm/auth/invite-details/${uuid}`)
          if (pmRes.ok) {
            isPmInvite = true
          }
        }
      } catch (err) {
        console.error('Error checking invite in gateway middleware:', err)
      }
    }
  }

  // 1. Pay / Tenant Auth cookies
  const payTokenCookie = request.cookies.get('pay_access_token')
  const payTokenValue = payTokenCookie?.value
  const isPayExpired = payTokenValue ? isTokenExpired(payTokenValue) : true
  const hasActivePayToken = !!payTokenCookie && !isPayExpired

  // 2. PM / Landlord Auth cookies
  const pmTokenCookie = request.cookies.get('pm_access_token')
  const pmRefreshCookie = request.cookies.get('pm_refresh')
  const landlordTokenCookie = request.cookies.get('landlord_access_token')
  const landlordRefreshCookie = request.cookies.get('landlord_refresh_token')

  const isPmExpired = pmTokenCookie ? isTokenExpired(pmTokenCookie.value) : true
  const isLandlordExpired = landlordTokenCookie ? isTokenExpired(landlordTokenCookie.value) : true
  const hasActivePmToken =
    (!!pmTokenCookie && !isPmExpired) || (!!landlordTokenCookie && !isLandlordExpired)

  // 3. Determine routing destination (Pay vs PM App)
  const redirectParam = request.nextUrl.searchParams.get('redirect') || ''

  const isPmRedirectParam =
    redirectParam.startsWith('/portal') ||
    redirectParam.startsWith('/properties') ||
    redirectParam.startsWith('/landlords') ||
    redirectParam.startsWith('/tenants') ||
    redirectParam.startsWith('/payments') ||
    redirectParam.startsWith('/requests') ||
    redirectParam.startsWith('/documents') ||
    redirectParam.startsWith('/pm')

  const isPmPath =
    pathname.startsWith('/portal') ||
    pathname.startsWith('/properties') ||
    pathname.startsWith('/landlords') ||
    pathname.startsWith('/tenants') ||
    pathname.startsWith('/payments') ||
    pathname.startsWith('/requests') ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/_upward_pm') ||
    pathname === '/pm-login' ||
    pathname === '/pm-signup' ||
    pathname === '/pm-forgot-password'

  const isSharedRoute =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/invite')

  // Rule: Should this request route to the PM app instead of the Pay app?
  let routeToPm = isPmPath || isPmInvite
  if (!routeToPm && isSharedRoute) {
    if (isPmRedirectParam) {
      routeToPm = true
    } else if (hasActivePmToken && !hasActivePayToken) {
      routeToPm = true
    } else if (hasActivePayToken && !hasActivePmToken) {
      routeToPm = false
    } else {
      // If neither or both are active, check refresh tokens or fallback
      const hasPmSession = hasActivePmToken || !!pmRefreshCookie || !!landlordRefreshCookie
      const hasPaySession = hasActivePayToken || !!payTokenCookie
      if (hasPmSession && !hasPaySession) {
        routeToPm = true
      } else if (hasPaySession && !hasPmSession) {
        routeToPm = false
      } else {
        // Fallback: route to PM if they have any PM session, otherwise default to Pay
        routeToPm = hasPmSession
      }
    }
  }

  const targetBase = routeToPm ? PM_URL : APP_URL
  const tokenCookie = routeToPm ? pmTokenCookie || landlordTokenCookie : payTokenCookie
  const hasToken = !!tokenCookie
  const isExpired = routeToPm
    ? tokenCookie
      ? isTokenExpired(tokenCookie.value)
      : true
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

  // 6. Explicit /pm-login, /pm-signup, and /pm-forgot-password rewrites
  if (pathname === '/pm-login' || pathname === '/pm-signup' || pathname === '/pm-forgot-password') {
    const targetPath = 
      pathname === '/pm-login' 
        ? '/login' 
        : pathname === '/pm-signup' 
          ? '/signup' 
          : '/forgot-password'
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

  const isAuthPage =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/pm-login' ||
    pathname === '/pm-signup' ||
    pathname === '/pm-forgot-password'

  if (isAuthPage) {
    const currentRedirect = request.nextUrl.searchParams.get('redirect')
    // Avoid redirect loop: don't redirect if we're already heading to /dashboard
    const alreadyGoingToDashboard = currentRedirect === '/dashboard'
    if (!alreadyGoingToDashboard) {
      const dashboardUrl = new URL('/dashboard', request.url)
      // 1. If PM/Landlord user has an active token, redirect straight to PM dashboard
      if (hasActivePmToken) {
        return NextResponse.redirect(dashboardUrl)
      }
      // 2. If Tenant user has an active token, redirect straight to Tenant dashboard
      if (hasActivePayToken) {
        return NextResponse.redirect(dashboardUrl)
      }
    }
  }

  // 8. Protected Routes Logic
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/properties') ||
    pathname.startsWith('/landlords') ||
    pathname.startsWith('/tenants') ||
    pathname.startsWith('/payments') ||
    pathname.startsWith('/requests') ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/api/v1')

  const hasPmRefresh = !!pmRefreshCookie || !!landlordRefreshCookie
  const hasValidSession = routeToPm
    ? (hasToken && !isExpired) || hasPmRefresh
    : hasToken && !isExpired

  if (isProtectedRoute && !hasValidSession && !pathname.startsWith('/api/v1')) {
    const loginPath = routeToPm
      ? pathname.startsWith('/portal')
        ? '/portal/login'
        : '/pm-login'
      : '/login'
    // Prevent redirect loop: if we're already on the login page, don't redirect again
    if (pathname === loginPath || pathname === '/login' || pathname === '/pm-login') {
      return NextResponse.next()
    }
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
  const shouldProxy =
    isProtectedRoute ||
    pathname.startsWith('/welcome') ||
    pathname.startsWith('/pay') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/pm-invite') ||
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
    const targetPath = rewrittenPathname
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

  // Static marketing homepage (see public/landing.html; legacy React UI in src/_archive/homepage/)
  if (pathname === '/') {
    return NextResponse.rewrite(new URL('/landing.html', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/landing-analytics.js',
    '/pm',
    '/_upward_pay/:path*',
    '/_upward_pm/:path*',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/pm-login',
    '/pm-signup',
    '/pm-forgot-password',
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
    '/pm-invite/:path*',
    '/fill-record/:path*',
    '/complete-profile/:path*',
    '/settings/:path*',
    '/kyc/:path*',
    '/transactions/:path*',
    '/.well-known/:path*',
  ],
}
