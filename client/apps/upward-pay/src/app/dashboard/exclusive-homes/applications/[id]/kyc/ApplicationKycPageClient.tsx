'use client'

import { use } from 'react'
import { ApplicationIdentityMockScreen } from '@/features/dashboard/components/exclusive-homes/applications/ApplicationIdentityMockScreen'

interface ApplicationKycPageClientProps {
  params: Promise<{ id: string }>
}

export function ApplicationKycPageClient({ params }: ApplicationKycPageClientProps) {
  const { id } = use(params)
  return <ApplicationIdentityMockScreen applicationId={id} />
}
