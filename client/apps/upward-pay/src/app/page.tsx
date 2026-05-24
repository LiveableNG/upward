'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'
import { fetchInvitationData, type InvitationData } from '@/lib/invitation-service'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useAuth } from '@/features/auth/AuthContext'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import PayClient from '@/app/pay/[token]/PayClient'
import WaitlistClient from '@/app/waitlist/[uuid]/WaitlistClient'
import InviteClient from '@/app/invite/[uuid]/InviteClient'
import WelcomeClient from '@/app/welcome/[uuid]/WelcomeClient'

function LandingPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isLoggedIn, loading: authLoading } = useAuth()

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  
  const [pathToken, setPathToken] = useState<string | null>(null)
  const [isPayRoute, setIsPayRoute] = useState(false)
  const [isWaitlistRoute, setIsWaitlistRoute] = useState(false)
  const [isInviteRoute, setIsInviteRoute] = useState(false)
  const [isWelcomeRoute, setIsWelcomeRoute] = useState(false)
  const [fetchingInvitation, setFetchingInvitation] = useState(!!token)

  // On mount, check if we're on a subpath (for Capacitor fallback)
  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      const pathname = window.location.pathname
      if (pathname.includes('/pay/')) {
        const t = pathname.split('/pay/')[1]?.split('/')[0]
        if (t) {
          console.log('[Landing] Detected pay path on mobile:', t)
          setPathToken(t)
          setIsPayRoute(true)
          setFetchingInvitation(false)
        }
      } else if (pathname.includes('/invite/')) {
        const t = pathname.split('/invite/')[1]?.split('/')[0]
        if (t) {
          console.log('[Landing] Detected invite path on mobile:', t)
          setPathToken(t)
          setIsInviteRoute(true)
          setFetchingInvitation(false)
        }
      } else if (pathname.includes('/waitlist/')) {
        const t = pathname.split('/waitlist/')[1]?.split('/')[0]
        if (t) {
          console.log('[Landing] Detected waitlist path on mobile:', t)
          setPathToken(t)
          setIsWaitlistRoute(true)
          setFetchingInvitation(false)
        }
      } else if (pathname.includes('/welcome/')) {
        const t = pathname.split('/welcome/')[1]?.split('/')[0]
        if (t) {
          console.log('[Landing] Detected welcome path on mobile:', t)
          setPathToken(t)
          setIsWelcomeRoute(true)
          setFetchingInvitation(false)
        }
      }
    }
  }, [])

  const finalToken = token || pathToken

  useEffect(() => {
    if (authLoading) return

    // Invited / whitelist flow
    if (finalToken && !isPayRoute) {
      setFetchingInvitation(true)
      fetchInvitationData(finalToken)
        .then((data) => {
          setInvitationData(data)
          setFetchingInvitation(false)
        })
        .catch(() => {
          setFetchingInvitation(false)
        })
      return
    }

    if (email && !finalToken) {
      setFetchingInvitation(false)
      return
    }

    const handleRedirect = async () => {
      if (isLoggedIn) {
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
            launchUrl.url.includes('welcome/')
          )) || (typeof window !== 'undefined' && (
            window.location.pathname.includes('/pay/') ||
            window.location.pathname.includes('/invite/') ||
            window.location.pathname.includes('/waitlist/') ||
            window.location.pathname.includes('/welcome/')
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

        const redirect = searchParams.get('redirect') || '/dashboard'
        console.log('[Landing] Redirecting to:', redirect)
        router.replace(redirect)
      } else {
        router.replace('/signup')
      }
    }

    handleRedirect()
  }, [finalToken, email, router, isLoggedIn, authLoading, searchParams, isPayRoute])

  const isLoading = authLoading || fetchingInvitation

  if (isLoading) {
    return <LogoSplash />
  }

  if (!finalToken && !email && !isPayRoute) {
    return <LogoSplash />
  }

  if (isPayRoute && finalToken) {
    return <PayClient overrideToken={finalToken} />
  }

  if (isWaitlistRoute && finalToken) {
    return <WaitlistClient />
  }

  if (isInviteRoute && finalToken) {
    return <InviteClient />
  }

  if (isWelcomeRoute && finalToken) {
    return <WelcomeClient />
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
