'use client'

import React, { Suspense } from 'react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { SignupForm } from '@/features/auth/components/SignupForm'
import { AuthSkeleton } from '@/features/auth/components/AuthSkeleton'

export default function SignupPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<AuthSkeleton />}>
        <SignupForm />
      </Suspense>
    </AuthLayout>
  )
}
