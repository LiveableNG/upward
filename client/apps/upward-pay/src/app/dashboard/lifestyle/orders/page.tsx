'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  OrdersListScreen,
  OrderTrackingScreen,
  OrdersListSkeleton,
} from '@/features/goals'

function LifestyleOrdersContent() {
  const searchParams = useSearchParams()
  const orderUuid = searchParams.get('uuid') || searchParams.get('order') || searchParams.get('id')

  if (orderUuid) {
    return <OrderTrackingScreen orderUuid={orderUuid} />
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

