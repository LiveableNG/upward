import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { DashboardView } from '@/features/pm/components/dashboard/DashboardView'
import { Splash } from '@/components/common/Splash'

export const metadata: Metadata = {
  title: 'Dashboard',
}


export default function Dashboard() {
  return (
    <Suspense fallback={<Splash />}>
      <DashboardView />
    </Suspense>
  )
}
