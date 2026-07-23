'use client'

import { use } from 'react'
import { ApplicationRentPassportScreen } from '@/features/dashboard/components/exclusive-homes/applications/ApplicationRentPassportScreen'

interface ApplicationProfilePageClientProps {
  params: Promise<{ id: string }>
}

export function ApplicationProfilePageClient({ params }: ApplicationProfilePageClientProps) {
  const { id } = use(params)
  return <ApplicationRentPassportScreen applicationId={id} />
}
