import { Suspense } from 'react'
import { PaymentDetailView } from '@/features/pm/components/payments/PaymentDetailView'
import { Splash } from '@/components/common/Splash'

export default function LandlordPaymentDetailsPage() {
  return (
    <Suspense fallback={<Splash />}>
      <div style={{ padding: '40px var(--dashboard-padding, 24px)', maxWidth: 1200, margin: '0 auto' }}>
        <PaymentDetailView />
      </div>
    </Suspense>
  )
}
