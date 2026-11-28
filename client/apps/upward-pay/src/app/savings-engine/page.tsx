import type { Metadata } from 'next'
import { SavingsFormulaEnginePage } from '@/features/savings/components/SavingsFormulaEnginePage'

export const metadata: Metadata = {
  title: 'Upward Savings Formula Engine — Interactive Calculator',
  description:
    'Explore Upward’s rent savings monthly deposit formula live: adjust rent, interest plan, active months, upfront deposit, and extra top-ups with a step-by-step breakdown.',
}

export default function SavingsEngineRoutePage() {
  return <SavingsFormulaEnginePage />
}
