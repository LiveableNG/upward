'use client'

import React, { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  LifestyleDiscoveryScreen,
  OfferingDetailScreen,
  OfferingDetailSkeleton,
  LifestyleDiscoverySkeleton,
} from '@/features/goals'

function LifestylePageContent() {
  const searchParams = useSearchParams()
  const offeringId = searchParams.get('id') || searchParams.get('offering')

  useEffect(() => {
    if (offeringId && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [offeringId])

  if (offeringId) {
    return (
      <Suspense fallback={<OfferingDetailSkeleton />}>
        <OfferingDetailScreen identifier={offeringId} />
      </Suspense>
    )
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

