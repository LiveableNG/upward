'use client'

import { useRouter } from 'next/navigation'
import { PayRentPage } from '@/components/dashboard/PayRentFlow'

export default function PayRentRoute() {
  const router = useRouter()

  return (
    <div style={{ height: '100dvh', background: 'var(--surface)' }}>
      <PayRentPage onBack={() => router.push('/dashboard')} />
    </div>
  )
}
