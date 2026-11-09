'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'
import { RentSavingsMainView } from '@/features/savings'

export default function SavingsDashboardPage() {
  const router = useRouter()

  return (
    <PayPageShell
      title="Rent Savings"
      subtitle="Powered by Asset & Resource Management Holding Company (ARM)"
      showBack
      onBack={() => router.push('/dashboard')}
    >
      <RentSavingsMainView />
    </PayPageShell>
  )
}
