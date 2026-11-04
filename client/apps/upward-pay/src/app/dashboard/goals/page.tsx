'use client'

import { useRouter } from 'next/navigation'
import { GoalSelectionScreen } from '@/features/goals'

export default function DashboardGoalsPage() {
  const router = useRouter()

  return (
    <GoalSelectionScreen
      mode="edit"
      onComplete={() => router.push('/dashboard')}
      onSkip={() => router.push('/dashboard')}
      backPath="/dashboard/me"
    />
  )
}
