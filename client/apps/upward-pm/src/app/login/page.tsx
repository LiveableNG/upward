'use client'

import React, { Suspense } from 'react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { AuthSkeleton } from '@/features/auth/components/AuthSkeleton'
import '@/styles/auth.css'

export default function LoginPage() {
  return (
    <AuthLayout 
      title="Welcome back"
      subtitle="Sign in to manage your property portfolio."
    >
      <Suspense fallback={<AuthSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  )
}
