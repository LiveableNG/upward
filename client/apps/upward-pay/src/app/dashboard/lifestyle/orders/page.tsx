'use client'

import React, { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  OrdersListScreen,
  OrderTrackingScreen,
  OrdersListSkeleton,
} from '@/features/goals'

function LifestyleOrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paramUuid = searchParams.get('uuid') || searchParams.get('order') || searchParams.get('id')
  const [closedUuid, setClosedUuid] = useState<string | null>(null)

  useEffect(() => {
    if (paramUuid && paramUuid !== closedUuid) {
      setClosedUuid(null)
    }
  }, [paramUuid])

  const orderUuid = paramUuid && paramUuid !== closedUuid ? paramUuid : null

  const handleBack = () => {
    setClosedUuid(paramUuid)
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.replace('/dashboard/lifestyle/orders')
    }
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

