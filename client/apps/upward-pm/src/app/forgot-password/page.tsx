'use client'

import React, { Suspense } from 'react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import ForgotPasswordFlow from '@/features/auth/components/ForgotPasswordFlow'
import { AuthSkeleton } from '@/features/auth/components/AuthSkeleton'

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<AuthSkeleton />}>
        <ForgotPasswordFlow />
      </Suspense>
    </AuthLayout>
  )
}
