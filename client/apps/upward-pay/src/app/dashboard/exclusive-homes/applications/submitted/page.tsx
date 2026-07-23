'use client'

import { Suspense } from 'react'
import FallbackSuspense from '@/components/FallbackSuspense'
import { ApplicationSubmittedScreen } from '@/features/dashboard/components/exclusive-homes/applications/ApplicationSubmittedScreen'

export default function ApplicationSubmittedPage() {
  return (
    <Suspense fallback={<FallbackSuspense message="Loading application…" />}>
      <ApplicationSubmittedScreen />
    </Suspense>
  )
}
