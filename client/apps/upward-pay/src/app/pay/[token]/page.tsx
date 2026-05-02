import { Suspense } from 'react'
import PayClient from './PayClient'
import FallbackSuspense from '@/components/FallbackSuspense'

export function generateStaticParams() {
  return [{ token: 'placeholder' }]
}

export default function UnifiedPayPage() {
  return (
    <Suspense fallback={<FallbackSuspense />}>
      <PayClient />
    </Suspense>
  )
}