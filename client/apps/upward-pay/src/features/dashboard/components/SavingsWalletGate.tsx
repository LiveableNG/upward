'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import { isSavingsWalletEnabled } from '@/features/dashboard/utils/savingsWallet'

export function SavingsWalletGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const enabled = isSavingsWalletEnabled(user)

  useEffect(() => {
    if (!loading && !enabled) {
      router.replace('/dashboard/save-for-rent')
    }
  }, [enabled, loading, router])

  if (loading || !enabled) return null

  return <>{children}</>
}
