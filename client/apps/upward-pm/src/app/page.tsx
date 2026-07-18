'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Splash } from '@/components/common/Splash'
import { useAuth } from '@/features/auth/AuthContext'

export default function RootPage() {
  const router = useRouter()
  const { isLoggedIn, loading } = useAuth()

  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      if (isLoggedIn) {
        router.replace('/dashboard')
      } else {
        router.replace('/pm-login')
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [router, isLoggedIn, loading])

  return <Splash />
}
