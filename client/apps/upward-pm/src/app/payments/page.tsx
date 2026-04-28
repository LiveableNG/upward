import { Suspense } from 'react'
import { PaymentsView } from '@/features/pm/components/payments/PaymentsView'
import { Splash } from '@/components/common/Splash'

export default function PaymentsPage() {
  return (
    <Suspense fallback={<Splash />}>
      <PaymentsView />
    </Suspense>
  )
}
