'use client'

import React, { Suspense, useLayoutEffect, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  LifestyleDiscoveryScreen,
  OfferingDetailScreen,
  OfferingDetailSkeleton,
  LifestyleDiscoverySkeleton,
} from '@/features/goals'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

function LifestylePageContent() {
  const searchParams = useSearchParams()
  const offeringId = searchParams.get('id') || searchParams.get('offering')

  useIsomorphicLayoutEffect(() => {
    if (offeringId && typeof window !== 'undefined') {
      const html = document.documentElement
      const prev = html.style.scrollBehavior
      html.style.scrollBehavior = 'auto'
      window.scrollTo(0, 0)
      html.scrollTop = 0
      document.body.scrollTop = 0
      html.style.scrollBehavior = prev
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
