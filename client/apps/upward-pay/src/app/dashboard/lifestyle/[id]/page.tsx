import React from 'react'
import { OfferingDetailScreen } from '@/features/goals/components/OfferingDetailScreen'

export default async function LifestyleOfferingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <OfferingDetailScreen identifier={id} />
}
