'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'
import JoinContent from '@/features/onboarding/JoinContent'
import { fetchInvitationData, type InvitationData } from '@/lib/invitation-service'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useAuth } from '@/features/auth/AuthContext'
import FallbackSuspense from '@/components/FallbackSuspense'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

function LandingPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isLoggedIn, loading: authLoading } = useAuth()

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  const [fetchingInvitation, setFetchingInvitation] = useState(!!token)

  useEffect(() => {
    if (authLoading) return

    // Invited / whitelist flow
    if (token) {
      fetchInvitationData(token)
        .then((data) => {
          setInvitationData(data)
          setFetchingInvitation(false)
        })
        .catch(() => {
          setFetchingInvitation(false)
        })
      return
    }

    if (email && !token) {
      setFetchingInvitation(false)
      return
    }

    // No token, no email → redirect
    if (isLoggedIn) {
      const handleNativeRedirect = async () => {
        if (Capacitor.isNativePlatform()) {
          // On native, check if we were launched with a deep link
          // If so, skip this redirect to let Providers.tsx handle it
          const launchUrl = await App.getLaunchUrl()
          if (launchUrl?.url && (launchUrl.url.includes('/pay/') || launchUrl.url.includes('pay/'))) {
            console.log('[Landing] Deep link detected on launch, skipping auto-redirect:', launchUrl.url)
            return
          }
          
          // Also check if there's any token/email in the search params (web fallback)
          if (token || email) {
            console.log('[Landing] Token/Email detected in params, skipping auto-redirect.')
            return
          }
        }

        const redirect = searchParams.get('redirect') || '/dashboard'
        console.log('[Landing] Redirecting to:', redirect)
        router.replace(redirect)
      }

      handleNativeRedirect()
    } else {
      router.replace('/signup')
    }
  }, [token, email, router, isLoggedIn, authLoading, searchParams])

  const isLoading = authLoading || fetchingInvitation

  if (isLoading) {
    return <LogoSplash />
  }

  // No token/email yet (redirect pending)
  if (!token && !email) {
    return <LogoSplash />
  }

  return (
    <Suspense fallback={<FallbackSuspense message="Syncing Invitation…" />}>
      <JoinContent
        initialInvitation={invitationData}
        token={token || undefined}
        email={email || undefined}
      />
    </Suspense>
  )
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
