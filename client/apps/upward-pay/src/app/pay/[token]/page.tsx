import { Suspense } from 'react'
import PayClient from './PayClient'
import { PayCheckoutSkeleton } from '@/features/payments/components/unified-pay/PayCheckoutSkeleton'

export function generateStaticParams() {
  return [{ token: 'placeholder' }]
}

export default function UnifiedPayPage() {
  return (
    <Suspense fallback={<PayCheckoutSkeleton />}>
      <PayClient />
    </Suspense>
  )
}