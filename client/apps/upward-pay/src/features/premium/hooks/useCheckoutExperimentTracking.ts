'use client'

import { useCallback } from 'react'
import { useCheckoutVariant } from '../components/LaunchDarklyProvider'
import type { CheckoutVariant } from '../constants/checkoutVariant'
import { trackCheckoutExperimentEvent } from '../utils/checkoutExperimentTracking'

export function useCheckoutExperimentTracking() {
  const { ldClient } = useCheckoutVariant()

  const track = useCallback(
    (
      eventName: string,
      variant: CheckoutVariant,
      isPremiumSelected: boolean,
    ) => {
      trackCheckoutExperimentEvent(
        ldClient,
        eventName,
        variant,
        isPremiumSelected,
      )
    },
    [ldClient],
  )

  return { track }
}
