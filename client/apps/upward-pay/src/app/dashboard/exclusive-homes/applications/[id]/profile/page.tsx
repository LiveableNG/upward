import { Suspense } from 'react'
import FallbackSuspense from '@/components/FallbackSuspense'
import { ApplicationProfilePageClient } from './ApplicationProfilePageClient'

interface ApplicationProfilePageProps {
  params: Promise<{ id: string }>
}

export default function ApplicationProfilePage({ params }: ApplicationProfilePageProps) {
  return (
    <Suspense fallback={<FallbackSuspense message="Loading profile preview…" />}>
      <ApplicationProfilePageClient params={params} />
    </Suspense>
  )
}
