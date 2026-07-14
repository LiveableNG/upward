import { Suspense } from 'react'
import { PaymentsView } from '@/features/pm/components/payments/PaymentsView'
import { TableSkeleton } from '@/components/skeletons'
import { cookies } from 'next/headers'

async function getPaymentsData() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('pm_access_token')?.value || cookieStore.get('access_token')?.value
    
    if (!token) return undefined;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
    const res = await fetch(`${apiUrl}/pm/payment-requests`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 60 }
    })
    
    if (!res.ok) return undefined
    return res.json()
  } catch (error) {
    console.error("Failed to fetch payments data:", error)
    return undefined
  }
}

export default async function PaymentsPage() {
  const initialPaymentRequests = await getPaymentsData()

  return (
    <Suspense fallback={<TableSkeleton />}>
      <PaymentsView initialPaymentRequests={initialPaymentRequests} />
    </Suspense>
  )
}
