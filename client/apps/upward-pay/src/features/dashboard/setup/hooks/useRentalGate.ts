'use client'

import { useCallback, useRef } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { hasRentalInfo } from '../../utils/profileCompletion'
import { useRentalExperiment } from './useRentalExperiment'

export const RENTAL_GATE_TITLE = 'Rental details required'

export function rentalGateMessage(feature?: string): string {
  return feature
    ? `Add your rental details to unlock ${feature}.`
    : 'Add your rental details to unlock this feature.'
}

/**
 * True when the user is in the required-rental variant and has not yet
 * completed rental setup. Gated users may only access rental setup,
 * personal details and sign out.
 */
export function useRentalGate() {
  const { user } = useAuth()
  const { isRequired, isLoading } = useRentalExperiment()
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const isGated = !isLoading && isRequired && !hasRentalInfo(user)

  const notifyGated = useCallback((feature?: string) => {
    toastRef.current.info(rentalGateMessage(feature), RENTAL_GATE_TITLE)
  }, [])

  const guard = useCallback(
    (feature: string, action: () => void) => {
      if (isGated) {
        notifyGated(feature)
        return
      }
      action()
    },
    [isGated, notifyGated],
  )

  return { isGated, guard, notifyGated }
}
