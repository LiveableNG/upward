'use client'

import { useRouter } from 'next/navigation'
import { GoalSelectionScreen } from '@/features/goals'

export default function SetupGoalsPage() {
  const router = useRouter()

  return (
    <GoalSelectionScreen
      mode="onboarding"
      onComplete={() => router.push('/dashboard')}
      onSkip={() => router.push('/dashboard')}
      backPath="/dashboard/setup/rental"
    />
  )
}
