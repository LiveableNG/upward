'use client'

import React, { Suspense, useState, useEffect } from 'react'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { SignupForm } from '@/features/auth/components/SignupForm'
import { SignupFormMobile } from '@/features/auth/components/SignupFormMobile'
import { AuthSkeleton } from '@/features/auth/components/AuthSkeleton'

export default function SignupPage() {
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
        <SignupFormMobile />
      </Suspense>
    )
  }

  return (
    <AuthLayout hideMobileLogo={true}>
      <Suspense fallback={<AuthSkeleton />}>
        <SignupForm />
      </Suspense>
    </AuthLayout>
  )
}
