'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useAuth } from '@/features/auth/AuthContext'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import PayClient from '@/app/pay/[token]/PayClient'
import WaitlistClient from '@/app/waitlist/[uuid]/WaitlistClient'
import InviteClient from '@/app/invite/[uuid]/InviteClient'
import WelcomeClient from '@/app/welcome/[uuid]/WelcomeClient'
import { FillRecordClient } from '@/features/records/components/FillRecordClient'

function getPathInfo() {
  if (typeof window === 'undefined') return { token: null, type: null }
  const pathname = window.location.pathname
  const routes: { prefix: string; type: 'pay' | 'invite' | 'waitlist' | 'welcome' | 'fill-record' }[] = [
    { prefix: '/pay/', type: 'pay' },
    { prefix: '/invite/', type: 'invite' },
    { prefix: '/waitlist/', type: 'waitlist' },
    { prefix: '/welcome/', type: 'welcome' },
    { prefix: '/fill-record/', type: 'fill-record' },
  ]
  for (const r of routes) {
    if (pathname.includes(r.prefix)) {
      const t = pathname.split(r.prefix)[1]?.split('/')[0]?.split(/[?#]/)[0] || null
      return { token: t, type: r.type }
    }
  }
  return { token: null, type: null }
}

function LandingPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isLoggedIn, loading: authLoading } = useAuth()

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const initialPathInfo = useState(() => getPathInfo())[0]

  const [pathToken, setPathToken] = useState<string | null>(initialPathInfo.token)
  const [isPayRoute, setIsPayRoute] = useState(initialPathInfo.type === 'pay')
  const [isWaitlistRoute, setIsWaitlistRoute] = useState(initialPathInfo.type === 'waitlist')
  const [isInviteRoute, setIsInviteRoute] = useState(initialPathInfo.type === 'invite')
  const [isWelcomeRoute, setIsWelcomeRoute] = useState(initialPathInfo.type === 'welcome')
  const [isFillRecordRoute, setIsFillRecordRoute] = useState(initialPathInfo.type === 'fill-record')
  const [fetchingInvitation, setFetchingInvitation] = useState(!!token)

  // On mount, check if we're on a subpath (for Capacitor fallback)
  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      const info = getPathInfo()
      if (info.token) {
        console.log('[Landing] Detected subpath on mobile:', info.type, info.token)
        setPathToken(info.token)
        setIsPayRoute(info.type === 'pay')
        setIsWaitlistRoute(info.type === 'waitlist')
        setIsInviteRoute(info.type === 'invite')
        setIsWelcomeRoute(info.type === 'welcome')
        setIsFillRecordRoute(info.type === 'fill-record')
        setFetchingInvitation(false)
      }
    }
  }, [])

  const finalToken = token || pathToken

  useEffect(() => {
    if (authLoading) return

    // If on a subpath or token route, skip redirecting
    if (finalToken || isPayRoute || isWaitlistRoute || isInviteRoute || isWelcomeRoute || isFillRecordRoute) {
      setFetchingInvitation(false)
      return
    }

    if (email && !finalToken) {
      setFetchingInvitation(false)
      return
    }

    const handleRedirect = async () => {
      if (Capacitor.isNativePlatform()) {
        const launchUrl = await App.getLaunchUrl()
        const isDeepLink = !!(launchUrl?.url && (
          launchUrl.url.includes('/pay/') ||
          launchUrl.url.includes('pay/') ||
          launchUrl.url.includes('/invite/') ||
          launchUrl.url.includes('invite/') ||
          launchUrl.url.includes('/waitlist/') ||
          launchUrl.url.includes('waitlist/') ||
          launchUrl.url.includes('/welcome/') ||
          launchUrl.url.includes('welcome/') ||
          launchUrl.url.includes('/fill-record/') ||
          launchUrl.url.includes('fill-record/')
        )) || (typeof window !== 'undefined' && (
          window.location.pathname.includes('/pay/') ||
          window.location.pathname.includes('/invite/') ||
          window.location.pathname.includes('/waitlist/') ||
          window.location.pathname.includes('/welcome/') ||
          window.location.pathname.includes('/fill-record/')
        ))

        if (isDeepLink) {
          console.log('[Landing] Deep link or subpath detected, skipping auto-redirect')
          return
        }
        
        if (finalToken || email) {
          console.log('[Landing] Token/Email detected, skipping auto-redirect.')
          return
        }
      }

      if (isLoggedIn) {
        const redirect = searchParams.get('redirect') || '/dashboard'
        console.log('[Landing] Redirecting to:', redirect)
        router.replace(redirect)
      } else {
        router.replace('/signup')
      }
    }

    handleRedirect()
  }, [finalToken, email, router, isLoggedIn, authLoading, searchParams, isPayRoute, isWaitlistRoute, isInviteRoute, isWelcomeRoute, isFillRecordRoute])

  const isLoading = authLoading || fetchingInvitation

  if (isLoading) {
    return <LogoSplash />
  }

  if (!finalToken && !email && !isPayRoute && !isWaitlistRoute && !isInviteRoute && !isWelcomeRoute && !isFillRecordRoute) {
    return <LogoSplash />
  }

  if (isPayRoute && finalToken) {
    return <PayClient overrideToken={finalToken} />
  }

  if (isWaitlistRoute && finalToken) {
    return <WaitlistClient overrideUuid={finalToken} />
  }

  if (isInviteRoute && finalToken) {
    return <InviteClient overrideToken={finalToken} />
  }

  if (isWelcomeRoute && finalToken) {
    return <WelcomeClient overrideUuid={finalToken} />
  }

  if (isFillRecordRoute && finalToken) {
    return (
      <div className="fill-record-view">
        <FillRecordClient uuid={finalToken} />
      </div>
    )
  }
}

export default function LandingPage() {
  return (
    <Suspense fallback={<LogoSplash />}>
      <LandingPageContent />
    </Suspense>
  )
}

function LogoSplash() {
  return (
    <div className="landing-splash">
      <div className="landing-splash__logo">
        <UpwardLogo size={52} color="var(--clay)" />
      </div>
    </div>
  )
}
