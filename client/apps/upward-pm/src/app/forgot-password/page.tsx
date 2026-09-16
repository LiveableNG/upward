'use client'

import React, { Suspense } from 'react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import ForgotPasswordFlow from '@/features/auth/components/ForgotPasswordFlow'
import { AuthSkeleton } from '@/features/auth/components/AuthSkeleton'

export default function ForgotPasswordPage() {
  return (
    <AuthLayout 
      hideBackToWebsite={false}
      eyebrow="Account Recovery"
      visualTitle="Secure account access, whenever you need it."
      visualDesc="Reset your password quickly and securely to get back to managing your properties."
    >
      <Suspense fallback={<AuthSkeleton />}>
        <ForgotPasswordFlow />
      </Suspense>
    </AuthLayout>
  )
}
