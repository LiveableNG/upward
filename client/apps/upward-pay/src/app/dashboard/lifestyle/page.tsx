'use client'

import React, { Suspense } from 'react'
import { LifestyleDiscoveryScreen } from '@/features/goals'
import FallbackSuspense from '@/components/FallbackSuspense'

export default function LifestyleDiscoveryPage() {
  return (
    <Suspense fallback={<FallbackSuspense message="Loading lifestyle perks…" />}>
      <LifestyleDiscoveryScreen />
    </Suspense>
  )
}
