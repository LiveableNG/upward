import { Suspense } from 'react'
import { PaymentsView } from '@/features/pm/components/payments/PaymentsView'
import { TableSkeleton } from '@/components/skeletons'

export default function PaymentsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <PaymentsView />
    </Suspense>
  )
}
