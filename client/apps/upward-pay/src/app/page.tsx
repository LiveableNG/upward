'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'
import JoinContent from '@/features/onboarding/JoinContent'
import { fetchInvitationData, type InvitationData } from '@/lib/invitation-service'
import { UpwardLogo } from '@/components/PoweredByUpward'
import { useAuth } from '@/features/auth/AuthContext'
import FallbackSuspense from '@/components/FallbackSuspense'

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
      router.replace('/dashboard')
    } else {
      router.replace('/signup')
    }
  }, [token, email, router, isLoggedIn, authLoading])

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
