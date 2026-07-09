'use client'

import { useCallback } from 'react'
import { useLDClient } from '@launchdarkly/react-sdk'
import type { CheckoutVariant } from '../constants/checkoutVariant'
import { trackCheckoutExperimentEvent } from '../utils/checkoutExperimentTracking'

export function useCheckoutExperimentTracking() {
  const ldClient = useLDClient()

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
