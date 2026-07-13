import { Suspense } from 'react'
import { PaymentDetailView } from '@/features/pm/components/payments/PaymentDetailView'
import { DetailSkeleton } from '@/components/skeletons'

export default function LandlordPaymentDetailsPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <div style={{ padding: '40px var(--dashboard-padding, 24px)', maxWidth: 1200, margin: '0 auto' }}>
        <PaymentDetailView />
      </div>
    </Suspense>
  )
}
