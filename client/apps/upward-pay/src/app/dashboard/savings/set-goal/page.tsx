'use client'

import { SavingsGoalFlow } from '@/features/dashboard/components/SavingsGoalFlow'
import { SavingsWalletGate } from '@/features/dashboard/components/SavingsWalletGate'

export default function SetSavingsGoalPage() {
  return (
    <SavingsWalletGate>
      <SavingsGoalFlow />
    </SavingsWalletGate>
  )
}
