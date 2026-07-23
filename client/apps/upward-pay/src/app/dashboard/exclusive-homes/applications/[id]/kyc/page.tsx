import { Suspense } from 'react'
import FallbackSuspense from '@/components/FallbackSuspense'
import { ApplicationKycPageClient } from './ApplicationKycPageClient'

interface ApplicationKycPageProps {
  params: Promise<{ id: string }>
}

export default function ApplicationKycPage({ params }: ApplicationKycPageProps) {
  return (
    <Suspense fallback={<FallbackSuspense message="Loading KYC form…" />}>
      <ApplicationKycPageClient params={params} />
    </Suspense>
  )
}
