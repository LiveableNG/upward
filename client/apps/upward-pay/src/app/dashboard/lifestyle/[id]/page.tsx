import React, { Suspense } from 'react'
import { OfferingDetailScreen } from '@/features/goals/components/OfferingDetailScreen'
import FallbackSuspense from '@/components/FallbackSuspense'

export function generateStaticParams() {
  return [{ id: 'placeholder' }]
}

export default async function LifestyleOfferingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={<FallbackSuspense message="Loading details…" />}>
      <OfferingDetailScreen identifier={id} />
    </Suspense>
  )
}
