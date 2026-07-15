'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { FeaturesBottomSheet } from './FeaturesBottomSheet'
import { useDashboardFeatureSections } from '../hooks/useDashboardFeatureSections'

type FeaturesMenuContextValue = {
  openFeaturesMenu: () => void
  closeFeaturesMenu: () => void
  isFeaturesMenuOpen: boolean
  pendingCount: number
}

const FeaturesMenuContext = createContext<FeaturesMenuContextValue | null>(null)

export function FeaturesMenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const { sections, pendingCount } = useDashboardFeatureSections()

  const openFeaturesMenu = useCallback(() => setIsOpen(true), [])
  const closeFeaturesMenu = useCallback(() => setIsOpen(false), [])

  const value = useMemo(
    () => ({
      openFeaturesMenu,
      closeFeaturesMenu,
      isFeaturesMenuOpen: isOpen,
      pendingCount,
    }),
    [closeFeaturesMenu, isOpen, openFeaturesMenu, pendingCount],
  )

  return (
    <FeaturesMenuContext.Provider value={value}>
      {children}
      <FeaturesBottomSheet isOpen={isOpen} onClose={closeFeaturesMenu} sections={sections} />
    </FeaturesMenuContext.Provider>
  )
}

export function useFeaturesMenu() {
  const context = useContext(FeaturesMenuContext)
  if (!context) {
    throw new Error('useFeaturesMenu must be used within FeaturesMenuProvider')
  }
  return context
}
