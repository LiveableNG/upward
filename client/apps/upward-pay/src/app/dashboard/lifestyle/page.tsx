'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  LifestyleDiscoveryScreen,
  OfferingDetailScreen,
  LifestyleDiscoverySkeleton,
} from '@/features/goals'

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
    <Suspense fallback={<LifestyleDiscoverySkeleton />}>
      <LifestylePageContent />
    </Suspense>
  )
}

