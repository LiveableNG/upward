import { Suspense } from 'react'
import FallbackSuspense from '@/components/FallbackSuspense'
import { ApplicationSchedulePageClient } from './ApplicationSchedulePageClient'

interface ApplicationSchedulePageProps {
  params: Promise<{ id: string }>
}

export default function ApplicationSchedulePage({ params }: ApplicationSchedulePageProps) {
  return (
    <Suspense fallback={<FallbackSuspense message="Loading inspection slots…" />}>
      <ApplicationSchedulePageClient params={params} />
    </Suspense>
  )
}
