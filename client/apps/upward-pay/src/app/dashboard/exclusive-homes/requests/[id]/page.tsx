'use client'

import { use } from 'react'
import { HomeRequestDetailScreen } from '@/features/dashboard/components/exclusive-homes/requests/HomeRequestDetailScreen'

export default function HomeRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <HomeRequestDetailScreen requestId={id} />
}
