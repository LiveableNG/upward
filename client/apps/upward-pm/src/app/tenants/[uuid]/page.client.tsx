'use client'

import React, { Suspense } from 'react'
import { TenantDetailView } from '@/features/pm/components/tenants/TenantDetailView'
import { DetailSkeleton } from '@/components/skeletons'

export default function TenantDetailPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <TenantDetailView />
    </Suspense>
  )
}
