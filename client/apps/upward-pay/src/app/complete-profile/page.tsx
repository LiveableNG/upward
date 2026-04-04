'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import CompleteProfileContent from '@/features/onboarding/CompleteProfileContent'
import { UpwardLogo } from '@/components/PoweredByUpward'

export default function CompleteProfilePage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || undefined
  const email = searchParams.get('email') || undefined

  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <CompleteProfileContent initialEmail={email} token={token} />
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
