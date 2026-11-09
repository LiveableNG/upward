'use client'

import React, { createContext, useContext, useMemo } from 'react'
import {
  CHECKOUT_VARIANTS,
  type CheckoutVariant,
} from '../constants/checkoutVariant'

export interface CheckoutVariantState {
  variant: CheckoutVariant
  isPremiumCheckout: boolean
  isBasicCheckout: boolean
  isReady: boolean
  isLaunchDarklyEnabled: boolean
  ldClient?: {
    track: (eventName: string, data?: Record<string, unknown>) => void
    identify?: (context: unknown) => Promise<void>
  }
}

const mockLdClient = {
  track: (eventName: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Experiment Track]', eventName, data)
    }
  },
  identify: async () => {},
}

const DEFAULT_STATE: CheckoutVariantState = {
  variant: CHECKOUT_VARIANTS.BASIC,
  isPremiumCheckout: false,
  isBasicCheckout: true,
  isReady: true,
  isLaunchDarklyEnabled: false,
  ldClient: mockLdClient,
}

const CheckoutVariantContext = createContext<CheckoutVariantState>(DEFAULT_STATE)

export function LaunchDarklyProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<CheckoutVariantState>(() => {
    let variant: CheckoutVariant = CHECKOUT_VARIANTS.BASIC

    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search)
        const qv = params.get('checkoutVariant')
        if (qv === 'premium' || qv === CHECKOUT_VARIANTS.PREMIUM) {
          variant = CHECKOUT_VARIANTS.PREMIUM
        } else if (
          process.env.NEXT_PUBLIC_CHECKOUT_EXPERIENCE === 'premium-checkout' ||
          process.env.NEXT_PUBLIC_CHECKOUT_VARIANT === 'premium-checkout'
        ) {
          variant = CHECKOUT_VARIANTS.PREMIUM
        }
      } catch {}
    }

    return {
      variant,
      isPremiumCheckout: variant === CHECKOUT_VARIANTS.PREMIUM,
      isBasicCheckout: variant === CHECKOUT_VARIANTS.BASIC,
      isReady: true,
      isLaunchDarklyEnabled: false,
      ldClient: mockLdClient,
    }
  }, [])

  return (
    <CheckoutVariantContext.Provider value={value}>
      {children}
    </CheckoutVariantContext.Provider>
  )
}

export function useCheckoutVariant(): CheckoutVariantState {
  return useContext(CheckoutVariantContext)
}
