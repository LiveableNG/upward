'use client'

import React, { Suspense } from 'react'
import { DashboardView } from '@/features/pm/components/dashboard/DashboardView'
import { Splash } from '@/components/common/Splash'

export default function Dashboard() {
  return (
    <Suspense fallback={<Splash />}>
      <DashboardView />
    </Suspense>
  )
}
