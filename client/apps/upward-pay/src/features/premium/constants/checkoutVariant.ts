export const CHECKOUT_VARIANT_FLAG = 'checkout-experience'

export const CHECKOUT_VARIANTS = {
  BASIC: 'basic-checkout',
  PREMIUM: 'premium-checkout',
} as const

export type CheckoutVariant = (typeof CHECKOUT_VARIANTS)[keyof typeof CHECKOUT_VARIANTS]
