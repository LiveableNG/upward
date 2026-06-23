import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://upward-api.vercel.app/api/v1'

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

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const tokenCookie = request.cookies.get('pay_access_token')
  const refreshCookie = request.cookies.get('user_refresh')
  const tokenValue = tokenCookie?.value
  const isExpired = tokenValue ? isTokenExpired(tokenValue) : true
  const hasActiveAccess = !!tokenCookie && !isExpired
  const hasRefreshSession = !!refreshCookie?.value
  const hasValidSession = hasActiveAccess || hasRefreshSession

  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const protocol =
    request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
  const baseUrl = `${protocol}://${host}`

  if (pathname.startsWith('/invite/')) {
    const segments = pathname.split('/')
    const uuid = segments[segments.length - 1]
    if (uuid && uuid !== 'invite') {
      try {
        const res = await fetch(`${API_URL}/public/invite/${uuid}`)
        if (res.ok) {
          const data = await res.json()
          if (data?.isWaitlist) {
            return NextResponse.redirect(new URL(`/waitlist/${uuid}${search}`, baseUrl))
          }
        }
      } catch (err) {
        console.error('Error checking waitlist in pay middleware:', err)
      }
    }
  }

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password')

  if (isAuthPage && hasValidSession) {
    const searchParams = request.nextUrl.searchParams
    const redirectPath = searchParams.get('redirect') || '/dashboard'
    return NextResponse.redirect(new URL(redirectPath, baseUrl))
  }

  const isProtectedPage =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/kyc') ||
    pathname.startsWith('/transactions')

  if (isProtectedPage && !hasValidSession) {
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
    '/reset-password',
  ],
}
