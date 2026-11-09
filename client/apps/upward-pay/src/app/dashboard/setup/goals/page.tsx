'use client'

import { useRouter } from 'next/navigation'
import { GoalSelectionScreen } from '@/features/goals'
import { useAuth } from '@/features/auth/AuthContext'

export default function SetupGoalsPage() {
  const router = useRouter()
  const { user } = useAuth()

  const handleSkip = () => {
    if (typeof window !== 'undefined' && user?.uuid) {
      sessionStorage.setItem(`upward_profile_setup_skipped_${user.uuid}`, 'true')
      localStorage.removeItem(`upward_profile_setup_skipped_${user.uuid}`)
    }
    router.push('/dashboard')
  }

  return (
    <GoalSelectionScreen
      mode="onboarding"
      onComplete={() => router.push('/dashboard')}
      onSkip={handleSkip}
      backPath="/dashboard"
    />
  )
}
