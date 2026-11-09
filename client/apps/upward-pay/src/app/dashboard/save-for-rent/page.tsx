'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import { SaveForRentFlow } from '@/features/dashboard/components/SaveForRentFlow'
import { isSavingsWalletEnabled } from '@/features/dashboard/utils/savingsWallet'

export default function SaveForRentPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const savingsEnabled = isSavingsWalletEnabled(user)

  useEffect(() => {
    if (!loading && savingsEnabled) {
      router.replace('/dashboard/savings')
    }
  }, [loading, router, savingsEnabled])

  if (loading || savingsEnabled) return null

  return <SaveForRentFlow />
}
