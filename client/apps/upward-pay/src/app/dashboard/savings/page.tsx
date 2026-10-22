'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { RentSavingsMainView } from '@/features/savings'

export default function SavingsDashboardPage() {
  const router = useRouter()

  return (
    <PayPageShell
      title="Rent Savings & Lock"
      subtitle="Earn 14.5% p.a. compound yield toward your next rent payment"
      showBack
      onBack={() => router.push('/dashboard')}
    >
      <RentSavingsMainView />
    </PayPageShell>
  )
}
