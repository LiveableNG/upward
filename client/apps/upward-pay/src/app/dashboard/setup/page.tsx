'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import { getSetupEntryPath } from '@/features/dashboard/utils/profileCompletion'

export default function SetupIndexPage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    router.replace(getSetupEntryPath(user))
  }, [router, user])

  return null
}
