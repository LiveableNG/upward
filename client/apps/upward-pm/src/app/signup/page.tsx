'use client'

import React, { Suspense } from 'react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { SignupForm } from '@/features/auth/components/SignupForm'
import { AuthSkeleton } from '@/features/auth/components/AuthSkeleton'

export default function SignupPage() {
  const [currentStep, setCurrentStep] = React.useState<number>(1)

  return (
    <AuthLayout 
      hideBackToWebsite={false}
      cardWidth="wide"
      eyebrow="Get started in minutes"
      visualTitle="Built for how modern property managers work."
      visualDesc="Automate rent collections, streamline tenant communications, and manage your portfolio with ease."
      stepRecap={{
        currentStep: currentStep,
        steps: ['Business details', 'About you', 'Secure your account']
      }}
    >
      <Suspense fallback={<AuthSkeleton />}>
        <SignupForm onStepChange={setCurrentStep} />
      </Suspense>
    </AuthLayout>
  )
}
