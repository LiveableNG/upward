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
      subtitle="Save towards your next rent and earn 14.5% returns every year"
      showBack
      onBack={() => router.push('/dashboard')}
    >
      <RentSavingsMainView />
    </PayPageShell>
  )
}
