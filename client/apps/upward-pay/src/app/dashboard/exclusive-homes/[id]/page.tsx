import { Suspense } from 'react'
import FallbackSuspense from '@/components/FallbackSuspense'
import { ExclusiveHomeDetailPageClient } from './ExclusiveHomeDetailPageClient'

interface ExclusiveHomeDetailPageProps {
  params: Promise<{ id: string }>
}

export default function ExclusiveHomeDetailPage({ params }: ExclusiveHomeDetailPageProps) {
  return (
    <Suspense fallback={<FallbackSuspense message="Loading listing…" />}>
      <ExclusiveHomeDetailPageClient params={params} />
    </Suspense>
  )
}
