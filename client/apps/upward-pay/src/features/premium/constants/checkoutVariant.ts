export const CHECKOUT_VARIANT_FLAG = 'checkout-experience'

export const CHECKOUT_VARIANTS = {
  BASIC: 'basic-checkout',
  PREMIUM: 'premium-checkout',
} as const

export type CheckoutVariant = (typeof CHECKOUT_VARIANTS)[keyof typeof CHECKOUT_VARIANTS]

/** When false, all users get premium checkout (pay rent / pay rent + benefits). */
export const CHECKOUT_EXPERIMENT_ENABLED = false

export const FORCED_CHECKOUT_VARIANT: CheckoutVariant = CHECKOUT_VARIANTS.PREMIUM
