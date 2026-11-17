import { Suspense } from 'react'
import { AllGoalsScreen } from '@/features/goals/components/AllGoalsScreen'

export const metadata = {
  title: 'Your goals — Upward',
  description: 'Track and achieve your lifestyle, health, career, and income goals.',
}

export default function DashboardGoalsPage() {
  return (
    <Suspense fallback={null}>
      <AllGoalsScreen />
    </Suspense>
  )
}
