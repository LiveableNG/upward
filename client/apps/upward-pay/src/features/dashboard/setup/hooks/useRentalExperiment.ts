'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { sessionTracker } from '@/lib/sessionTracker'
import { abExperimentClient } from '@/lib/abExperimentClient'
import {
  RENTAL_EXPERIMENT_KEY,
  RENTAL_EXPERIMENT_START_DATE,
  RENTAL_EXPERIMENT_VARIANTS,
  RENTAL_FALLBACK_VARIANT,
  type RentalExperimentVariant,
} from '../constants/rentalExperiment'

export interface RentalExperimentState {
  variant: RentalExperimentVariant
  isRequired: boolean
  isDeferrable: boolean
  isEligible: boolean
  isLoading: boolean
  isFallback: boolean
  trackExposure: (screenName?: string) => void
  trackDeferral: (source: string, metadata?: Record<string, any>) => void
  trackCompletion: (metadata?: Record<string, any>) => void
}

export function useRentalExperiment(): RentalExperimentState {
  const { user, loading: authLoading } = useAuth()

  const assignedLoggedRef = useRef<string | null>(null)
  const exposedLoggedRef = useRef<string | null>(null)

  const isEligible = useMemo(() => {
    if (!user?.uuid || !user.createdAt) return false

    const createdAtTime = new Date(user.createdAt).getTime()
    const experimentStartTime = new Date(RENTAL_EXPERIMENT_START_DATE).getTime()
    if (isNaN(createdAtTime) || createdAtTime < experimentStartTime) {
      return false
    }

    const hasExistingProperties = Array.isArray(user.properties) && user.properties.length > 0
    if (hasExistingProperties) {
      return false
    }

    return true
  }, [user?.uuid, user?.createdAt, user?.properties])

  const evaluation = useMemo(() => {
    if (authLoading || !user?.uuid) {
      return {
        variant: RENTAL_FALLBACK_VARIANT,
        isFallback: true,
        reason: 'LOADING',
      }
    }
    return abExperimentClient.evaluate(
      RENTAL_EXPERIMENT_KEY,
      user.uuid,
      user.email,
    )
  }, [authLoading, user?.uuid, user?.email])

  const isLoading = authLoading
  const isFallback = evaluation.isFallback

  const variant: RentalExperimentVariant =
    evaluation.variant === RENTAL_EXPERIMENT_VARIANTS.REQUIRED
      ? RENTAL_EXPERIMENT_VARIANTS.REQUIRED
      : RENTAL_FALLBACK_VARIANT

  const isRequired = isEligible && variant === RENTAL_EXPERIMENT_VARIANTS.REQUIRED
  const isDeferrable = !isRequired

  useEffect(() => {
    if (isLoading || !user?.uuid) return

    const sessionKey = `${user.uuid}_${variant}_${isFallback ? 'fallback' : 'enrolled'}`
    if (assignedLoggedRef.current === sessionKey) return

    assignedLoggedRef.current = sessionKey

    sessionTracker.trackEvent('EXPERIMENT_ASSIGNED', {
      experimentKey: RENTAL_EXPERIMENT_KEY,
      variant,
      isEligible,
      isFallback,
      userId: user.id,
      userUuid: user.uuid,
      accountCreatedAt: user.createdAt,
    })
  }, [isLoading, user?.uuid, user?.id, user?.createdAt, variant, isEligible, isFallback])

  const trackExposure = useCallback(
    (screenName: string = 'ProfileSetupBlocker') => {
      if (!user?.uuid) return

      const sessionKey = `${user.uuid}_${variant}_${screenName}`
      if (exposedLoggedRef.current === sessionKey) return
      exposedLoggedRef.current = sessionKey

      sessionTracker.trackEvent(
        'EXPERIMENT_EXPOSURE',
        {
          experimentKey: RENTAL_EXPERIMENT_KEY,
          variant,
          isEligible,
          isFallback,
          screenName,
          userId: user.id,
          userUuid: user.uuid,
        },
        screenName,
      )
    },
    [user?.uuid, user?.id, variant, isEligible, isFallback],
  )

  const trackDeferral = useCallback(
    (source: string, metadata?: Record<string, any>) => {
      sessionTracker.trackEvent('RENTAL_DETAILS_DEFERRED', {
        experimentKey: RENTAL_EXPERIMENT_KEY,
        variant,
        isEligible,
        isFallback,
        source,
        ...metadata,
      })
    },
    [variant, isEligible, isFallback],
  )

  const trackCompletion = useCallback(
    (metadata?: Record<string, any>) => {
      sessionTracker.trackEvent('RENTAL_DETAILS_COMPLETED', {
        experimentKey: RENTAL_EXPERIMENT_KEY,
        variant,
        isEligible,
        isFallback,
        ...metadata,
      })
    },
    [variant, isEligible, isFallback],
  )

  return {
    variant,
    isRequired,
    isDeferrable,
    isEligible,
    isLoading,
    isFallback,
    trackExposure,
    trackDeferral,
    trackCompletion,
  }
}
