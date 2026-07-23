'use client'

import { use } from 'react'
import { ApplicationViewingSlotScreen } from '@/features/dashboard/components/exclusive-homes/applications/ApplicationViewingSlotScreen'

interface ApplicationSchedulePageClientProps {
  params: Promise<{ id: string }>
}

export function ApplicationSchedulePageClient({ params }: ApplicationSchedulePageClientProps) {
  const { id } = use(params)
  return <ApplicationViewingSlotScreen applicationId={id} />
}
