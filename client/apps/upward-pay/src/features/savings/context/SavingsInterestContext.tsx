'use client'

import React, { createContext, useCallback, useContext, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { usePlatformRates } from '@/features/payments/hooks/usePlatformRates'
import { useSavingsInterestStatus } from '../hooks/useRentSavings'
import type { SavingsInterestStatusData } from '../services/savingsService'
import { SavingsInterestModal } from '../components/SavingsInterestModal'

interface SavingsInterestContextValue {
  isSavingsDisabled: boolean
  interestStatus: SavingsInterestStatusData | null
  hasReservedCashback: boolean
  reservedCashbackNgn: number
  openSavingsInterestModal: (source?: string) => void
  closeSavingsInterestModal: () => void
}

const SavingsInterestContext = createContext<SavingsInterestContextValue>({
  isSavingsDisabled: false,
  interestStatus: null,
  hasReservedCashback: false,
  reservedCashbackNgn: 0,
  openSavingsInterestModal: () => {},
  closeSavingsInterestModal: () => {},
})

export function SavingsInterestProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth()
  const { rates: platformRates } = usePlatformRates()
  const [isOpen, setIsOpen] = useState(false)
  const [source, setSource] = useState<string>('savings_cta')

  const isSavingsDisabled =
    platformRates.savingsMode === 'COMING_SOON' || platformRates.savingsEnabled === false

  const { data: interestStatus } = useSavingsInterestStatus(Boolean(isLoggedIn && isSavingsDisabled))

  const hasReservedCashback = Boolean(
    interestStatus?.has_indicated_interest &&
      (interestStatus.grant_status === 'RESERVED' || interestStatus.grant_status === 'CREDITED') &&
      interestStatus.allocated_amount_ngn > 0,
  )
  const reservedCashbackNgn = hasReservedCashback ? interestStatus?.allocated_amount_ngn || 0 : 0

  const openSavingsInterestModal = useCallback((clickSource?: string) => {
    setSource(clickSource || 'savings_cta')
    setIsOpen(true)
  }, [])

  const closeSavingsInterestModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <SavingsInterestContext.Provider
      value={{
        isSavingsDisabled,
        interestStatus: interestStatus ?? null,
        hasReservedCashback,
        reservedCashbackNgn,
        openSavingsInterestModal,
        closeSavingsInterestModal,
      }}
    >
      {children}
      <SavingsInterestModal
        isOpen={isOpen}
        source={source}
        onClose={closeSavingsInterestModal}
      />
    </SavingsInterestContext.Provider>
  )
}

export function useSavingsInterest() {
  return useContext(SavingsInterestContext)
}
