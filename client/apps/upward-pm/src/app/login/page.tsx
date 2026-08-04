'use client'

import React, { Suspense } from 'react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { AuthSkeleton } from '@/features/auth/components/AuthSkeleton'

export default function LoginPage() {
  return (
    <AuthLayout hideBackToWebsite={false}>
      <Suspense fallback={<AuthSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  )
}
