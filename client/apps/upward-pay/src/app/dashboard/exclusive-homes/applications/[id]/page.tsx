import { Suspense } from 'react'
import FallbackSuspense from '@/components/FallbackSuspense'
import { ApplicationDetailPageClient } from './ApplicationDetailPageClient'

export function generateStaticParams() {
  return [{ id: 'placeholder' }]
}

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>
}

export default function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  return (
    <Suspense fallback={<FallbackSuspense message="Loading application…" />}>
      <ApplicationDetailPageClient params={params} />
    </Suspense>
  )
}
