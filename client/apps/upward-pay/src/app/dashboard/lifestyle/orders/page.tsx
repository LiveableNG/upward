'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  OrdersListScreen,
  OrderTrackingScreen,
  OrdersListSkeleton,
} from '@/features/goals'

function LifestyleOrdersContent() {
  const searchParams = useSearchParams()
  const queryOrderUuid =
    searchParams.get('uuid') || searchParams.get('order') || searchParams.get('id') || null

  const [activeOrderUuid, setActiveOrderUuid] = useState<string | null>(queryOrderUuid)

  useEffect(() => {
    setActiveOrderUuid(queryOrderUuid)
  }, [queryOrderUuid])

  const handleBack = () => {
    // Clear local view state synchronously so back navigation is instant (0ms)
    // and never stalls on a Next.js App Router RSC transition
    setActiveOrderUuid(null)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/dashboard/lifestyle/orders')
    }
  }

  if (activeOrderUuid) {
    return <OrderTrackingScreen orderUuid={activeOrderUuid} onBack={handleBack} />
  }

  return <OrdersListScreen />
}

export default function LifestyleOrdersPage() {
  return (
    <Suspense fallback={<OrdersListSkeleton />}>
      <LifestyleOrdersContent />
    </Suspense>
  )
}

