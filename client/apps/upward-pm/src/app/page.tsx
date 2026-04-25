'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Splash } from '@/components/common/Splash'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/dashboard')
    }, 1500)
    return () => clearTimeout(timer)
  }, [router])

  return <Splash />
}
