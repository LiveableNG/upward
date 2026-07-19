'use client'

import React, { Suspense, useState, useEffect } from 'react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { LoginFormMobile } from '@/features/auth/components/LoginFormMobile'
import { AuthSkeleton } from '@/features/auth/components/AuthSkeleton'

export default function LoginPage() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (isMobile === null) {
    return <AuthSkeleton />
  }

  if (isMobile) {
    return (
      <Suspense fallback={<AuthSkeleton />}>
        <LoginFormMobile />
      </Suspense>
    )
  }

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
