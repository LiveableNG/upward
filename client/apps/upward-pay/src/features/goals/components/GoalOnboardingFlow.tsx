'use client'

import React from 'react'
import { useOnboardingGoals } from '../context/OnboardingGoalsContext'
import { UpwardGoalsInteractiveView } from './UpwardGoalsInteractiveView'
import '../styles/onboarding.css'

interface GoalOnboardingFlowProps {
  onComplete: () => void
  onSkip: () => void
  initialStep?: 'welcome' | 'selection' | 'review'
}

export function GoalOnboardingFlow({
  onComplete,
  onSkip,
}: GoalOnboardingFlowProps) {
  const { completeOnboarding, skipOnboarding } = useOnboardingGoals()

  const handleFinish = () => {
    completeOnboarding()
    onComplete()
  }

  const handleSkip = () => {
    skipOnboarding()
    onSkip()
  }

  return (
    <div className="goal-onboarding-shell" style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 48px' }}>
      <UpwardGoalsInteractiveView
        mode="onboarding"
        onFinishOnboarding={handleFinish}
        onSkipOnboarding={handleSkip}
      />
    </div>
  )
}
