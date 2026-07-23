'use client'

import { use } from 'react'
import { ExclusiveHomeDetailScreen } from '@/features/dashboard/components/exclusive-homes/ExclusiveHomeDetailScreen'

interface ExclusiveHomeDetailPageClientProps {
  params: Promise<{ id: string }>
}

export function ExclusiveHomeDetailPageClient({ params }: ExclusiveHomeDetailPageClientProps) {
  const { id } = use(params)
  return <ExclusiveHomeDetailScreen homeId={id} />
}
