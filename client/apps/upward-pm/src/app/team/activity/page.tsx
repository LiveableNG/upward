'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { TeamActivityDashboardView } from '@/features/pm/components/team/TeamActivityDashboardView'
import { ListSkeleton } from '@/components/skeletons'

function TeamActivityContent() {
  const searchParams = useSearchParams()
  const memberUuid = searchParams.get('memberUuid') || undefined

  return <TeamActivityDashboardView initialMemberUuid={memberUuid} />
}

export default function TeamActivityPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <TeamActivityContent />
    </Suspense>
  )
}
