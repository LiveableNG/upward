import React, { Suspense } from 'react'
import {
  OfferingDetailScreen,
  OfferingDetailSkeleton,
} from '@/features/goals/components/OfferingDetailScreen'

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
    <Suspense fallback={<OfferingDetailSkeleton />}>
      <OfferingDetailScreen identifier={id} />
    </Suspense>
  )
}
