'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { TeamActivityDashboardView } from '@/features/pm/components/team/TeamActivityDashboardView'
import { FeatureGate } from '@/features/pm/components/subscription/FeatureGate'
import { FeatureKey } from '@/features/pm/types/subscription'
import { ListSkeleton } from '@/components/skeletons'

function TeamActivityContent() {
  const searchParams = useSearchParams()
  const memberUuid = searchParams.get('memberUuid') || undefined

  return (
    <FeatureGate feature={FeatureKey.REPORTS_AND_TEAM_ACTIVITY}>
      <TeamActivityDashboardView initialMemberUuid={memberUuid} />
    </FeatureGate>
  )
}

export default function TeamActivityPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <TeamActivityContent />
    </Suspense>
  )
}
