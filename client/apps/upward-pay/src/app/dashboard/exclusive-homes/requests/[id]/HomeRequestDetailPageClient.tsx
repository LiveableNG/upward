'use client'

import { use } from 'react'
import { HomeRequestDetailScreen } from '@/features/dashboard/components/exclusive-homes/requests/HomeRequestDetailScreen'

interface HomeRequestDetailPageClientProps {
  params: Promise<{ id: string }>
}

export default function HomeRequestDetailPageClient({ params }: HomeRequestDetailPageClientProps) {
  const { id } = use(params)
  return <HomeRequestDetailScreen requestId={id} />
}
