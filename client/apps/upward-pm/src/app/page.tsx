'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Splash } from '@/components/common/Splash'
import { useAuth } from '@/features/auth/AuthContext'
import { Capacitor } from '@capacitor/core'

export default function RootPage() {
  const router = useRouter()
  const { isLoggedIn, loading } = useAuth()

  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      if (isLoggedIn) {
        router.replace('/dashboard')
      } else {
        if (Capacitor.isNativePlatform()) {
          router.replace('/welcome')
        } else {
          router.replace('/login')
        }
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [router, isLoggedIn, loading])

  return <Splash />
}
