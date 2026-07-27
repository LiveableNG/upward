import { Suspense } from 'react'
import FallbackSuspense from '@/components/FallbackSuspense'
import HomeRequestDetailPageClient from './HomeRequestDetailPageClient'

export function generateStaticParams() {
  return [{ id: 'placeholder' }]
}

interface HomeRequestDetailPageProps {
  params: Promise<{ id: string }>
}

export default function HomeRequestDetailPage({ params }: HomeRequestDetailPageProps) {
  return (
    <Suspense fallback={<FallbackSuspense message="Loading request details…" />}>
      <HomeRequestDetailPageClient params={params} />
    </Suspense>
  )
}
