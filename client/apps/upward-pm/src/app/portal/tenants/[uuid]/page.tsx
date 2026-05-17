'use client'

import React, { Suspense } from 'react'
import { TenantDetailView } from '@/features/pm/components/tenants/TenantDetailView'
import { Splash } from '@/components/common/Splash'

export default function LandlordTenantDetailPage() {
  return (
    <Suspense fallback={<Splash />}>
      <TenantDetailView />
    </Suspense>
  )
}
