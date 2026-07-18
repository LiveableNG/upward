'use client'

import React, { Suspense } from 'react'
import { PaymentDetailView } from '@/features/pm/components/payments/PaymentDetailView'
import { DetailSkeleton } from '@/components/skeletons'

export default function ClientPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PaymentDetailView />
    </Suspense>
  )
}
