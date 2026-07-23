'use client'

import { Suspense } from 'react'
import FallbackSuspense from '@/components/FallbackSuspense'
import { HomeRequestSubmittedScreen } from '@/features/dashboard/components/exclusive-homes/requests/HomeRequestSubmittedScreen'

export default function HomeRequestSubmittedPage() {
  return (
    <Suspense fallback={<FallbackSuspense message="Loading…" />}>
      <HomeRequestSubmittedScreen />
    </Suspense>
  )
}
