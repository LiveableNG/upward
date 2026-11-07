'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { LifestyleDiscoveryScreen, OfferingDetailScreen } from '@/features/goals'
import FallbackSuspense from '@/components/FallbackSuspense'

function LifestylePageContent() {
  const searchParams = useSearchParams()
  const offeringId = searchParams.get('id') || searchParams.get('offering')

  if (offeringId) {
    return <OfferingDetailScreen identifier={offeringId} />
  }

  return <LifestyleDiscoveryScreen />
}

export default function LifestyleDiscoveryPage() {
  return (
    <Suspense fallback={<FallbackSuspense message="Loading lifestyle perks…" />}>
      <LifestylePageContent />
    </Suspense>
  )
}

