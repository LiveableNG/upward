'use client'

import { createContext, useContext, useEffect, useRef } from 'react'
import {
  createLDReactProvider,
  useLDClient,
  useStringVariation,
  useInitializationStatus,
  type LDContext,
} from '@launchdarkly/react-sdk'
import { useAuth } from '@/features/auth/AuthContext'
import { buildLdContext } from '../utils/launchDarklyContext'
import { LaunchDarklyFlagProbe } from './LaunchDarklyFlagProbe'
import {
  CHECKOUT_VARIANT_FLAG,
  CHECKOUT_VARIANTS,
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
      },
    })
  : null

export interface CheckoutVariantState {
  variant: CheckoutVariant
  isPremiumCheckout: boolean
  isBasicCheckout: boolean
  isReady: boolean
  isLaunchDarklyEnabled: boolean
}

const DEFAULT_STATE: CheckoutVariantState = {
  variant: CHECKOUT_VARIANTS.BASIC,
  isPremiumCheckout: false,
  isBasicCheckout: true,
  isReady: true,
  isLaunchDarklyEnabled: false,
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

  const variant = normalizeVariant(rawVariant)
  const isReady =
    !authLoading &&
    (initStatus.status === 'complete' ||
      initStatus.status === 'failed' ||
      initStatus.status === 'timeout')

  const value: CheckoutVariantState = {
    variant,
    isPremiumCheckout: variant === CHECKOUT_VARIANTS.PREMIUM,
    isBasicCheckout: variant === CHECKOUT_VARIANTS.BASIC,
    isReady,
    isLaunchDarklyEnabled: true,
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
