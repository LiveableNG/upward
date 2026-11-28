import type { Metadata } from 'next'
import { DailySavingsEnginePage } from '@/features/savings/components/DailySavingsEnginePage'

export const metadata: Metadata = {
  title: 'Upward Daily Compounding Savings Engine — Interactive Calculator',
  description:
    'Interactive exact-calendar daily compounding rent savings engine with exact-date top-ups and dynamic late/missed deposit catch-up.',
}

export default function DailySavingsEngineRoutePage() {
  return <DailySavingsEnginePage />
}
