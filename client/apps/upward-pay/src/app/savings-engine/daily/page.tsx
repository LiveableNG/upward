import type { Metadata } from 'next'
import { DailySavingsEnginePage } from '@/features/savings/components/DailySavingsEnginePage'

export const metadata: Metadata = {
  title: 'Upward Daily Compounding Savings Engine — Live Comparison',
  description:
    'Interactive exact-calendar daily compounding rent savings engine with dynamic missed/delayed deposit catch-up and side-by-side comparison against the monthly model.',
}

export default function DailySavingsEngineRoutePage() {
  return <DailySavingsEnginePage />
}
