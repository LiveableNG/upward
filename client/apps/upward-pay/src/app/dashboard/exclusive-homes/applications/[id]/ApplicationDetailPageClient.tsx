'use client'

import { use } from 'react'
import { ApplicationDetailScreen } from '@/features/dashboard/components/exclusive-homes/applications/ApplicationDetailScreen'

interface ApplicationDetailPageClientProps {
  params: Promise<{ id: string }>
}

export function ApplicationDetailPageClient({ params }: ApplicationDetailPageClientProps) {
  const { id } = use(params)
  return <ApplicationDetailScreen applicationId={id} />
}
