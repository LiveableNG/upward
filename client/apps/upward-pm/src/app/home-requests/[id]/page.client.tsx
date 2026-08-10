'use client'

import { use } from 'react'
import { TenantHomeRequestDetailPage } from '@/features/pm/components/home-requests/TenantHomeRequestDetailPage'

export default function HomeRequestDetailRouteClient({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <TenantHomeRequestDetailPage requestId={id} />
}
