'use client'

import { createContext, useContext, useEffect, useRef } from 'react'
import {
  createLDReactProvider,
  useLDClient,
  useStringVariation,
  useInitializationStatus,
  type LDContext,
} from '@launchdarkly/react-sdk'
import Observability from '@launchdarkly/observability'
import SessionReplay from '@launchdarkly/session-replay'
import { useAuth } from '@/features/auth/AuthContext'
import { buildLdContext } from '../utils/launchDarklyContext'
import { LaunchDarklyFlagProbe } from './LaunchDarklyFlagProbe'
import {
  CHECKOUT_EXPERIMENT_ENABLED,
  CHECKOUT_VARIANT_FLAG,
  CHECKOUT_VARIANTS,
  FORCED_CHECKOUT_VARIANT,
  type CheckoutVariant,
} from '../constants/checkoutVariant'

const clientSideId = process.env.NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_SIDE_ID

const bootstrapContext: LDContext = {
  kind: 'user',
  key: 'anonymous-bootstrap',
  anonymous: true,
}

const LDProvider = clientSideId
  ? createLDReactProvider(clientSideId, bootstrapContext, {
      // Docs recommend a short timeout so app does not sit in initializing on network issues.
      startOptions: {
        timeout: 3,
        ...({
          plugins: [
            new Observability({
              networkRecording: {
                enabled: true,
                recordHeadersAndBody: true,
              },
            }),
            new SessionReplay({
              privacySetting: 'strict',
            }),
          ],
        } as Record<string, unknown>),
      },
    })
  : null

export interface CheckoutVariantState {
  variant: CheckoutVariant
  isPremiumCheckout: boolean
  isBasicCheckout: boolean
  isReady: boolean
  isLaunchDarklyEnabled: boolean
  ldClient?: any
}

const DEFAULT_VARIANT = CHECKOUT_EXPERIMENT_ENABLED
  ? CHECKOUT_VARIANTS.BASIC
  : FORCED_CHECKOUT_VARIANT

const DEFAULT_STATE: CheckoutVariantState = {
  variant: DEFAULT_VARIANT,
  isPremiumCheckout: DEFAULT_VARIANT === CHECKOUT_VARIANTS.PREMIUM,
  isBasicCheckout: DEFAULT_VARIANT === CHECKOUT_VARIANTS.BASIC,
  isReady: true,
  isLaunchDarklyEnabled: false,
  ldClient: undefined,
}

const CheckoutVariantContext = createContext<CheckoutVariantState>(DEFAULT_STATE)

function normalizeVariant(value: string): CheckoutVariant {
  return value === CHECKOUT_VARIANTS.PREMIUM
    ? CHECKOUT_VARIANTS.PREMIUM
    : CHECKOUT_VARIANTS.BASIC
}

function LaunchDarklyIdentify() {
  const client = useLDClient()
  const { user, loading: authLoading } = useAuth()
  const identifiedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!client || authLoading) return

    const context = buildLdContext(user)
    const contextKey = context.key as string

    if (identifiedKeyRef.current === contextKey) return
    identifiedKeyRef.current = contextKey

    void client.identify(context)
  }, [client, user, authLoading])

  return null
}

function CheckoutVariantBridge({ children }: { children: React.ReactNode }) {
  const { loading: authLoading } = useAuth()
  const initStatus = useInitializationStatus()
  const rawVariant = useStringVariation(
    CHECKOUT_VARIANT_FLAG,
    CHECKOUT_VARIANTS.BASIC,
  )
  const ldClient = useLDClient()

  const variant = CHECKOUT_EXPERIMENT_ENABLED
    ? normalizeVariant(rawVariant)
    : FORCED_CHECKOUT_VARIANT
  const isReady =
    !CHECKOUT_EXPERIMENT_ENABLED ||
    (!authLoading &&
      (initStatus.status === 'complete' ||
        initStatus.status === 'failed' ||
        initStatus.status === 'timeout'))

  const value: CheckoutVariantState = {
    variant,
    isPremiumCheckout: variant === CHECKOUT_VARIANTS.PREMIUM,
    isBasicCheckout: variant === CHECKOUT_VARIANTS.BASIC,
    isReady,
    isLaunchDarklyEnabled: true,
    ldClient,
  }

  return (
    <CheckoutVariantContext.Provider value={value}>
      {children}
    </CheckoutVariantContext.Provider>
  )
}

export function LaunchDarklyProvider({ children }: { children: React.ReactNode }) {
  if (!LDProvider) {
    return (
      <CheckoutVariantContext.Provider value={DEFAULT_STATE}>
        {children}
      </CheckoutVariantContext.Provider>
    )
  }

  return (
    <LDProvider>
      <LaunchDarklyIdentify />
      <LaunchDarklyFlagProbe />
      <CheckoutVariantBridge>{children}</CheckoutVariantBridge>
    </LDProvider>
  )
}

export function useCheckoutVariant(): CheckoutVariantState {
  return useContext(CheckoutVariantContext)
}
