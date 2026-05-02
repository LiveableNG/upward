import { Suspense } from 'react'
import WaitlistClient from './WaitlistClient'
import FallbackSuspense from '@/components/FallbackSuspense'

export function generateStaticParams() {
  return [{ uuid: 'placeholder' }]
}

export default function WaitlistPage() {
  return (
    <Suspense fallback={<FallbackSuspense />}>
      <WaitlistClient />
    </Suspense>
  )
}
