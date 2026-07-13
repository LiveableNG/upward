import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { DashboardView } from '@/features/pm/components/dashboard/DashboardView'
import { DashboardSkeleton } from '@/components/skeletons'

export const metadata: Metadata = {
  title: 'Dashboard',
}


export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardView />
    </Suspense>
  )
}
