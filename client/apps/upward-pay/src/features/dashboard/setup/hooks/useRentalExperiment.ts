'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useInitializationStatus, useStringVariation } from '@launchdarkly/react-sdk'
import { useAuth } from '@/features/auth/AuthContext'
import { sessionTracker } from '@/lib/sessionTracker'
import {
  RENTAL_EXPERIMENT_KEY,
  RENTAL_EXPERIMENT_START_DATE,
  RENTAL_EXPERIMENT_VARIANTS,
  RENTAL_FALLBACK_VARIANT,
  type RentalExperimentVariant,
} from '../constants/rentalExperiment'

export interface RentalExperimentState {
  variant: RentalExperimentVariant
  /** True if assigned to the required rental setup variation */
  isRequired: boolean
  /** True if assigned to the deferrable rental setup variation */
  isDeferrable: boolean
  /** Whether the user meets experiment eligibility criteria (new user after start date, no properties) */
  isEligible: boolean
  /** True while auth or LaunchDarkly is initializing */
  isLoading: boolean
  /** True if the variant was resolved via safe fallback rather than a confirmed LaunchDarkly evaluation */
  isFallback: boolean
  /** Explicit callback to record experiment exposure when the experience is rendered */
  trackExposure: (screenName?: string) => void
  /** Explicit callback to record rental setup deferral */
  trackDeferral: (source: string, metadata?: Record<string, any>) => void
  /** Explicit callback to record rental setup completion */
  trackCompletion: (metadata?: Record<string, any>) => void
}

/**
 * Hook to manage rental onboarding A/B experiment evaluation, eligibility,
 * and reliable telemetry tracking.
 */
export function useRentalExperiment(): RentalExperimentState {
  const { user, loading: authLoading } = useAuth()
  const initStatus = useInitializationStatus()

  // Pull raw flag string with safe deferrable fallback
  const rawVariant = useStringVariation(RENTAL_EXPERIMENT_KEY, RENTAL_FALLBACK_VARIANT)

  // Track event firing within the current browser session to prevent duplicates
  const assignedLoggedRef = useRef<string | null>(null)
  const exposedLoggedRef = useRef<string | null>(null)

  // Determine user lifecycle eligibility
  const isEligible = useMemo(() => {
    if (!user?.uuid || !user.createdAt) return false

    // Check account creation cutoff date
    const createdAtTime = new Date(user.createdAt).getTime()
    const experimentStartTime = new Date(RENTAL_EXPERIMENT_START_DATE).getTime()
    if (isNaN(createdAtTime) || createdAtTime < experimentStartTime) {
      return false
    }

    // Only new users who have not completed rental setup are eligible
    const hasExistingProperties = Array.isArray(user.properties) && user.properties.length > 0
    if (hasExistingProperties) {
      return false
    }

    return true
  }, [user?.uuid, user?.createdAt, user?.properties])

  // Evaluation readiness: flag is ready once auth is loaded and LD status is resolved
  const isLdInitializing = initStatus.status === 'initializing'
  const isLdReady = !authLoading && !isLdInitializing

  const isLoading = authLoading || isLdInitializing

  // Detect fallback condition: if unknown variant was returned, LD is still initializing, or LD had an error
  const isKnownVariant =
    rawVariant === RENTAL_EXPERIMENT_VARIANTS.REQUIRED ||
    rawVariant === RENTAL_EXPERIMENT_VARIANTS.DEFERRABLE

  const isFallback = !isKnownVariant || !isLdReady || Boolean((initStatus as any)?.error)

  // Normalize variant with strict deferrable fallback during loading or error
  const variant: RentalExperimentVariant =
    isLoading || isFallback
      ? RENTAL_FALLBACK_VARIANT
      : (rawVariant as RentalExperimentVariant)

  const isRequired = isEligible && variant === RENTAL_EXPERIMENT_VARIANTS.REQUIRED
  const isDeferrable = !isRequired

  // Automatic assignment telemetry once user eligibility and flag evaluation are stable
  useEffect(() => {
    if (isLoading || !user?.uuid) return

    const sessionKey = `${user.uuid}_${variant}_${isFallback ? 'fallback' : 'enrolled'}`
    if (assignedLoggedRef.current === sessionKey) return

    // Deduplicate per user session
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

  // Exposure trigger: call when the experiment experience is actually rendered
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
