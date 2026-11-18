'use client'

import React, { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  OrdersListScreen,
  OrderTrackingScreen,
  OrdersListSkeleton,
} from '@/features/goals'

function LifestyleOrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderUuid = searchParams.get('uuid') || searchParams.get('order') || searchParams.get('id') || null

  const handleBack = () => {
    router.replace('/dashboard/lifestyle/orders')
  }

  if (orderUuid) {
    return <OrderTrackingScreen orderUuid={orderUuid} onBack={handleBack} />
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

