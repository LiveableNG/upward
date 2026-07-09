import {
  CHECKOUT_VARIANT_FLAG,
  type CheckoutVariant,
} from '../constants/checkoutVariant'

export type CheckoutOption = 'standard' | 'premium'

export const CHECKOUT_EXPERIMENT_SCREEN = 'pay_token_checkout' as const

export const CHECKOUT_EXPERIMENT_EVENTS = {
  VIEWED: 'checkout_viewed',
  PAYMENT_STARTED: 'payment_started',
  PAYMENT_COMPLETED: 'payment_completed',
  PREMIUM_CLICK: 'handlePremiumClick',
} as const

type CheckoutExperimentClient = {
  track: (eventName: string, data?: Record<string, unknown>) => void
} | undefined

export function getCheckoutOption(isPremiumSelected: boolean): CheckoutOption {
  return isPremiumSelected ? 'premium' : 'standard'
}

export function buildCheckoutExperimentPayload(
  variant: CheckoutVariant,
  option: CheckoutOption,
) {
  return {
    option,
    screen: CHECKOUT_EXPERIMENT_SCREEN,
    flag: CHECKOUT_VARIANT_FLAG,
    variant,
  }
}

export function trackCheckoutExperimentEvent(
  ldClient: CheckoutExperimentClient,
  eventName: string,
  variant: CheckoutVariant,
  isPremiumSelected: boolean,
) {
  ldClient?.track(
    eventName,
    buildCheckoutExperimentPayload(variant, getCheckoutOption(isPremiumSelected)),
  )
}
