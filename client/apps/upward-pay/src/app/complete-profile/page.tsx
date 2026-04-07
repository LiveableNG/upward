'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import CompleteProfileContent from '@/features/onboarding/CompleteProfileContent'
import { UpwardLogo } from '@/components/PoweredByUpward'

function CompleteProfileInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || undefined
  const email = searchParams.get('email') || undefined

  return <CompleteProfileContent initialEmail={email} token={token} />
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <CompleteProfileInner />
    </Suspense>
  )
}

function OnboardingSkeleton() {
  return (
    <div className="onboarding h-screen flex items-center justify-center bg-[var(--color-background)]">
      <div className="text-center space-y-6 animate-pulse">
        <UpwardLogo size={48} />
        <p className="text-[var(--color-text-muted)] font-medium tracking-wide">
          Preparing Secure Onboarding...
        </p>
      </div>
    </div>
  )
}
