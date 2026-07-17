'use client'

import '@/styles/setup-page.css'
import { DepositFlow } from '@/features/dashboard/components/DepositFlow'
import { SavingsWalletGate } from '@/features/dashboard/components/SavingsWalletGate'

export default function DepositPage() {
  return (
    <SavingsWalletGate>
      <DepositFlow />
    </SavingsWalletGate>
  )
}
